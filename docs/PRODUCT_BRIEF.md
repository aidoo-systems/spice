# Product Brief

Last updated: 2026-10-13
Status: Accepted

Every claim is marked **fact** (evidenced), **assumption** (believed, untested)
or **preference** (a choice, not a truth).

## Vision

For someone looking at a near-empty kitchen: a meal they can actually cook
tonight from what they have, with timings and a cook mode that walks them
through it. It is also ai.doo's public proof that it builds AI features you can
trust. **When the two conflict, the cook wins** (preference, D-001).

## Problem

- "What can I make with this?" usually ends in a takeaway or a recipe that needs
  three things you don't have. (assumption)
- AI recipe tools invent ingredients, ignore the diet you gave them and present
  a guess as a fact. (assumption, from the owner's experience of them)
- People evaluating ai.doo have nothing public to try that shows how it handles
  model output it doesn't trust. (fact: the rest of the suite is self-hosted)

## Target users, and explicitly, non-users

- **The cook:** an ordinary home cook with a few ingredients, on a phone, in the
  kitchen, with 15 to 30 minutes.
- **The evaluator:** someone deciding whether ai.doo can build an AI feature
  properly. They read "How this was generated" and the README.
- **Not for:** people who want a recipe library to browse, meal-prep planners,
  professional kitchens, or anyone who needs medical-grade allergy or nutrition
  advice.

## Jobs to be done

1. Turn what I have into one dish I can finish in the time I've got.
2. Tell me what to do and when, so I'm not reading a paragraph with wet hands.
3. Let me change it ("no garlic", "for 4") without starting again.
4. Show me why I should believe it.

## Value proposition

A plan that is checked on the server before it is shown: steps in order and
inside the time limit, every ingredient traced to the user's list, pantry or
basic staples, and the diet enforced. The checks are visible, not implied.

## Product principles

- **The cook wins.** If it would not help someone make dinner, it does not go in.
- **Claim only what ships.** "Cooked N times" counts finished cooks, never generations.
- **Checked, then shown.** No plan reaches the screen as final without the server checks.
- **One signature visual.** The timeline. New plan features reuse it.
- **No account, no tracking of people.** State lives in the browser.

## Core user loop

Enter ingredients → watch the plan stream in → read the timeline → start cook
mode → finish → say how it went. The rating changes the next plan for those
ingredients.

## MVP must-have

Shipped as of v0.9.0 (fact, `CHANGELOG.md`): streamed plans, server checks,
follow-ups with undo, cook mode, the timeline, share poster, ratings, demo mode
without a key, rate limits and a daily model-call cap.

## Explicitly out of scope

- **Accounts and server-side user data.** Pantry, saved recipes and ratings stay
  in the browser; the server keeps anonymous counts per ingredient combination.
- **Suite integration.** No Hub auth, and no requirement to run on the suite's
  Ollama. SPICE is a standalone public demo on a hosted model.

**Undecided, not ruled out:** weekly meal planning and a native app. The owner
declined to make either a non-goal (D-003). Neither is on the roadmap.

## Success measures and guardrails

| Measure | How it is known | Who judges |
|---|---|---|
| A plan is safe to show | Server checks pass; eval pass rate at least 90% in CI | machine |
| A dish is worth cooking | Someone cooks it | owner |
| It looks and feels right | Use on a phone | owner |
| It stays cheap | `DAILY_LLM_CAP`, per-IP limits, generation cache | machine |

There is no usage target. Do not invent one.

## Assumptions and the cheapest test for each

| Assumption | Cheapest test |
|---|---|
| Plans that pass the checks are also good to eat | The owner cooks three plans from real leftovers |
| The eval set represents what real users type | Compare `cases.json` with a week of anonymous combination signatures |
| Evaluators notice and value the visible checks | Show the plan screen to two people cold and ask what they'd trust |
| `gpt-4o-mini` in production is good enough | Run the evals on both models and compare failures |

## Business or sustainability model

None. It is a showcase paid for by ai.doo. The only running cost is the model,
bounded by the daily cap.

## Risks

- A confidently wrong plan (undercooked chicken, an allergen) is worse here than
  in most demos. The checks reduce it; they do not remove it.
- The public endpoint spends real money. The limits are the only defence.
- The two audiences pull apart. D-001 settles which wins; expect to apply it.

## Evidence and source links, with checked dates

- `README.md`, `CHANGELOG.md`: what ships (checked 2026-10-13).
- Owner interview, 2026-10-13: promise, tie-break, non-goals, next outcomes.
