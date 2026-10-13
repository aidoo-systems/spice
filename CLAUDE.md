# SPICE

Ingredient-to-meal-plan app and ai.doo's AI showcase. Enter what you have and get a timed, step-by-step plan that streams in live, has been checked by the server, and can be changed with follow-up questions.

**Version:** v0.9.0 (keep `apps/api/spice/main.py`, `apps/web/package.json`, `apps/web/lib/changelog.ts` and `CHANGELOG.md` in step)

## Working rules

1. Read `docs/CURRENT_SPRINT.md`, then `docs/DECISIONS.md`, before non-trivial work.
2. **The cook wins.** SPICE is for the home cook and for people evaluating ai.doo; when they conflict, the cook wins (D-001).
3. Run the gates before and after real work. A roadmap item reaches `Complete` only with its acceptance evidence recorded: the command and its output.
4. Owner gates are never simulated. Whether a dish is worth cooking and whether a screen looks right are the owner's to judge.
5. **A push to `master` deploys to spice.aidoo.biz.** Work on a branch and land through a pull request.
6. Not building: accounts or server-side user data; Hub auth or a dependency on the suite's Ollama (D-002).

## Gates

```bash
bash scripts/gates.sh              # everything; about two minutes
SKIP_SLOW=1 bash scripts/gates.sh  # skips e2e and audit, for the inner loop; never to land
bash scripts/gates.sh tests        # one gate
```

Gates, in order: `lint`, `format`, `tests` (API); `types`, `unit`, `build`, `e2e` (web); `audit` (both); `docs`. One-time setup:

```bash
python -m venv apps/api/.venv
apps/api/.venv/Scripts/python -m pip install -r apps/api/requirements-dev.txt   # bin/python off Windows
cd apps/web && npm ci && npx playwright install chromium
```

The evals are not a gate (D-006): they call the real model. CI runs them.

## Build & Run

```bash
docker compose up -d --build
```

Native dev:

```bash
# API (port 5000)
cd apps/api && python3 -m pip install -r requirements-dev.txt
PYTHONPATH="../../packages:." python3 -m uvicorn spice.main:app --reload --port 5000

# Web (port 3737, proxies /api/* to API_URL, default http://localhost:5000)
cd apps/web && npm install && npm run dev
```

Without `OPENAI_API_KEY` the API runs in **demo mode**: canned plans replayed as a stream, labelled in the UI.

## Test

```bash
# API tests (includes eval-harness unit tests)
cd apps/api && PYTHONPATH="../../packages:." python3 -m pytest --tb=short

# Web: typecheck + unit tests (vitest, lib/**/*.test.ts)
cd apps/web && npm run typecheck && npm test

# E2E (Playwright; API is mocked at the network layer, no backend needed)
cd apps/web && npx playwright install chromium && npm run test:e2e

# Evals against the real model (needs OPENAI_API_KEY; costs a few cents)
cd apps/api && PYTHONPATH="../../packages:." python3 -m evals.run
```

## Lint

```bash
cd apps/api && python3 -m ruff check . && python3 -m ruff format --check .
```

Ruff is pinned in `apps/api/requirements-dev.txt`; its default rule set includes RUF/PLR checks.

## Project Structure

