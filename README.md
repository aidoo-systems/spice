# SPICE

Tell SPICE what ingredients you have. It writes a step-by-step meal plan with timings, an upgrade ladder and the flavour reasoning, and you watch it stream in live. Every plan is checked on the server before it is final, and you can ask follow-ups ("I don't have garlic", "make it for 4") to change it.

SPICE is an [ai.doo](https://aidoo.biz) showcase app.

## What makes it a good AI feature

- **Streamed, structured output**: the model writes to a strict JSON schema, and the UI renders each partial snapshot as it arrives. There's no free-text parsing and no "fix your JSON" retry call.
- **Checked before you trust it**: every plan is checked on the server:
  - steps are in order and inside your time limit
  - each step's ingredients come from your list, your pantry or basic staples
  - the plan fits your diet; diet-breaking upgrades are removed

  The results are shown under every plan in **How this was generated**.
- **Honest numbers**: "Cooked N times" counts only finished cook-mode sessions or "I cooked this" taps. It never counts generations.
- **Taste feedback loop**: ratings change the next plan for those ingredients, and the plan says what it changed.
- **Follow-ups with undo**: you can revise a plan without starting again.
- **Evals in CI**: a fixed set of cases (diets, non-food, prompt injection, typos, rescue mode…) runs against the real model on every change.
- **Cost and abuse controls**:
  - per-IP rate limits, keyed on an IP the client can't spoof
  - a daily cap on live model calls
  - length limits on every input
  - a generation cache, so repeated requests cost nothing

## Features

- **Flavour modes**: Bold & Spicy, Savoury & Umami, Comfort & Rich, Bright & Fresh, Clean & Light
- **Upgrade ladder**: pantry upgrades, "if you have" additions and a £1 shop add-on
- **Cook mode**: full screen, one step at a time in big type, a countdown to the next step, tap/swipe/arrow keys to move, and the screen kept awake
- **Minimal meal rescue**: a viable plan even from a single ingredient
- **Pantry memory**: "always available" staples, stored in your browser
- **Community ratings**: anonymous, per ingredient combination
- **The timeline**: every plan is drawn across the minutes, with a lane per ingredient showing when it's used
- **Share poster**: a 1080×1350 image of the plan and its timeline; saved recipes stay in your browser
- **First screen**: one ingredient box, preferences summarised in a line, one-tap presets and a finished sample plan to look at first
- **Demo mode**: runs without an API key, using canned plans replayed as a stream (clearly labelled)

## Project structure

```
apps/
  api/          FastAPI backend (Python) + evals/
  web/          Next.js frontend (TypeScript + Tailwind)
packages/
  shared/       Pydantic models + mirrored TypeScript types
```

## Quick start

### Docker Compose (recommended)

```bash
# Demo mode (no key):
docker compose up --build

# With a model — create .env in the repo root:
echo "OPENAI_API_KEY=sk-your-key" > .env
docker compose up --build
```

API: [localhost:5000](http://localhost:5000) | Web: [localhost:3737](http://localhost:3737)

### Local dev

```bash
# API
cd apps/api && pip install -r requirements-dev.txt
PYTHONPATH="../../packages:." uvicorn spice.main:app --reload --port 5000

# Web
cd apps/web && npm install && npm run dev   # :3737, proxies /api/* to API_URL
```

### Other model providers

Any OpenAI-compatible endpoint that supports `json_schema` structured outputs works. For example, a local Ollama:

```bash
OPENAI_API_KEY=ollama OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_MODEL=llama3.2:3b
```

## API

All generation endpoints come in two forms: JSON (`/v1/suggest`) and a server-sent-events stream (`/v1/suggest/stream`).

### `POST /v1/suggest` · `POST /v1/suggest/stream`

```json
{
  "ingredients": ["maggi noodles", "onion"],
  "constraints": {
    "diet": "vegetarian",
    "time_minutes": 15,
    "equipment": ["hob", "pan"],
    "spice_level": "medium",
    "flavour_mode": "umami",
    "skill_mode": "beginner"
  },
  "pantry_items": ["oil", "salt"],
  "feedback_history": ["too_bland"],
  "variation": 0,
  "avoid_titles": []
}
```

**Limits:**

- `ingredients`: 1–50 items
- `pantry_items`: up to 50 items
- each ingredient or pantry item: 60 characters or fewer
- `time_minutes`: 5–240
- `spice_level`: `mild`, `medium` or `hot`

To regenerate, send `variation` > 0 and put the titles already shown in `avoid_titles`.

**Response:** a plan with these fields:

- `title`, `prep_time_minutes`, `calories_estimate`
- `steps`: each has `t_seconds`, `instruction`, `tip` and `uses`
- `why_this_works`, `upgrade_ladder`, `minimal_rescue`, `pantry_used`, `notes`, `safety`
- `adjustments`: what changed because of past feedback
- `community`: `cooked_count`, `feedback_breakdown`, `total_feedback`
- `meta`: `model`, `mock`, `cached`, `latency_ms`, `variation`, `grounding`, `checks`

A non-food request returns only `rejection`.

**Stream events:**

- `event: partial`: a best-effort snapshot of the plan so far
- `event: final`: the validated plan
- `event: error`: `{status, message}`

A rate limit (429), a spent daily budget (503) or invalid input (422) comes back as a normal HTTP error before the stream starts.

### `POST /v1/followup` · `POST /v1/followup/stream`

```json
{ "request": { "...original SuggestRequest" }, "plan": { "...current plan" }, "question": "I don't have garlic" }
```

Returns the revised plan, with `answer` set to a one-line reply. `question` is limited to 200 characters.

### `POST /v1/feedback`

```json
{ "combo_signature": "egg,onion,rice|umami", "feedback_type": "perfect" }
```

`feedback_type` is one of `too_salty`, `too_bland`, `perfect` or `needs_spice`.

Returns `{ "status": "ok", "feedback_breakdown": { "perfect": 100 }, "total_feedback": 1 }`.

### `POST /v1/cooked`

```json
{ "combo_signature": "egg,onion,rice|umami" }
```

Returns `{ "cooked_count": 4 }`. The web app calls it once per plan, when cook mode finishes or the user taps "I cooked this".

For `/v1/feedback` and `/v1/cooked`, the combo must already have been generated; otherwise the API returns 404.

See `packages/shared/schemas.py` for the full schema.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Model key (omit for demo mode) |
| `OPENAI_MODEL` | `gpt-4o` (compose: `gpt-4o-mini`) | Model; must support strict structured outputs |
| `OPENAI_BASE_URL` | OpenAI | Any OpenAI-compatible endpoint |
| `DAILY_LLM_CAP` | `1000` | Live model calls per UTC day (`0` = unlimited) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | `20` / `3600` | Generations per IP per window |
| `VOTE_RATE_LIMIT_MAX` / `VOTE_RATE_LIMIT_WINDOW` | `60` / `3600` | Feedback/cooked votes per IP per window |
| `TRUSTED_PROXY_HOPS` | `1` | Reverse proxies that append to `X-Forwarded-For` |
| `CLIENT_IP_HEADER` | — | Read the client IP from this header instead (e.g. `cf-connecting-ip`) |
| `GENERATION_CACHE_TTL_DAYS` | `30` | Generation cache lifetime |
| `LLM_TIMEOUT` / `GENERATION_DEADLINE` | `60` / `75` | Seconds per model call / per whole generation |
| `CORS_ORIGINS` | `http://localhost:3737` | Comma-separated allowed origins |
| `DB_PATH` | `spice/data/spice.db` | SQLite database path |
| `LOG_LEVEL` | `info` | Logging level |

### Web environment

| Variable | Default | Description |
|---|---|---|
| `API_URL` | `http://localhost:5000` | Where the `/api/*` proxy forwards |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3737` | Base URL for metadata, sitemap and robots |

### Behind a reverse proxy

- **Rate limiting** reads the client IP from the right-hand end of `X-Forwarded-For`, because that entry was appended by your own edge proxy. Client-supplied entries to its left are ignored.
  - nginx (`$proxy_add_x_forwarded_for`) and Caddy work with `TRUSTED_PROXY_HOPS=1`.
  - Behind Cloudflare, set `CLIENT_IP_HEADER=cf-connecting-ip`.
- **Streaming**: don't buffer `/api/v1/*/stream`. The API sends `X-Accel-Buffering: no`.

## Tests and evals

```bash
# API: endpoints, streaming, checks, rate limiting, DB, eval harness
cd apps/api && PYTHONPATH="../../packages:." python -m pytest -q

# Web: typecheck + unit tests (SSE parser, partial-plan rendering, API errors)
cd apps/web && npm run typecheck && npm test

# Web E2E (API mocked; no backend needed)
cd apps/web && npx playwright install chromium && npm run test:e2e

# Evals against the real model
cd apps/api && OPENAI_API_KEY=... PYTHONPATH="../../packages:." python -m evals.run --report eval-report.json
```

**How evals are scored:** each case in `apps/api/evals/cases.json` must pass every server-side check and have a usable plan shape. Cases can add their own expectations:

- the request is (or isn't) rejected
- rescue mode is on
- `adjustments` is filled in
- the title differs from a previous one
- forbidden text never appears, which catches prompt-injection leaks

CI (`.github/workflows/ci.yml`) runs lint, API tests, the web typecheck, unit tests, build and E2E on every push and pull request. When the repo has an `OPENAI_API_KEY` secret, it also runs the evals, which must pass at least 90% of cases. Deploys to `master` go through the same workflow first.

## Security

- **Security headers** on the API and the web app: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`
- **CORS** locked to configured origins
- **Rate limits** per IP that a spoofed header can't get around, plus a daily cap on model calls
- **Input validation**: length and count limits on every field that reaches the prompt; prompts treat user text as data, and the evals check this
- **Proxy errors**: details are logged on the server and never shown to users
- **SQLite FK constraints**, and **Docker** containers that run as non-root with resource limits
- **Privacy**: no accounts. Pantry, saved recipes and ratings stay in the browser; the server keeps anonymous counts per ingredient combination.
