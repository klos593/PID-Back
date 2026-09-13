-- Pasa los valores de user_role a español ('teacher' -> 'docente',
-- 'student' -> 'alumno'). Los valores del rol son el contrato con el
-- frontend: es lo que manda el formulario de registro y lo que la UI
-- compara, así que la base tiene que hablar el mismo idioma (ver
-- PID-Front/CLAUDE.md). Antes de esto, registrarse fallaba con
-- "Rol inválido" contra el backend real.
--
-- Se renombran las etiquetas del enum en lugar de agregar valores nuevos y
-- hacer UPDATE: renombrar no toca ninguna fila (las filas guardan la etiqueta
-- por referencia), así que no hace falta reescribir la tabla ni preocuparse
-- por el orden de los valores, que en Postgres no se puede reordenar.
--
-- Correr a mano: psql "$DATABASE_URL" -f migrations/003_roles_es.sql
-- Es idempotente: si ya se corrió, no hace nada.

DO $$ BEGIN
  ALTER TYPE user_role RENAME VALUE 'teacher' TO 'docente';
EXCEPTION
  -- Ya renombrado (o la base se creó de cero con 001 ya en español).
  WHEN invalid_parameter_value THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role RENAME VALUE 'student' TO 'alumno';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;
