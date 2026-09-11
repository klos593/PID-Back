import { getPool } from './pool.js';

const PROFILE_COLUMNS = 'id, email, role, nombre, apellido, telefono, created_at';

// For teachers, subjectIds links the new user to the subjects catalog in
// the same transaction as the insert, so a partial failure never leaves a
// teacher with no subjects or a dangling subject reference.
export async function createUser({
  email,
  passwordHash,
  role,
  nombre,
  apellido,
  telefono,
  subjectIds = [],
}) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, nombre, apellido, telefono)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${PROFILE_COLUMNS}`,
      [email, passwordHash, role, nombre, apellido, telefono ?? null]
    );
    const user = result.rows[0];

    if (role === 'teacher' && subjectIds.length > 0) {
      await client.query(
        `INSERT INTO teacher_subjects (teacher_id, subject_id)
         SELECT $1, subject_id
         FROM unnest($2::uuid[]) AS subject_id`,
        [user.id, subjectIds]
      );
    }

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findUserByEmail(email) {
  const result = await getPool().query(
    `SELECT id, email, password_hash, role, nombre, apellido, telefono, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id) {
  const result = await getPool().query(
    `SELECT ${PROFILE_COLUMNS}
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function emailExists(email) {
  const result = await getPool().query(`SELECT 1 FROM users WHERE email = $1`, [email]);
  return result.rowCount > 0;
}
