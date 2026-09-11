import pg from 'pg';

const { Pool } = pg;

let pool;

// Lazily created so tests can import modules that touch this file without
// requiring a live DATABASE_URL until a query actually runs.
export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
