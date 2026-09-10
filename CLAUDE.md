# PID — Backend (PID-Back)

Shared context for Claude Code across the team. This file lives at the root of **PID-Back**. Sibling files exist in **PID-Front** and **PID-Infra** — see "Related repos" at the bottom.

## Project context
- University group web app project (React frontend + Fastify backend + Postgres), fully Dockerized.
- Professor's constraint: no managed/PaaS platforms — the app must run via Docker and be continuously deployed so it can be reviewed at any time.
- Three repos, cloned side by side inside a parent `Proyecto/` folder: `PID-Front`, `PID-Back` (this one), `PID-Infra`.
- Team works across Apple Silicon Macs (M1/M2) and at least one Windows desktop — keep cross-platform tooling in mind (line endings, shell scripts, etc.).

## App concept
A web app (responsive — must work well on phone too) that connects students and teachers.
- **Single account type**: role (`teacher` or `student`) is chosen at signup, not separate signup flows.
- **Teachers**: pick which subjects they teach from a fixed list of available subjects, and set their availability — specific dates and start times. Classes are always **1 hour long**, and can only start on the hour or half-hour (`:00` or `:30`).
- **Students**: search/browse teachers, view their profile and subjects, see which teachers are available and their open class slots.
- **Booking**: a student picking a slot **reserves it** — it disappears from availability for other students once booked.
- **Payments/pricing**: out of scope for this version.

### Backend implications
- Likely core entities: `users` (with a `role` field: teacher/student), a fixed/seeded `subjects` catalog, a `teacher_subjects` join table, `class_slots` (teacher_id, subject_id, date, start_time restricted to `:00`/`:30`, fixed 1h duration, status available/booked), and `bookings` (student_id, slot_id).
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

## Lessons learned / gotchas
- Watch out for `package-lock.json` getting accidentally committed to the wrong repo (this has happened, including landing in `PID-Infra`) — check `pwd` before running `npm install`.
- `.gitattributes` is in place in all three repos to normalize line endings across Mac/Windows contributors — don't remove it.
- Keep Postgres off any public port in production compose files — it should only ever be reachable from the backend container.

## Related repos
- **PID-Front** — Vite/React app, dev port `5173`. Also holds the blue light/dark color palette reference. See its `CLAUDE.md`.
- **PID-Infra** — Docker Compose, CI/CD, reverse proxy, VPS provisioning. See its `CLAUDE.md`.
