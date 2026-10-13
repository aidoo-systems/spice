# Changelog

All notable changes to SPICE are documented here.

## [0.8.0] - 2026-10-13

### Added
- Streaming plans: `POST /v1/suggest/stream` and `/v1/followup/stream` send SSE `partial` snapshots (tolerant partial-JSON parser) and then a validated `final` plan; the UI renders the plan as it is written
- Strict structured outputs: the model writes to a `json_schema` generated from a Pydantic draft model; the "fix this JSON" repair call is removed
- Plan checks on every response (`meta.checks`): timeline, time limit, ingredient grounding per step (`steps[].uses`, `meta.grounding`), diet and calories; diet-breaking upgrades are removed
- "How this was generated" drawer, per-step ingredient chips, an "Only your ingredients" badge and "Tuned to your feedback" notes (`adjustments`)
- Follow-ups (`/v1/followup`): revise a plan in place ("I don't have garlic", "for 4"), with undo
- `POST /v1/cooked`: "Cooked N times" now counts finished Cook Mode sessions and "I cooked this" taps only
- `DAILY_LLM_CAP` budget on live model calls (503 when spent) and a rate limit on feedback/cooked votes
- `OPENAI_BASE_URL` support for any OpenAI-compatible provider (e.g. Ollama)
- Eval set (`apps/api/evals`) with a runner and CI job; vitest unit tests; Playwright flows for generate → regenerate → follow-up → cooked
- About dialog and "an ai.doo demo" branding
- `ci.yml` workflow (lint, tests, build, E2E, evals) reused by the deploy workflow

### Changed
- Regenerate sends `variation` + `avoid_titles`, which are part of the cache key, so it always produces a new dish
- Client IP for rate limiting is read from the right of `X-Forwarded-For` (`TRUSTED_PROXY_HOPS`) or from `CLIENT_IP_HEADER`; spoofed headers no longer create new buckets
- Every prompt-bound field is length- and count-limited; `spice_level` and `time_minutes` are validated
- Generation cache entries expire after `GENERATION_CACHE_TTL_DAYS`
- The Next.js proxy streams responses, cancels upstream on disconnect, and no longer leaks internal error text
- Errors are shown in plain language; a failed generation restores the previous plan
- First visit: the splash plays once per browser, the tour is opt-in, and presets/Budget Challenge generate in one tap
- `page.tsx` split into focused components; prompts split into system/suggest/follow-up templates
- Docs (`CLAUDE.md`, README, INSTRUCTIONS) brought up to date; Makefile gains test/lint/evals targets

### Changed (design)
- SPICE now wears its own colour, chilli vermilion `#e8562a` (the colour of its card on aidoo.biz), with dark text on it; amber is gone
- Flat, warm surfaces matching the ai.doo family; no background glow, gradients, coloured shadows, blurred header or fade-in motion
- Headings set in Bricolage Grotesque (self-hosted, OFL), labels in sentence case instead of tracked capitals
- One filled button per view; secondary actions are outlined buttons or underlined links
- The plan's title card is solid vermilion; plan details read as a sentence instead of a row of chips
- "by ai.doo" wordmark with the ball in the header and footer; About rewritten in the studio's voice with only claims that hold today, plus a privacy link
- Contrast fixes: button text, small labels and secondary text now meet WCAG AA

### Removed
- The intro splash animation
- Personal stats and streaks
- `combo_count` in `CommunityStats` (replaced by `cooked_count`)

## [0.7.0] - 2026-07-01

### Added
- Generation cache: identical requests are served from SQLite (`generations` table) instead of re-calling OpenAI — near-instant and free on repeats
- OpenAI JSON mode (`response_format=json_object`) for reliable structured output
- Numeric guardrails: prep time clamped to the requested ceiling, implausible calorie estimates dropped
- Prompt-injection guard: ingredient/pantry/feedback text is treated as data, never instructions
- Warm visual identity: Space Grotesk display font, amber-glow canvas, and a chilli-red "live cooking" accent in Cook Mode
- Inviting empty state, a compact post-generation input summary, and a sticky mobile CTA
- 4 new API tests (generation-cache round-trip, ingredient normalization)

### Changed
- Default OpenAI model `gpt-4o-mini` → `gpt-4o`
- Combo signatures are normalized (case/whitespace) on both client and server so community counts no longer fragment across spellings
- API proxy strips hop-by-hop / `Expect` headers (fixes 502s from clients that send `Expect: 100-continue`)
- Full look-and-feel refresh: branded amber-gradient primary actions, card elevation, amber-tinted selections, coherent numbered Upgrade Ladder tiers, higher muted-text contrast
- Results render full-width once a plan exists, removing desktop dead space
- DB reads now share the write lock for consistency
- Web package version aligned with the API (0.7.0)

### Fixed
- Non-food rejections no longer pollute the community combo table
- Retry path now handles rejections consistently with the first parse

## [0.6.0] - 2026-03-06

