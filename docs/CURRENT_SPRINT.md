# Current Sprint

Last updated: 2026-10-13
Sprint: 1, ship v0.9.0
State: ready

## Goal

v0.9.0 is live at spice.aidoo.biz and the owner has cooked one plan from it.

## Current truth

- v0.9.0 is on `master`: the owner merged aidoo-systems/spice#6 on 2026-10-13
  (merge commit `b449b4e`), which started the deploy. Production is on v0.9.0:
  the deploy run succeeded and `/api/health` reports `0.9.0` (P1.1, Complete).
- The studio adopted the repo on 2026-10-13: documents, `scripts/gates.sh`,
  merged settings. Nothing in `apps/` or `packages/` was changed by adoption.
- Gates, 2026-10-13: all nine pass on the P1.3 branch. On `master` until that
  lands, `audit` still fails, and the runtime advisories (`next` is critical)
  are in what production runs.
- The owner has run v0.9.0 locally (API on 5000, web on 3737) and has not yet
  said how it went.
- Not known: whether the evals pass at 90% on this tree. CI on #6 decides.

## Execution order

1. Owner merges the P1.3 pull request (it deploys).
2. Owner cooks one plan end to end on a phone from the live site (P1.2).
3. The design items, which the owner asked for next on 2026-10-13. They are
   roadmap rows P3.2 to P3.10. P3.2 (no dud rejections) is built and waits for
   its pull request to merge; **next is `/next P3.3`**, the streaming stutter,
   then P3.4. P3.5 and the speech line in P3.7 each need a decision first.
4. `/next P2.1`: record the eval baseline on both models.

## Acceptance

- `gh run list --workflow deploy.yml --limit 1` shows success, and
  `curl -fsS https://spice.aidoo.biz/api/health` reports `0.9.0`.

## Owner gates: waiting on a human

- Cook one plan on a phone.
- P2.3 needs a decision: may anonymous combination signatures seed eval cases?

## Work log

### 2026-10-13
- Adopted into the studio. Interview: D-001 to D-004. Setup: D-005 to D-009.
- Opened aidoo-systems/spice#6 for v0.9.0.
- `bash scripts/gates.sh`, in a clean worktree at v0.9.0 plus the setup, on the
  repo's venv (ruff 0.17.0), Python 3.14, Node 24:

  ```
    [PASS] lint       (0s)
    [PASS] format     (1s)
    [PASS] tests      (4s)
    [PASS] types      (6s)
    [PASS] unit       (3s)
    [PASS] build      (25s)
    [PASS] e2e        (26s)
    [FAIL] audit      (46s)
    [PASS] docs       (1s)
  GATES FAILED: audit
  ```

- `audit` is newly detected, not newly caused: adoption changed no dependency,
  and neither CI nor anything else audited them before. `npm audit`: 8
  advisories (1 moderate, 4 high, 3 critical). `pip-audit`: `pytest` 8.4.2,
  PYSEC-2026-1845, fixed in 9.0.3. Left red on purpose: the fix changes what
  production runs and two of them need a major version, so it is its own item
  (P1.3), not a line in a setup commit.
- The `e2e` gate was also run with a dev server on 3737 and refused, as designed.
- P1.1 confirmed: `gh run list --workflow deploy.yml --limit 1` shows `success`
  and `curl -fsS https://spice.aidoo.biz/api/health` gives
  `{"status":"ok","version":"0.9.0"}`.
- P1.3: `npm audit fix`, then `vitest` 5, `pytest` 9 and an override for
  `next`'s nested `postcss` (D-010). `bash scripts/gates.sh`: all nine pass,
  `npm audit` finds 0 vulnerabilities. One gate cycle.
- P3.2: a list with a known food in it (`spice/foods.py`) is never rejected. The
  engine asks the model once more and a second refusal is a 502; refusals are
  not cached and cached ones are ignored; the prompt asks for one plain
  sentence. Red: 6 failed. Green: `bash scripts/gates.sh`, all nine pass.
  Branch is stacked on P1.3, so merge that first.

## Stop/handoff checklist

- [ ] Roadmap status and acceptance evidence updated.
- [ ] Decisions recorded.
- [ ] Changelog updated if behaviour changed.
- [ ] Exactly one unambiguous next action left above.
- [ ] Gates run and result recorded.
