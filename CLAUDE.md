# PID — Backend (PID-Back)

Shared context for Claude Code across the team. This file lives at the root of **PID-Back**. Sibling files exist in **PID-Front** and **PID-Infra** — see "Related repos" at the bottom.

## Project context
- University group web app project (React frontend + Fastify backend + Postgres), fully Dockerized.
- Professor's constraint: no managed/PaaS platforms — the app must run via Docker and be continuously deployed so it can be reviewed at any time.
- Three repos, cloned side by side inside a parent `Proyecto/` folder: `PID-Front`, `PID-Back` (this one), `PID-Infra`.
- Team works across Apple Silicon Macs (M1/M2) and at least one Windows desktop — keep cross-platform tooling in mind (line endings, shell scripts, etc.).
- **The app is in Spanish.** The team and its users are Argentinian. This matters here because **the frontend shows our error `message` strings to the user verbatim** — so every `message` in a reply must be rioplatense Spanish (voseo: "Elegí", "tenés"), e.g. `'Credenciales inválidas'`, `'Ya existe una cuenta con ese email'`. There is no i18n layer on either side. The `error` code and the `fields` keys stay English/ASCII — those are read by the frontend, not shown to the user.

## App concept
A web app (responsive — must work well on phone too) that connects students and teachers.
- **Single account type**: role is chosen at signup, not separate signup flows. On the wire and in the DB the role is Spanish: **`"docente"` or `"alumno"`** — that's what the register form sends, what the frontend switches on, and what the `user_role` enum stores. Don't accept or return `teacher`/`student` (the API used to, and signup failed with "Rol inválido" until migration `003_roles_es.sql` aligned it).
- **Teachers**: pick which subjects they teach from a fixed list of available subjects, and set their availability — specific dates and start times. Classes are always **1 hour long**, and can only start on the hour or half-hour (`:00` or `:30`).
- **Students**: search/browse teachers, view their profile and subjects, see which teachers are available and their open class slots.
- **Booking**: a student picking a slot **reserves it** — it disappears from availability for other students once booked.
- **Payments/pricing**: out of scope for this version.

### Backend implications
- Likely core entities: `users` (with a `role` field: `docente`/`alumno`), a fixed/seeded `subjects` catalog, a `teacher_subjects` join table, `class_slots` (teacher_id, subject_id, date, start_time restricted to `:00`/`:30`, fixed 1h duration, status available/booked), and `bookings` (student_id, slot_id).
- Booking a slot needs to be handled atomically (e.g. a DB transaction / unique constraint on the slot) to avoid two students booking the same slot in a race condition.
- Search/browse endpoint should support filtering by subject, and probably by date/time and teacher.
- No payment logic needed for this version — don't add a payments table/flow unless asked.

## Tech stack (this repo)
- **Fastify** (chosen over Express).
- `"type": "module"` is set in `package.json` — use ESM `import`/`export` syntax, not CommonJS `require`.
- **Postgres 16** as the database.
- Dev URL: `http://127.0.0.1:4000`.
- Postgres is reachable locally at `127.0.0.1:5432`. In **production it is not exposed to the internet** — only reachable from other containers on the compose network.
- Local dev uses volume mounts so code changes hot-reload without rebuilding the Docker image.

## Backend conventions (for whoever touches this repo)
- **Style**: semicolons, single quotes, 2-space indent, ~100 columns. Note this differs from `PID-Front` on purpose (that repo has no semicolons) — match the repo you're in, and don't run a formatter across a file, since neither repo has a prettier config.
- **Comments in Spanish**, same as `PID-Front`, and they explain **why**, not what. The codebase was originally written with English comments and converted; if you see an English one it's a leftover, so replace it rather than matching it.
- **Layout**: `src/routes/<area>/index.js` for a route plugin registered under a prefix in `app.js`, `src/db/` for query functions (routes never write SQL inline), `src/plugins/` for Fastify plugins, `src/lib/` for pure helpers with no Fastify dependency.
- **Tests** are colocated (`index.js` → alongside it as `<area>.test.js`) and use `buildApp()` + `app.inject()` — no real port, no running server. Follow the pattern in `src/app.test.js`.
- **User-facing `message` strings are Spanish** — see the Spanish bullet under "Project context". The `error` code and `fields` keys stay English.

## Migrations
- Plain `.sql` files in `migrations/`, applied **by hand, in filename order** — there's no runner, nothing in compose mounts them, and no table tracks what ran: `psql "$DATABASE_URL" -f migrations/003_roles_es.sql`. Write every migration so re-running it is harmless (`IF NOT EXISTS`, or a `DO $$ ... EXCEPTION WHEN ... THEN NULL`), since nothing stops you from applying one twice.
- After pulling a branch that adds a migration, run it against your dev DB or the backend will fail against a schema it doesn't expect. Note table and column names stay **English** (`teacher_subjects`, `teacher_id`) — only user-facing *values* like the role are Spanish.

## Lessons learned / gotchas
- Watch out for `package-lock.json` getting accidentally committed to the wrong repo (this has happened, including landing in `PID-Infra`) — check `pwd` before running `npm install`.
- `.gitattributes` is in place in all three repos to normalize line endings across Mac/Windows contributors — don't remove it.
- Keep Postgres off any public port in production compose files — it should only ever be reachable from the backend container.

## Related repos
- **PID-Front** — Vite/React app, dev port `5173`. Also holds the blue light/dark color palette reference. See its `CLAUDE.md`.
- **PID-Infra** — Docker Compose, CI/CD, reverse proxy, VPS provisioning. See its `CLAUDE.md`.