### Added
- Security headers middleware on API (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- Security headers on web via `next.config.ts`
- SQLite foreign key constraint enforcement (`PRAGMA foreign_keys=ON`)
- Feedback endpoint input validation (combo_signature format check)
- Max ingredient limit (50) in request schema
- Rate limiter store cap (10,000 IPs) to prevent unbounded memory growth
- Configurable OpenAI model via `OPENAI_MODEL` env var
- API request timeout (30s) on frontend fetch calls
- Double-click protection on feedback buttons
- Docker Compose resource limits on all services
- 12 new API tests (54 total): security headers, CORS rejection, feedback validation, input limits, IP extraction, JSON parser edge cases

### Changed
- IP extraction now uses first entry from `X-Forwarded-For` (prevents spoofing via chained proxies)
- Umami analytics port kept public (required for browser-side tracking script)
- OpenAI retry wrapped in try-except (no longer crashes on double parse failure)
- Streak calculation uses local timezone instead of UTC
- Ingredient remove buttons have proper `aria-label` for screen readers
- Version centralised in `main.py` (`__version__`)
- README rewritten with security section, updated test count, and new env vars

### Fixed
- FK constraint violation: feedback for non-existent combos now correctly rejected
- Tests no longer leak OpenAI API key from `.env` via `load_dotenv()`
- Timezone bug in daily streak calculation (UTC vs local date mismatch)

## [0.5.2] - 2026-02-19

### Added
- First-time tutorial overlay with reopen option in Settings
- Intro splash animation with logo fly-in (once per session)
- Results empty-state panel for new users
- SEO metadata improvements plus `robots.txt` and `sitemap.xml`
- Build instructions document (`INSTRUCTIONS.md`)
- Playwright E2E tests for tutorial + SEO endpoints
- CI checks for API tests, web build, and E2E flow before deploy

### Changed
- Tutorial overlay focus restore and throttled highlight updates
- Deploy workflow now includes post-deploy smoke checks

## [0.5.1] - 2026-02-13

### Added
- Feedback email link in footer (`mailto:hello@aidoo.biz`)
- Air fryer added to equipment options
- Umami self-hosted analytics with Postgres (Docker)
- GitHub Actions auto-deploy workflow on push to master
- In-app "What's New" changelog in settings panel

### Changed
- Footer simplified to "© 2026 ai.doo · Feedback"

## [0.5.0] - 2026-02-12

### Added
- **Community combo tracking** — SQLite-backed anonymous combo popularity counter
- **Community ratings** — aggregated feedback breakdown pills per ingredient combo
- **Feedback endpoint** — `POST /v1/feedback` for submitting combo ratings
- **Personal stats** — recipes generated, saved, and daily streak (localStorage)
- **Rate limiting** — per-IP sliding window on suggest endpoint (configurable via env vars)
- **Sticky header** — frosted glass top bar stays visible on scroll
- Saved recipes panel with bookmark icon in header
- Native share sheet support on mobile (Web Share API with file/text fallback)
- 16 new tests for db module, rate limiter, and rate limit integration (42 total)

### Changed
- Dockerfile: single worker for SQLite safety (`--workers 1`)
- Docker Compose: CORS locked to `localhost:3737` (was wildcard `*`)
- DB connection gracefully closed on shutdown
- Rate limiter periodically prunes stale IPs to prevent memory growth
- `.gitignore` expanded with IDE, OS, and Claude Code entries
- README rewritten with configuration table, feedback endpoint docs, and full test count

### Fixed
- Feedback toast no longer promises "we'll adjust next time"
- Share/save buttons stay right-aligned when feedback pills disappear
- Hidden export card no longer pushes layout on narrow screens

## [0.4.0] - 2026-02-12

### Added
- Randomised suggestion presets from a pool of 25 budget-friendly combos
- Amber "I" favicon matching the SPICE wordmark
- Witty rejection messages for non-food ingredients (e.g. "headphones")
- Saved recipes panel with bookmark icon in header
- `rejection` field in response schema for non-food detection

### Changed
- Removed "(minutes)" from Time label (bubbles already show units)
- Moved subtitle into settings panel footer to declutter header

### Fixed
- Rejection-only responses no longer fail schema validation

## [0.3.0] - 2026-02-12

### Added
- Clear button to remove all ingredients
- Time bubble selector (15/30/45/60 min) replacing number input
- SPICE wordmark with branded amber "I"
- Footer with ai.doo link
- Loading messages on submit button
- LLM prompt rule to correct ingredient typos

### Changed
- Default to dark mode for new visitors
- Renamed cook mode "Reset" button to "Stop"

### Fixed
- Cook timer now auto-stops when regenerating a recipe
- Removed duplicate loading message from skeleton loader
- Replaced build-time Next.js rewrites with runtime Route Handler proxy

## [0.2.0] - 2026-02-12

### Added
- Calorie estimates in schema, prompt, mocks, and UI badge
- Settings panel (gear icon) with pantry staples and skill level
- Ingredient autocomplete with ~130 common UK grocery items
- Rotating fun loading messages in skeleton loader
- Share card with Web Share API, background PNG export, and save to localStorage
- Calorie estimate tests

### Changed
- Lifted CookMode state to parent for cross-component control
- Reordered result sections (notes near steps, WhyThisWorks always visible)

## [0.1.0] - 2026-02-12

### Added
- Inter font, brand colour palette, and dark mode support
- Loading skeleton with staggered fade-in animations
- Smooth expand/collapse and responsive grid layout
- Toast notifications with sonner
- Accessibility attributes, error boundary, and OG meta tags
- CookMode audio ding, step skip, and large text
- Health endpoint, CORS lockdown, timeouts, and structured errors
- Hardened Dockerfiles for production
- Tests for health endpoint, CORS, and edge cases

## [0.0.1] - 2026-02-12

### Added
- Monorepo scaffold with shared Pydantic + TypeScript types
- FastAPI backend with mocked `/v1/suggest` endpoint
- Next.js frontend with ingredient input and result display
- OpenAI integration for meal suggestion generation
- Premium schema: flavour modes, pantry, cook mode, upgrade ladder, share
- Rewritten prompt and OpenAI service for premium features
- Docker Compose setup with API and web services
- Comprehensive API test suite
