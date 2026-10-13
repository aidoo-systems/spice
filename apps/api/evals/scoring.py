"""Score a generated plan against an eval case.

Every non-rejection case must pass the server-side checks (timeline, time
budget, grounding, diet) and have a usable shape; cases can add their own
expectations under "expect".
"""

from __future__ import annotations

from dataclasses import dataclass

from shared.schemas import SuggestResponse


@dataclass
class Result:
    name: str
    passed: bool
    detail: str = ""


def _text(resp: SuggestResponse) -> str:
    return resp.model_dump_json(exclude={"meta", "community"}).lower()


def score(case: dict, resp: SuggestResponse) -> list[Result]:
    expect = case.get("expect", {})
    results: list[Result] = []

    want_rejection = expect.get("rejection")
    if want_rejection is not None:
        results.append(
            Result(
                "rejection",
                bool(resp.rejection) == want_rejection,
                f"rejection={resp.rejection!r}",
            )
        )
    if resp.rejection:
        return results or [
            Result("rejection", False, f"unexpected rejection: {resp.rejection}")
        ]

    results.append(Result("has_title", bool(resp.title.strip()), resp.title))
    results.append(
        Result("has_steps", len(resp.steps) >= 2, f"{len(resp.steps)} steps")
    )
    results.append(
        Result(
            "why_this_works",
            1 <= len(resp.why_this_works) <= 4,
            f"{len(resp.why_this_works)} reasons",
        )
    )
    results.append(
        Result(
            "steps_list_ingredients",
            all(s.uses for s in resp.steps),
            "every step lists `uses`",
        )
    )

    for check in resp.meta.checks if resp.meta else []:
        results.append(Result(f"check:{check.name}", check.passed, check.detail))

    if expect.get("minimal_rescue"):
        results.append(
            Result(
                "minimal_rescue",
                bool(resp.minimal_rescue and resp.minimal_rescue.enabled),
                "",
            )
        )
    if expect.get("adjustments"):
        results.append(
            Result("adjustments", bool(resp.adjustments), "; ".join(resp.adjustments))
        )
    if title := expect.get("not_title"):
        results.append(
            Result("not_title", resp.title.strip().lower() != title.lower(), resp.title)
        )
    text = _text(resp)
    for word in expect.get("forbid_text", []):
        results.append(Result(f"forbid:{word}", word.lower() not in text, ""))
    steps = " ".join(s.instruction + " " + " ".join(s.uses) for s in resp.steps).lower()
    for word in expect.get("forbid_in_steps", []):
        results.append(Result(f"forbid_in_steps:{word}", word.lower() not in steps, ""))
    return results
