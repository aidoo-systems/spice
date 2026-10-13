# Current Sprint

Last updated: 2026-10-13
Sprint: 1, ship v0.9.0
State: ready

## Goal

v0.9.0 is live at spice.aidoo.biz and the owner has cooked one plan from it.

## Current truth

- v0.9.0 is on `master`: the owner merged aidoo-systems/spice#6 on 2026-10-13
  (merge commit `b449b4e`), which started the deploy. Whether production is on
  v0.9.0 is not yet confirmed here: check the acceptance commands below.
- The studio adopted the repo on 2026-10-13: documents, `scripts/gates.sh`,
  merged settings. Nothing in `apps/` or `packages/` was changed by adoption.
- Gates on the v0.9.0 tree, 2026-10-13: eight of nine pass. **`audit` fails**,
  on advisories that were already there and that nothing checked before: see the
  work log and P1.3. The runtime ones (`next` is critical) are in what
  production runs today.
- The owner has run v0.9.0 locally (API on 5000, web on 3737) and has not yet
  said how it went.
- Not known: whether the evals pass at 90% on this tree. CI on #6 decides.

## Execution order

1. Confirm the deploy with the acceptance commands and record their output
   against P1.1.
2. Owner cooks one plan end to end on a phone from the live site (P1.2).
3. `/next P1.3`: clear the dependency advisories. The first item the gauntlet
   can close unattended, and the only red gate. It does not wait for 1 or 2.
4. `/next P2.1`: record the eval baseline on both models.
5. Owner turns their notes into the P3.1 list.

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

## Stop/handoff checklist

- [ ] Roadmap status and acceptance evidence updated.
- [ ] Decisions recorded.
- [ ] Changelog updated if behaviour changed.
- [ ] Exactly one unambiguous next action left above.
- [ ] Gates run and result recorded.
