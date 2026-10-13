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

## Owner's look-and-feel notes (P3.1), 2026-10-13

From the owner, after using v0.9.0. Not yet specific enough to build; a designer
review was commissioned the same day and its findings are not recorded here.

1. **Presets return dud results.** Tapping "Couscous salad" gave the rejection
   "Couscous and cucumber? You call that a meal? Try it with some actual food."
   A preset the app offers must never be rejected. Check every preset in
   `apps/web/lib/presets.ts` (also seen: Quesadilla, Ramen and egg, Pesto pasta).
2. **The plan stutters as it streams in.** The page jumps while recipe and
   instruction content loads. The loading process needs smoothing out.
3. **The silly waiting sentences are gone.** `apps/web/lib/loading-messages.ts`
   was deleted in v0.9.0. The owner misses them and wants them back somewhere
   in the wait.

## Designer review findings (P3.1), 2026-10-13

A design review of v0.9.0, run locally at 375x812 on `gpt-4o`. Review only;
nothing was changed. Each line is a candidate change, most damaging first.
"From code" means read, not seen on screen.

**Bugs found on the way**

- Bricolage Grotesque never renders: `--font-bricolage` is defined on `<body>`
  (`layout.tsx:60`) but used at `:root` (`globals.css:45`), so headings are Inter.
  Move `bricolage.variable` to `<html>`.
- A stale `apps/web/.next` served the pre-rebrand stylesheet locally. Delete it
  and restart before judging the design.

**Owner note 1, dud presets.** The couscous rejection was not reproduced on
`gpt-4o` (4 plans of 4); production's `gpt-4o-mini` is the suspect, untested.

- `prompts/system.md:16` asks for a "witty one-line roast"; the persona is
  "slightly rebellious". Rewrite in plain words.
- `rejection` is the first field the model writes (`llm.py:90`) and the server
  honours it unchecked (`engine.py:241`). If any ingredient is a known food,
  never honour a rejection; retry once without the field.
- Rejections are cached for 30 days (`engine.py:317`). Never cache one.
- "Try it with some actual food." is hard-coded (`PlanView.tsx:113`). Delete it;
  show a plain message on the home screen with the chips still editable.
- Presets send only ingredients with the default form (30 min, hob and pan,
  umami), so cold dishes get pan-fried, oven dishes cannot use an oven, and the
  label is never sent (`HomeView.tsx:100`, `presets.ts`, `form.ts:15-23`).
  Preferred fix: presets become pre-made, owner-approved plans opened like the
  sample. Otherwise give each preset its own time, equipment and flavour.
- No eval covers "thin but real food must not be rejected", or any preset.
- "Surprise me" picks 3 random items of 20 (`challenges.ts`); it produced lentil
  and oat porridge with cabbage. Remove it or curate the sets.

**Owner note 2, stutter.** Layout shift measured 0.35 on first generation and
0.48 on regenerate (over 0.25 is poor).

- Nothing is reserved during the 1 to 7 second wait (`PlanView.tsx:154-170`).
- The title card grows as the title wraps (`PlanView.tsx:161`).
- Timeline, "What you need" and "Steps" all appear at once on the first step
  (`PlanView.tsx:181, 202, 208`).
- The timeline adds a lane for half-written ingredient names and resizes earlier
  blocks on every step (`timeline.ts:24-51`, `plan.ts:30`).
- On the final event the plan jumps 106px: "Start cooking" is inserted above the
  timeline (`PlanView.tsx:172-179`) and "What you need" regroups.
- Regenerate and follow-up collapse the page to a near-empty plan and rebuild
  (`page.tsx:163-166, 218, 322`).
- Target design: a full-height skeleton on tap; every section present from the
  first frame and filled in place; "Start cooking" always rendered, disabled
  until final; timeline lanes drawn from the requested ingredients; steps
  append-only; the old plan dimmed until the new one is ready. Nothing above the
  line being written may move.

**Owner note 3, waiting sentences.** Bring them back in one place: the empty
title slot before the first token, at reduced opacity, starting after about
600ms, stopping for good when the first title character arrives. Not in the
button label, where they used to be. Keep the dry ones.

**Other must-fix**

- No quantities and no servings. Add `serves` and `ingredients: [{name, amount}]`
  to the schema (`llm.py`) and show them before the steps (`PlanView.tsx:51-78`).
- Cook mode (`CookMode.tsx`): the whole middle of the screen is "Next" (213-230);
  steps auto-advance on the model's invented times (101); closing loses your
  place (77-82); in light theme the timeline renders wrong on the dark screen
  (`Timeline.tsx:33`); step text and countdown are too small.
- "A cook mode that talks you through it" is false: there is no speech
  (`HomeView.tsx:43-44`, `layout.tsx:24, 27, 33`). Add speech or change the line.
- A full phone screen of chrome before the first instruction
  (`PlanView.tsx:127-235`). Compact title card, then ingredients, then steps;
  "Start cooking" as a sticky bottom bar.
- Preferences, including diet, are not persisted (from code: `page.tsx:76`); the
  only way in is a 51x20px "Change" link; skill level lives in Settings.

**Should-fix**

- Defaults leak into every plan: every title began "Umami"; "hob, pan" rules out
  the oven; the headline minutes disagree with the timeline (`timeline.ts:24-27`).
- The timeline at 375px: an 88px label column, staples taking lanes, no tap on
  the plan screen (`PlanView.tsx:183`).
- The plan is lost on reload and Save is at the bottom (from code:
  `page.tsx:92`, `PlanView.tsx:287`).
- Home: a four-line lede before the input; the main button looks enabled with no
  ingredients; presets reshuffle on every load and overwrite what was typed; the
  sample plan is below the fold.
- Errors are vanishing toasts; the rate-limit copy says "today" for an hourly
  limit (`api.ts:29`).
- Tap targets under 44px nearly everywhere (`ui.tsx:12, 25`).

**Polish**

- Settings was not redesigned (`SettingsPanel.tsx`): shadow, Title Case, raw colours.
- Vermilion is also on the focus ring, bullets and countdown, while "Start
  cooking", the real main action, is ink (`PlanView.tsx:175`).
- `stone-500` small labels are about 4.45:1; share text is "Check out this
  recipe:"; `theme-color` is fixed dark; "How this was generated" is a card.

**Not checked:** production and `gpt-4o-mini`; a real phone; the share poster,
Settings, Saved, About, the preferences sheet, error states and the follow-up
flow on screen; dark mode beyond the top of the plan screen.

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
