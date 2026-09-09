# PID — Backend (PID-Back)

Shared context for Claude Code across the team. This file lives at the root of **PID-Back**. Sibling files exist in **PID-Front** and **PID-Infra** — see "Related repos" at the bottom.

## Project context
- University group web app project (React frontend + Fastify backend + Postgres), fully Dockerized.
- Professor's constraint: no managed/PaaS platforms — the app must run via Docker and be continuously deployed so it can be reviewed at any time.
- Three repos, cloned side by side inside a parent `Proyecto/` folder: `PID-Front`, `PID-Back` (this one), `PID-Infra`.
- Team works across Apple Silicon Macs (M1/M2) and at least one Windows desktop — keep cross-platform tooling in mind (line endings, shell scripts, etc.).

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
