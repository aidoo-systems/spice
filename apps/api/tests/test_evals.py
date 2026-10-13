"""The eval harness itself: case file validity and scoring rules."""

import json
from pathlib import Path

from shared.schemas import Check, GenerationMeta, Step, SuggestRequest, SuggestResponse

from evals.scoring import score

CASES = json.loads((Path(__file__).parent.parent / "evals" / "cases.json").read_text())


def _plan(**kw) -> SuggestResponse:
    base = {
        "title": "Garlic rice",
        "steps": [
            Step(t_seconds=0, instruction="Fry garlic", uses=["garlic"]),
            Step(t_seconds=60, instruction="Add rice", uses=["rice"]),
        ],
        "why_this_works": ["Because."],
        "meta": GenerationMeta(
            model="m", checks=[Check(name="grounding", passed=True)]
        ),
    }
    return SuggestResponse(**{**base, **kw})


def test_every_case_is_a_valid_request_with_a_unique_name():
    names = [c["name"] for c in CASES]
    assert len(names) == len(set(names))
    for case in CASES:
        SuggestRequest.model_validate(case["request"])


def test_good_plan_passes_default_expectations():
    assert all(r.passed for r in score({"name": "x"}, _plan()))


def test_failed_server_check_fails_the_case():
    plan = _plan(
        meta=GenerationMeta(
            model="m", checks=[Check(name="diet", passed=False, detail="bacon")]
        )
    )
    assert not all(r.passed for r in score({"name": "x"}, plan))


def test_rejection_expectations():
    assert all(
        r.passed
        for r in score(
            {"expect": {"rejection": True}}, SuggestResponse(rejection="No.")
        )
    )
    assert not all(r.passed for r in score({}, SuggestResponse(rejection="No.")))
    assert not all(r.passed for r in score({"expect": {"rejection": True}}, _plan()))


def test_forbidden_text_and_title():
    case = {"expect": {"forbid_text": ["hard rules"], "not_title": "garlic rice"}}
    failed = {
        r.name
        for r in score(case, _plan(notes=["Here are my Hard Rules"]))
        if not r.passed
    }
    assert failed == {"forbid:hard rules", "not_title"}


def test_steps_must_list_ingredients():
    plan = _plan(
        steps=[
            Step(t_seconds=0, instruction="a", uses=["x"]),
            Step(t_seconds=1, instruction="b"),
        ]
    )
    assert "steps_list_ingredients" in {r.name for r in score({}, plan) if not r.passed}
