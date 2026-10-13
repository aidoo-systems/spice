# SPICE Build Instructions

This repo is a small monorepo with a FastAPI backend and a Next.js frontend.

## Project layout

```
apps/
  api/          FastAPI backend (Python)
  web/          Next.js frontend (TypeScript + Tailwind)
packages/
  shared/       Shared Pydantic + TypeScript types
```

## Web (Next.js)

Local dev:

```bash
cd apps/web
npm install
npm run dev
```

Production build:

```bash
cd apps/web
npm run build
npm run start
```

The dev server runs on port `3737` by default (see `apps/web/package.json`).

Environment (web):

- `NEXT_PUBLIC_SITE_URL` (base URL for metadata, sitemap, robots)
- `API_URL` (where the `/api/*` proxy forwards; default `http://localhost:5000`)

Tests:

```bash
cd apps/web
npm run typecheck && npm test        # unit tests (vitest)
npx playwright install chromium
npm run test:e2e                      # E2E (API mocked)
```

## API (FastAPI)

Local dev:

```bash
make install-api
make api        # from the repo root; sets PYTHONPATH for packages/shared
```

The API runs on port `5000` by default.

## Docker Compose

From the repo root:

```bash
docker compose up --build
```

With OpenAI enabled:

```bash
echo "OPENAI_API_KEY=sk-your-key" > .env
docker compose up --build
```

Service URLs:

- API: `http://localhost:5000`
- Web: `http://localhost:3737`

## Tests (API)

```bash
cd apps/api
PYTHONPATH="../../packages:." python -m pytest tests/ -v
```

## Evals (real model)

```bash
cd apps/api
OPENAI_API_KEY=... PYTHONPATH="../../packages:." python -m evals.run
```

## Environment variables (common)

The full table is in `README.md`. The ones that matter most in production:

- `OPENAI_API_KEY`, `OPENAI_MODEL` (optional `OPENAI_BASE_URL`)
- `DAILY_LLM_CAP`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`
- `TRUSTED_PROXY_HOPS` or `CLIENT_IP_HEADER` (must match your reverse proxy)
- `CORS_ORIGINS`, `DB_PATH`, `LOG_LEVEL`

## Notes

- The web app uses Tailwind v4 via `apps/web/app/globals.css`.
- Next.js telemetry is enabled by default in builds. You can opt out via:

```bash
npx next telemetry disable
```

## Production checklist (VPS)

- Set `NEXT_PUBLIC_SITE_URL=https://spice.aidoo.biz` in the VPS environment.
- Confirm how the edge proxy forwards the client IP and set `TRUSTED_PROXY_HOPS` / `CLIENT_IP_HEADER` to match (see README "Behind a reverse proxy").
- Make sure the edge proxy doesn't buffer `/api/v1/*/stream` responses.
- Ensure Docker Compose picks up that env value before `docker compose up --build`.
- After deploy, verify:
  - `https://spice.aidoo.biz/robots.txt`
  - `https://spice.aidoo.biz/sitemap.xml`
  - `https://spice.aidoo.biz` loads
