# Decision Log

Keep superseded decisions. Link the replacement rather than rewriting history.

## D-001: the cook wins

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** SPICE serves two audiences, the home cook and the person
  evaluating ai.doo. When they conflict, the cook wins.
- **Why:** The owner first chose "both, equally". Pushed on what happens when a
  feature impresses evaluators but a cook would never use it, the owner chose
  the cook. The showcase value comes from the product being real.
- **Alternatives:** Showcase first (rejected). No standing rule, decided case by
  case (rejected in favour of a rule).
- **Consequences:** A feature whose only argument is "it shows off the
  engineering" does not go in. "How this was generated" stays because a cook
  deciding whether to trust a plan uses it too.
- **Revisit when:** ai.doo needs SPICE to demonstrate something specific for a
  pilot.

## D-002: non-goals

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** No accounts or server-side user data. No suite integration: no
  Hub auth, and no requirement to run on the suite's Ollama.
- **Why:** The owner's choice. An anonymous public demo has nothing to log in
  to, and a hosted model keeps the demo fast on a small VPS.
- **Alternatives:** Joining the suite's self-hosted, privacy-first line. The
  tension is real (SPICE sends ingredients to a hosted model) and accepted.
- **Consequences:** Everything personal stays in `localStorage`. The
  OpenAI-compatible client stays, so a local endpoint remains possible, but
  nothing is built or tested for it.
- **Revisit when:** SPICE is offered to a client as part of the suite.

## D-003: weekly planning and a native app are undecided, not ruled out

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** Neither is a non-goal. Neither is on the roadmap.
- **Why:** Claude offered both as non-goals in the interview and the owner
  declined to select them.
- **Consequences:** Do not cite them as out of scope. Do not build towards them
  without a roadmap row.
- **Revisit when:** The owner raises either.

## D-004: v0.9.0 lands first, the studio setup follows on master

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** Two pull requests. aidoo-systems/spice#6 brings v0.9.0 into
  `master`; the studio setup is its own PR on top.
- **Why:** Claude recommended committing the setup on the v0.9.0 branch so it
  rode that PR. The owner chose instead to merge the work into `master` and set
  the studio up there, then chose two PRs over one so that nothing reaches
  production without a click.
- **Consequences:** The setup was written against the v0.9.0 tree and is opened
  once #6 has merged.

## D-005: one repo-local gate runner for both halves

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** `scripts/gates.sh` covers the API and the web app, built from the
  studio's `python-service` and `web-app` profiles. The docs gate is the shared
  one, verbatim.
- **Why:** Neither profile fits a monorepo: `python-service` expects `src/<pkg>`
  and a `pyproject.toml`, `web-app` expects `package.json` at the root.
- **Alternatives:** Two runners (two verdicts for one repo; rejected). Moving the
  code to fit a profile (not adoption's job).
- **Consequences:** A studio gap: there is no monorepo profile. When the shared
  docs gate changes, this copy is synced by hand.
- **Revisit when:** A second repo with both halves is adopted.

## D-006: the evals are CI-only, not a gate

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** `scripts/gates.sh` does not run `evals.run`.
- **Why:** They call the real model, cost money and are not deterministic. A gate
  that can fail on the same tree twice is not a gate.
- **Consequences:** "Gates green" does not mean "plans are good". CI still runs
  the evals at 90% when it has a key, before any deploy.
- **Revisit when:** The evals can run against a recorded or local model.

## D-007: the gates run on the repo's own virtualenv

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** `scripts/gates.sh` uses `apps/api/.venv` when it exists, and the
  `lint` and `format` gates fail if ruff is not the version pinned in
  `apps/api/requirements-dev.txt`.
- **Why:** SPICE pins ruff 0.17.0 and has no ruff config, so its rule set is that
  release's defaults. The rest of the suite pins 0.15.9 on the same machine-wide
  Python. On 0.15.9 the lint passes, but that is not the lint CI runs.
- **Alternatives:** Installing 0.17.0 machine-wide (breaks the neighbours'
  gates). Adding a ruff config with an explicit `select` (better, and a code
  change for a later item).
- **Revisit when:** SPICE gets a ruff config, or the suite moves to one ruff.

## D-008: the CI workflows are left alone

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** `ci.yml` and `deploy.yml` are unchanged by adoption. CI lists its
  own steps rather than calling `scripts/gates.sh`.
- **Why:** They exist, they work, and `ci.yml` guards the production deploy.
- **Consequences:** Desk and CI can drift. Today they differ in three ways: CI
  runs the evals and the gates do not; the gates run `audit` and CI does not; CI
  is Python 3.11 and Node 22, the desk is 3.14 and 24.
- **Revisit when:** The roadmap's "CI calls `scripts/gates.sh`" item is picked up.

## D-009: the e2e gate refuses to run when port 3737 is taken

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** If anything is listening on 127.0.0.1:3737, the `e2e` gate fails
  with a message instead of running.
- **Why:** `playwright.config.ts` reuses an existing server outside CI. A dev
  server from another checkout or worktree would be the thing tested.
- **Alternatives:** A configurable port in the Playwright config (a code change;
  better, later).

## D-010: next's nested postcss is lifted by an npm override, not by next 16

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decision:** `apps/web/package.json` has `overrides.next.postcss: ^8.5.30`.
  `next` stays on 15.
- **Why:** `next` 15.5.27 pins `postcss` 8.4.31 exactly, which carries four high
  advisories. The roadmap row for P1.3 said every runtime fix was non-breaking;
  for this one npm's only offer was `next` 16. A framework major does not belong
  inside a security fix. 8.4.31 to 8.5.30 is the same major, and the `build` and
  `e2e` gates pass on it.
- **Alternatives:** `next` 16 (a breaking change to what production runs; its
  own item if wanted). Leaving it and lowering the audit level (hides the next
  one too).
- **Consequences:** `next` runs on a `postcss` it was not released against. The
  override is one more thing to remove.
- **Revisit when:** `next` is upgraded to a version that ships a fixed `postcss`:
  delete the override in the same change.