```
spice/
├── apps/
│   ├── api/                  # FastAPI backend
│   │   ├── spice/
│   │   │   ├── routes.py     # /v1/suggest(+/stream), /v1/followup(+/stream), /v1/feedback, /v1/cooked
│   │   │   ├── engine.py     # generation pipeline: cache, budget, prompt, stream, finalize
│   │   │   ├── llm.py        # OpenAI-compatible client, strict JSON schema (RecipeDraft)
│   │   │   ├── checks.py     # sanitize + grounding/timeline/diet checks → meta.checks
│   │   │   ├── partial_json.py  # parse half-written JSON for streaming snapshots
│   │   │   ├── mocks.py      # demo-mode plans
│   │   │   ├── prompts/      # system.md, suggest.md, followup.md
│   │   │   ├── rate_limit.py # per-IP limiters + client IP resolution
│   │   │   └── db.py         # SQLite: combos, feedback, generation cache, daily usage
│   │   ├── evals/            # cases.json, scoring.py, run.py
│   │   └── tests/
│   └── web/                  # Next.js frontend
│       ├── app/page.tsx      # state + view switching (home ↔ plan, pushState for back)
│       ├── app/components/   # HomeView, PrefsSheet, PlanView, Timeline, CookMode (full screen), ShareCard (poster), Mark, …
│       ├── app/fonts/        # Bricolage Grotesque (OFL)
│       ├── app/api/[...path]/route.ts  # streaming proxy to the API
│       ├── lib/              # api.ts (SSE client), sse.ts, plan.ts, timeline.ts, form.ts, sample.ts, types.ts, …
│       └── tests/            # Playwright specs
├── packages/shared/          # schemas.py (Pydantic) mirrored by types.ts
├── docker-compose.yml
└── CHANGELOG.md              # hand-maintained
```

## Architecture Notes

- **Streaming:** the web app POSTs to `/v1/*/stream` and reads SSE events: `partial` (best-effort snapshot), then `final` (validated plan) or `error` (`{status, message}`). Pre-stream failures (422/429/503) are plain HTTP errors. The Next proxy must pass bodies through as streams.
- **Structured output:** `llm.RecipeDraft` is converted by `strict_schema()` into a strict `json_schema` response format. Field order = streaming order. Change the draft model and the shared `SuggestResponse` together.
- **Checks:** `checks.sanitize_and_check()` runs on every plan (live, cached, demo) and fills `meta.checks` / `meta.grounding`; the UI shows them. Diet-breaking upgrades are removed, not just flagged.
- **Cache:** keyed on every input including `variation` and `avoid_titles` (so Regenerate is never a replay), TTL `GENERATION_CACHE_TTL_DAYS`. Community stats and meta are never cached.
- **Community numbers:** `cooked_count` only moves via `POST /v1/cooked`. `hit_count` is internal request analytics and must not be shown as "people cooked this".
- **Shared types:** Pydantic models in `packages/shared/schemas.py` are mirrored in `packages/shared/types.ts` and `apps/web/lib/types.ts` (identical bodies).
- **Combo signatures** (`normalize_ingredient` in db.py / `makeSignature` in lib/feedback.ts) must stay in lockstep.

## Design

SPICE is an ai.doo studio app, but it stands on its own: the credit lives in the footer and About, not the header.

- **Signature:** the timeline (`components/Timeline.tsx`, geometry in `lib/timeline.ts`): steps as blocks across the minutes, a lane per ingredient. It appears on the plan, in cook mode, on the home sample and on the share poster, and the mark (`components/Mark.tsx`) is a miniature of it. New plan features should reuse it rather than invent another visual.
- **Screens:** home (one input, prefs summary line → `PrefsSheet`, presets, sample plan) and plan (its own screen; the plan streams in at the top). Cook mode is a full-screen dialog with wake lock; finishing it counts as a cook.
- **One colour:** SPICE vermilion `spice-500` `#e8562a`, reserved for the plan title card, the timeline and the single main action. Text on it is `spice-950`, never white (white is 3.6:1). Ingredients, toggles and presets are neutral (chosen = ink-filled). Warnings amber, success emerald; no blue.
- **Flat and warm:** tokens in `app/globals.css` (`surface-dark #141312`, `ink`, `muted`, `dim`, `line`). No glows, gradients, coloured shadows, blur or decorative motion; functional motion is `motion-safe:`. The plan page is sections separated by space and rules, not cards.
- **Type:** Bricolage Grotesque (`font-display`, self-hosted) for headings, Inter for body. Sentence case, nothing under 12px, "min" and "kcal".
- **Theme:** follows the device; Settings can force light or dark (`spice-theme` in localStorage).
- **Copy:** "we", plain, warm, a little dry; claim only what ships.

## Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Model key; unset = demo mode |
| `OPENAI_MODEL` | `gpt-4o` (compose: `gpt-4o-mini`) | Model for plans; must support strict structured outputs |
| `OPENAI_BASE_URL` | OpenAI | Any OpenAI-compatible endpoint (e.g. Ollama `http://host:11434/v1`) |
| `DAILY_LLM_CAP` | `1000` | Live model calls per UTC day; 503 once spent; `0` disables |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | `20` / `3600` | Per-IP generation limit |
| `VOTE_RATE_LIMIT_MAX` / `VOTE_RATE_LIMIT_WINDOW` | `60` / `3600` | Per-IP feedback/cooked limit |
| `TRUSTED_PROXY_HOPS` | `1` | Proxies that append to X-Forwarded-For; IP is read from the right |
| `CLIENT_IP_HEADER` | — | Use this header for the client IP instead (only if the edge overwrites it) |
| `GENERATION_CACHE_TTL_DAYS` | `30` | Cache lifetime |
| `DB_PATH` | `spice/data/spice.db` | SQLite path |
| `API_URL` (web) | `http://localhost:5000` | Proxy target |

## Things to Watch Out For

- Always set `PYTHONPATH` when running API outside Docker — shared packages won't resolve otherwise
- On Windows, use `;` as path separator: `PYTHONPATH="../../packages;."`
- Production must sit behind a reverse proxy that **appends** the client IP to `X-Forwarded-For` (nginx `$proxy_add_x_forwarded_for`, Caddy default), or set `CLIENT_IP_HEADER`. Behind Cloudflare use `CLIENT_IP_HEADER=cf-connecting-ip`, otherwise every visitor shares a Cloudflare edge IP.
- nginx in front of the web app must not buffer `/api/v1/*/stream` (the API sends `X-Accel-Buffering: no`; keep `proxy_buffering` defaults or turn it off for that path).
- Frontend and API have separate dependency management
- Playwright needs a Chromium: `npx playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_PATH` at an existing binary
- **Ruff is 0.17.0 here and 0.15.9 everywhere else in the suite**, on the same machine-wide Python. There is no ruff config, so the rules are that release's defaults: lint that passes on 0.15.9 is not the lint CI runs. Use `apps/api/.venv`; the `lint` and `format` gates fail on any other ruff (D-007).
- **A native run spends real money.** `llm.py` calls `load_dotenv()`, which finds the repo-root `.env` and its real `OPENAI_API_KEY`. To get demo mode, start the API with `OPENAI_API_KEY=` set empty.
- **Playwright reuses whatever is on port 3737** outside CI. With a dev server running from another checkout or worktree, the E2E run tests that code, not yours. The `e2e` gate refuses to run while the port is taken (D-009).
- **`e2e` runs against `next dev`**, not the production build; the `build` gate is what proves the build.
- A fresh worktree has no `apps/api/.venv` and no `apps/web/node_modules`. Do the one-time setup under Gates first.
- CI does not call `scripts/gates.sh` (D-008): CI runs the evals and no audit, the gates run the audit and no evals. The desk is Python 3.14 and Node 24; CI is 3.11 and 22; the Docker image is Python 3.12.
- `scripts/gates.sh` must keep LF line endings (`.gitattributes` pins it); `core.autocrlf` is on at the desk.
- There is no `pyproject.toml` in `apps/api`: `pip install -e .` fails. Install from the requirements files.

## Documents

| Document | Purpose |
|---|---|
| `docs/PRODUCT_BRIEF.md` | Who it is for, non-goals, assumptions |
| `docs/ARCHITECTURE.md` | Boundaries, data, failure behaviour, debt |
| `docs/ROADMAP.md` | Outcomes, gates and evidence |
| `docs/CURRENT_SPRINT.md` | Where work stopped and the one next action |
| `docs/DECISIONS.md` | Choices already made, with the reasons |
| `AGENTS.md` | How Codex reviews |
