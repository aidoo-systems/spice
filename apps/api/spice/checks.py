"""Post-generation guardrails: sanitize model numbers and verify the plan.

Every plan carries the results in ``meta.checks`` / ``meta.grounding`` so the
UI can show what was verified instead of asking users to trust the model.
"""

from __future__ import annotations

import itertools
import re

from shared.schemas import Check, Grounding, SuggestRequest, SuggestResponse

from spice.db import normalize_ingredient

_MAX_CALORIES = 3000
_MIN_CALORIES = 10

# Assumed available in any kitchen; the prompt allows these without listing.
STAPLES = {
    "water",
    "salt",
    "pepper",
    "black pepper",
    "oil",
    "cooking oil",
    "vegetable oil",
    "olive oil",
    "ice",
}

_MEAT = {
    "beef",
    "pork",
    "chicken",
    "lamb",
    "bacon",
    "ham",
    "sausage",
    "turkey",
    "duck",
    "mince",
    "steak",
    "chorizo",
    "salami",
    "pepperoni",
    "spam",
    "gelatin",
    "lard",
    "prosciutto",
    "veal",
}
_FISH = {
    "fish",
    "tuna",
    "salmon",
    "sardine",
    "anchovy",
    "anchovies",
    "prawn",
    "shrimp",
    "cod",
    "mackerel",
    "crab",
    "fish sauce",
    "oyster sauce",
}
_ANIMAL = {
    "egg",
    "milk",
    "butter",
    "cheese",
    "cream",
    "yoghurt",
    "yogurt",
    "honey",
    "ghee",
    "parmesan",
    "mayonnaise",
    "mayo",
}

# Words that contain a forbidden term but aren't animal products.
_SAFE = (
    "peanut butter",
    "butter beans",
    "coconut milk",
    "oat milk",
    "soy milk",
    "almond milk",
    "eggplant",
    "vegan cheese",
    "vegan butter",
    "vegan mayo",
    "plant",
    "veggie sausage",
)

_FORBIDDEN = {
    "vegetarian": _MEAT | _FISH,
    "pescatarian": _MEAT,
    "vegan": _MEAT | _FISH | _ANIMAL,
}


def _variants(name: str) -> set[str]:
    n = normalize_ingredient(name)
    out = {n}
    for suffix in ("es", "s"):
        if n.endswith(suffix) and len(n) > len(suffix) + 2:
            out.add(n[: -len(suffix)])
    return out


def _matches(item: str, pool: list[str]) -> bool:
    """Loose ingredient match: plural-insensitive, and either name containing
    the other as a whole word ("garlic" ~ "garlic cloves", "soy" ~ "soy sauce")."""
    for a in _variants(item):
        for raw in pool:
            for b in _variants(raw):
                if (
                    a == b
                    or re.search(rf"\b{re.escape(a)}\b", b)
                    or re.search(rf"\b{re.escape(b)}\b", a)
                ):
                    return True
    return False


def diet_violations(text: str, diet: str | None) -> list[str]:
    forbidden = _FORBIDDEN.get((diet or "").strip().lower())
    if not forbidden:
        return []
    t = normalize_ingredient(text)
    for safe in _SAFE:
        t = t.replace(safe, " ")
    return sorted(w for w in forbidden if re.search(rf"\b{re.escape(w)}(e?s)?\b", t))


def ground(resp: SuggestResponse, req: SuggestRequest) -> Grounding:
    g = Grounding()
    seen: set[str] = set()
    for step in resp.steps:
        for raw in step.uses:
            item = normalize_ingredient(raw)
            if not item or item in seen:
                continue
            seen.add(item)
            if _matches(item, req.ingredients):
                g.from_ingredients.append(item)
            elif _matches(item, req.pantry_items):
                g.from_pantry.append(item)
            elif item in STAPLES or _matches(item, list(STAPLES)):
                g.staples.append(item)
            elif _matches(item, resp.safety.missing_ingredients):
                g.flagged_missing.append(item)
            else:
                g.unlisted.append(item)
    return g


def sanitize_and_check(
    resp: SuggestResponse, req: SuggestRequest
) -> tuple[SuggestResponse, Grounding, list[Check]]:
    """Clamp numbers, repair the timeline, drop diet-breaking upgrades, and
    report every check (passed or not) for the UI."""
    if resp.rejection:
        return resp, Grounding(), []

    checks: list[Check] = []
    max_time = req.constraints.time_minutes

    # Timeline: Cook Mode depends on steps being ordered and non-negative.
    steps = [s for s in resp.steps if s.instruction.strip()]
    for s in steps:
        s.t_seconds = max(0, s.t_seconds)
    reordered = any(a.t_seconds > b.t_seconds for a, b in itertools.pairwise(steps))
    steps.sort(key=lambda s: s.t_seconds)
    resp.steps = steps
    late = [s for s in steps if max_time and s.t_seconds >= max_time * 60]
    checks.append(
        Check(
            name="timeline",
            passed=bool(steps) and not late,
            detail=(
                "No steps returned"
                if not steps
                else f"{len(late)} step(s) start after your {max_time}-minute limit"
                if late
                else "Steps re-ordered by start time"
                if reordered
                else "Steps are in order and inside your time limit"
            ),
        )
    )

    # Time budget.
    clamped = False
    resp.prep_time_minutes = max(resp.prep_time_minutes, 0)
    if max_time and resp.prep_time_minutes > max_time:
        resp.prep_time_minutes = max_time
        clamped = True
    checks.append(
        Check(
            name="time_budget",
            passed=not clamped,
            detail=f"Model estimate was over {max_time} min; capped"
            if clamped
            else "Fits your time limit",
        )
    )

    # Calories: drop implausible numbers rather than show nonsense.
    if resp.calories_estimate is not None and not (
        _MIN_CALORIES <= resp.calories_estimate <= _MAX_CALORIES
    ):
        resp.calories_estimate = None
        checks.append(
            Check(name="calories", passed=False, detail="Implausible estimate removed")
        )

    # Grounding: every ingredient the steps use should come from somewhere.
    g = ground(resp, req)
    if not any(s.uses for s in steps):
        checks.append(
            Check(
                name="grounding",
                passed=False,
                detail="Steps didn't list their ingredients",
            )
        )
    else:
        checks.append(
            Check(
                name="grounding",
                passed=not g.unlisted,
                detail=(
                    "Uses ingredients you didn't list: " + ", ".join(g.unlisted)
                    if g.unlisted
                    else "Only uses your ingredients, pantry and basic staples"
                ),
            )
        )

    # Diet: filter upgrades that break it, flag steps that do.
    diet = req.constraints.diet
    if diet and diet.lower() in _FORBIDDEN:
        ladder = resp.upgrade_ladder
        removed = 0

        def ok(u) -> bool:
            return not diet_violations(f"{u.requires} {u.how}", diet)

        for attr in ("pantry_upgrade", "if_you_have"):
            kept = [u for u in getattr(ladder, attr) if ok(u)]
            removed += len(getattr(ladder, attr)) - len(kept)
            setattr(ladder, attr, kept)
        if ladder.one_pound_shop and not ok(ladder.one_pound_shop):
            ladder.one_pound_shop = None
            removed += 1

        step_text = " ".join(
            [resp.title] + [s.instruction + " " + " ".join(s.uses) for s in steps]
        )
        bad = diet_violations(step_text, diet)
        detail = f"Mentions {', '.join(bad)}" if bad else f"Fits {diet}"
        if removed:
            detail += f"; removed {removed} upgrade(s) that didn't"
        checks.append(Check(name="diet", passed=not bad, detail=detail))

    return resp, g, checks
