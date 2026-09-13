import { getPool } from './pool.js';

// La base guarda TIME ('13:00:00') y el front habla 'HH:MM'. Se recorta acá y
// no en la ruta para que ningún endpoint tenga que acordarse.
const TIME_FORMAT = `to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS "end"`;

/**
 * Toda la disponibilidad de un docente, agrupada por materia:
 *   { [subjectId]: { lunes: [{ start, end }], ... } }
 *
 * Es un solo pedido con TODAS las materias a propósito: la pantalla del
 * scheduler necesita las otras para pintar los horarios que ya están ocupados
 * (nadie da dos materias a la vez), y pedirlas de a una sería un N+1.
 */
export async function findAvailabilityByTeacher(teacherId) {
  const result = await getPool().query(
    `SELECT subject_id, day_key, ${TIME_FORMAT}
     FROM availability
     WHERE teacher_id = $1
     ORDER BY subject_id, day_key, start_time`,
    [teacherId]
  );

  const bySubject = {};
  for (const row of result.rows) {
    const subject = (bySubject[row.subject_id] ??= {});
    (subject[row.day_key] ??= []).push({ start: row.start, end: row.end });
  }
  return bySubject;
}

/**
 * Reemplaza la plantilla semanal de UNA materia de un docente. Es un
 * reemplazo completo y no un diff: la pantalla manda siempre la semana
 * entera, y así borrar un día es simplemente no mandarlo.
 *
 * En una transacción para que no quede una plantilla a medio guardar: si
 * falla un rango, la anterior sigue intacta.
 *
 * Ojo: esto NO toca las clases ya reservadas. Si el docente saca una hora que
 * alguien ya tenía tomada, esa clase sigue en pie — solo deja de ofrecerse
 * para el futuro.
 */
export async function replaceSubjectAvailability(teacherId, subjectId, schedule) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    await client.query(`DELETE FROM availability WHERE teacher_id = $1 AND subject_id = $2`, [
      teacherId,
      subjectId,
    ]);

    const dayKeys = [];
    const starts = [];
    const ends = [];
    for (const [dayKey, ranges] of Object.entries(schedule)) {
      for (const range of ranges) {
        dayKeys.push(dayKey);
        starts.push(range.start);
        ends.push(range.end);
      }
    }

    if (dayKeys.length > 0) {
      // unnest en vez de un INSERT por rango: una sola ida a la base.
      await client.query(
        `INSERT INTO availability (teacher_id, subject_id, day_key, start_time, end_time)
         SELECT $1, $2, day_key::week_day, start_time::time, end_time::time
         FROM unnest($3::text[], $4::text[], $5::text[])
           AS t(day_key, start_time, end_time)`,
        [teacherId, subjectId, dayKeys, starts, ends]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
