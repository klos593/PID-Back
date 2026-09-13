-- Auth foundation: users (with role chosen at signup) and server-side sessions.
-- Run manually for now: psql "$DATABASE_URL" -f migrations/001_auth.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Los valores del rol van en español porque son el contrato con el frontend:
-- es lo que manda el formulario de registro y lo que la UI compara (ver
-- PID-Front/CLAUDE.md). Una base que ya existe se migra con 003.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('docente', 'alumno');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions are stored server-side; the cookie only carries this row's id.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
