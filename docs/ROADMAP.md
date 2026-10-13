# Roadmap

Last updated: 2026-10-13

## How to use this file

- This is the outcome/status ledger, not a wish list.
- Statuses: `Proposed`, `In Progress`, `Ready For Test`, `Complete`, `Deferred`, `Not Planned`.
- **`Complete` requires acceptance evidence recorded as a command and its output**, not a description of one.
- The `Gate` column says who can decide the item is done:
  - `machine`: a command decides pass/fail. The gauntlet can close this unattended.
  - `owner`: needs human judgement (review, taste, device, legal, user testing).
  - `undefined`: acceptance not yet specified. The gauntlet will refuse to start.
- The `Stakes` column says how costly a subtle mistake would be:
  - `high`: touches persistence, security or money, or has its own design doc.
  - `routine`: everything else.
- The single active execution order lives in [CURRENT_SPRINT.md](CURRENT_SPRINT.md).

Everything up to v0.9.0 was built before the studio adopted this repo. Its
record is `CHANGELOG.md`; it is not back-filled here as `Complete` rows, because
nobody recorded acceptance evidence at the time.

## Phase 1: ship v0.9.0

Goal: the streaming, checked, cook-mode version is what the public sees, and the
owner has cooked from it.

| ID | Outcome | Status | Gate | Stakes | Acceptance evidence |
|---|---|---|---|---|---|
| P1.1 | v0.9.0 is live at spice.aidoo.biz | Complete | owner | high | Owner merged aidoo-systems/spice#6 on 2026-10-13. `gh run list --workflow deploy.yml --limit 1`: `completed success Merge pull request #7 from aidoo-systems/studio/adopt Deploy to VPS master push 38467503215 1m40s` (the run for #6, 38465024116, also `success`). `curl -fsS https://spice.aidoo.biz/api/health`: `{"status":"ok","version":"0.9.0"}` |
| P1.2 | The owner has cooked one plan end to end on a phone, from the live site | Proposed | owner | routine | The owner's word, with anything that got in the way written into P3.1 |
| P1.3 | No dependency carries a known high or critical advisory | Complete | machine | high | `bash scripts/gates.sh`, 2026-10-13: `[PASS] lint` `[PASS] format` `[PASS] tests` `[PASS] types` `[PASS] unit` `[PASS] build` `[PASS] e2e` `[PASS] audit` `[PASS] docs`, `All gates passed.` `npm audit`: `found 0 vulnerabilities` (was 8: 1 moderate, 4 high, 3 critical). `next` 15.5.12 to 15.5.27, `sharp` 0.35.5, `nanoid`, `source-map-js` by lockfile; `next`'s nested `postcss` by an override (D-010); `vitest` 3 to 5 and `pytest` 8 to 9 as dev-only majors |

## Phase 2: better plans

Goal: find out whether plans that pass the checks are also worth cooking, and
raise the ones that aren't.

| ID | Outcome | Status | Gate | Stakes | Acceptance evidence |
|---|---|---|---|---|---|
| P2.1 | A recorded baseline: the eval set run against `gpt-4o` and `gpt-4o-mini`, with every failure put in a category | Proposed | machine | routine | `python -m evals.run --report` output for both models, and the categorised failures, recorded in `docs/checkpoints/` |
| P2.2 | The owner has cooked three plans from real leftovers and rated each | Proposed | owner | routine | Three ratings and a sentence each. This is the test of the riskiest assumption in the brief |
| P2.3 | The eval set covers what people actually type | Proposed | undefined | routine | Not yet specified. Needs a decision on whether anonymous combination signatures may seed eval cases |
| P2.4 | The worst failure category from P2.1 is fixed | Proposed | machine | high | The eval pass rate for that category before and after, same model, same cases. `high` because it changes the prompt or the checks every plan passes through |

### Phase 2 out of scope

Changing model provider; fine-tuning; any nutrition or allergy claim beyond what
the plan already says.

## Phase 3: look and feel

Goal: the plan screen, cook mode, timeline and poster feel right in a kitchen,
on a phone. Taste is not machine-checkable; every item here is the owner's call.

| ID | Outcome | Status | Gate | Stakes | Acceptance evidence |
|---|---|---|---|---|---|
| P3.1 | The owner's notes from using v0.9.0 are a list of specific changes | Proposed | owner | routine | The list exists in `CURRENT_SPRINT.md`, each line specific enough to build |
| P3.2 | Each change from P3.1, built | Proposed | owner | routine | A before and after screenshot at phone width; the owner says yes or no |

## Later, separately gated

| Outcome | Status | Why later |
|---|---|---|
| Web lint and format gates (ESLint, Prettier) | Deferred | The frontend has neither; the gate runner has nothing to run. Worth doing before Phase 3 produces much churn |
| CI calls `scripts/gates.sh` instead of re-listing the steps | Deferred | Stops desk and CI drifting apart (D-008). Touches the workflow that guards the deploy, so it gets its own item |
| One source for the shared types, generated | Deferred | Three hand-mirrored copies today |
| A backup of the SQLite volume | Deferred | Only anonymous counts and a cache are at risk |
| Weekly meal planning | Deferred | Undecided, not ruled out (D-003) |
| A native app | Deferred | Undecided, not ruled out (D-003) |
| Accounts and server-side user data | Not Planned | Non-goal (D-002) |
| Hub auth, or running on the suite's Ollama | Not Planned | Non-goal (D-002) |

## Release-level Definition of Done

1. A person can go from ingredients to a finished cook on a phone without an account.
2. `scripts/gates.sh` is green with nothing skipped, and CI is green including the evals.
3. The owner has used the change on a phone.
4. The deploy's smoke checks pass against spice.aidoo.biz.
5. `CURRENT_SPRINT.md`, this roadmap, `DECISIONS.md` and `CHANGELOG.md` reflect the shipped state.
