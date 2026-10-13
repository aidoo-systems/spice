# Architecture

Last updated: 2026-10-13
Status: Accepted

Describes v0.9.0. `CLAUDE.md` holds the file-by-file map and the design rules;
this file holds the boundaries and the reasons.

## Quality goals

1. **Nothing unchecked is shown as final.** Every plan, live, cached or demo,
   passes `checks.sanitize_and_check()`.
2. **Honest numbers.** A count on screen means what its label says.
3. **Bounded cost.** A stranger cannot run up the model bill.
4. **Fast to first word.** The plan streams; the user is never looking at a spinner.

## Context and constraints

- Public, anonymous, no accounts. Deployed to one VPS with Docker Compose.
- One hosted model by default (OpenAI), behind an OpenAI-compatible client so any
  endpoint with strict `json_schema` output works.
- One owner, no on-call. Failure must be cheap and obvious.

## System / data-flow diagram

```
browser ──POST /api/v1/suggest/stream──▶ Next.js route (apps/web/app/api/[...path])
                                              │  passes the body through as a stream
                                              ▼
                                        FastAPI (apps/api/spice)
   rate limit ─▶ validate ─▶ cache? ─▶ daily cap ─▶ model (strict JSON schema)
                                              │            │ partial JSON
                                              │            ▼
                                              │      SSE `partial` snapshots
                                              ▼
                                   sanitize_and_check ─▶ SSE `final`
                                              │
                                              ▼
                                   SQLite (combos, feedback, generations, usage)
```

## Domain boundaries and dependency direction

- `packages/shared/schemas.py` is the contract. `apps/web/lib/types.ts` and
  `packages/shared/types.ts` mirror it by hand.
- `routes.py` → `engine.py` → `llm.py`, `checks.py`, `db.py`. Nothing below
  `engine.py` knows about HTTP.
- `llm.py` is the only file that talks to a model provider.
- The web app never calls the API directly from the browser; it goes through
  its own `/api/*` proxy, so the browser sees one origin.

## Proposed stack, and alternatives considered

The stack was chosen before the studio adopted the repo, and nobody recorded
what else was considered. The last column is the obvious alternative and why
the current choice holds up against it, written at adoption; only the last row
is history (`CHANGELOG.md`, v0.8.0).

| Choice | Why it fits | The obvious alternative |
|---|---|---|
| FastAPI + Pydantic | The schema is the product; Pydantic generates the strict JSON schema | Flask (as on the ai.doo site): no schema story |
| Next.js 15 app router | SEO routes, a streaming proxy, one deployable | A Vite SPA: needs a separate proxy |
| SQLite, WAL | One box, anonymous counts, a cache. Nothing relational to scale | Postgres: an extra service for four small tables |
| SSE over POST | One-way, works through nginx, simple to proxy | WebSockets: two-way machinery for a one-way stream |
| Strict structured output | No free-text parsing and no repair call | JSON mode plus a "fix your JSON" retry, which v0.8.0 removed |

## Data model: ownership, lifecycle, migration

| Table | Holds | Lifecycle |
|---|---|---|
| `combos` | One row per normalised ingredient combination and flavour mode; `cooked_count`, internal `hit_count` | Grows; never pruned |
| `feedback` | Anonymous rating counts per combination | Grows |
| `generations` | The generation cache, keyed on every input including `variation` and `avoid_titles` | Expires after `GENERATION_CACHE_TTL_DAYS` |
| `usage` | Live model calls per UTC day, for `DAILY_LLM_CAP` | One row a day |

Tables are created idempotently at start-up. **There is no migration tool:** a
schema change needs a hand-written, idempotent step in `db.py` and is `high`
stakes. The production database lives in the `spice-data` Docker volume.

Pantry, saved recipes, ratings history and theme live in the browser's
`localStorage` and nowhere else.

## Privacy, security, safety, accessibility

- **Privacy:** no accounts, no personal data on the server. Umami analytics is
  self-hosted alongside.
- **Abuse:** per-IP rate limits read from the right-hand end of
  `X-Forwarded-For`; a daily cap on model calls; length and count limits on every
  field that reaches a prompt.
- **Prompt injection:** user text is passed as data, and the evals check that
  forbidden text never appears in a plan.
- **Safety:** diet-breaking upgrades are removed, not flagged. Food safety notes
  come from the model and are not independently verified. That is a known limit.
- **Accessibility:** text on vermilion is `spice-950`, never white (white is
  3.6:1); nothing under 12px; motion is `motion-safe:`. There is no automated
  accessibility check.

## External services and failure behaviour

| Service | When it fails |
|---|---|
| Model provider | `LLM_TIMEOUT` per call, `GENERATION_DEADLINE` per generation, then an SSE `error` event |
| No API key | Demo mode: canned plans replayed as a stream, labelled as such |
| Daily cap spent | HTTP 503 before the stream starts |
| Rate limit | HTTP 429 before the stream starts |

## Testing strategy, and which gates enforce it

| Layer | What | Gate |
|---|---|---|
| API | Endpoints, streaming, checks, rate limiting, DB, eval scoring (pytest) | `tests` |
| API style | ruff, pinned | `lint`, `format` |
| Web logic | SSE parser, partial-plan rendering, timeline geometry (Vitest) | `unit` |
| Web types | `tsc --noEmit` | `types` |
| Web flows | Generate, regenerate, follow-up, cooked (Playwright, API mocked) | `e2e` |
| Dependencies | `pip-audit`, `npm audit --audit-level=high` | `audit` |
| Model quality | A fixed eval set against the real model, 90% to pass | CI only, not a gate (D-006) |

`scripts/gates.sh` runs all of the gates. There is no web lint or format gate:
the frontend has no ESLint or Prettier set up.

## Performance and reliability budgets

- First streamed token: the model's latency plus one hop. No budget is measured yet.
- A whole generation: 75 seconds at most (`GENERATION_DEADLINE`).
- Containers: API 512 MB and one CPU; web 1 GB and one CPU.

## Deployment and operations

- **A push to `master` deploys.** `deploy.yml` runs `ci.yml`, then SSHes to the
  VPS, pulls, runs `docker compose up -d --build` and smoke-checks
  spice.aidoo.biz.
- Rollback is `git revert` and another push. There is no blue/green.
- No alerting. The smoke checks in the deploy are the only monitor.

## Known risks and debt

- Three hand-mirrored copies of the types (`schemas.py`, two `types.ts`).
- Combination signatures are computed twice (`db.py`, `lib/feedback.ts`) and must match.
- The version is written in four places.
- No migration tool; no backup of the SQLite volume.
- No web lint, no automated accessibility check, no production monitoring.
- Three Pythons: the desk is 3.14, CI is 3.11 and the Docker image is 3.12.
