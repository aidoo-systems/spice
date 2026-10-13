"""Generation pipeline shared by the JSON and streaming endpoints.

prepare_*() runs everything that can fail with a clean HTTP status (cache
lookup, daily budget) *before* a stream starts; run() then yields events:

    {"event": "partial", "data": {...}}   # best-effort snapshot while streaming
    {"event": "final",   "data": {...}}   # validated, sanitized SuggestResponse
    {"event": "error",   "data": {"status": int, "message": str}}
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from pydantic import ValidationError
from shared.schemas import (
    CommunityStats,
    FollowupRequest,
    GenerationMeta,
    SuggestRequest,
    SuggestResponse,
)

from spice import llm, prompts
from spice.checks import sanitize_and_check
from spice.db import (
    get_cached_generation,
    get_feedback_breakdown,
    make_combo_hash,
    normalize_ingredient,
    record_combo,
    reserve_llm_call,
    store_generation,
)
from spice.mocks import pick_mock
from spice.partial_json import parse_partial

logger = logging.getLogger("spice.engine")

_FEEDBACK_GUIDANCE = {
    "too_salty": "Previous result was too salty: less seasoning, salt late, more water.",
    "too_bland": "Previous result was too bland: bloom spices harder, concentrate, add umami if available.",
    "needs_spice": "User wants more heat: chilli bloom, pepper, hot sauce (only if available).",
    "perfect": "Previous result was perfect: keep a similar approach.",
}

_MAX_PLAN_CHARS = 15000
_PARTIAL_EVERY_S = 0.08


class BudgetExceeded(Exception):
    """Today's live-model budget is spent."""


class GenerationError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


@dataclass
class Job:
    req: SuggestRequest
    cache_key: str
    messages: list[dict] = field(default_factory=list)
    temperature: float = 0.7
    cached: str | None = None
    mock: SuggestResponse | None = None


# ── Prompt building ──────────────────────────────────────────────


def _fields(req: SuggestRequest) -> dict[str, str]:
    c = req.constraints
    return {
        "ingredients": ", ".join(req.ingredients),
        "pantry_items": ", ".join(req.pantry_items) or "none",
        "diet": c.diet or "any",
        "time_minutes": str(c.time_minutes or 30),
        "equipment": ", ".join(c.equipment) or "any",
        "spice_level": c.spice_level or "medium",
        "flavour_mode": c.flavour_mode or "umami",
        "skill_mode": c.skill_mode or "beginner",
    }


def build_suggest_messages(req: SuggestRequest) -> list[dict]:
    feedback = (
        "; ".join(_FEEDBACK_GUIDANCE[f] for f in dict.fromkeys(req.feedback_history))
        or "none"
    )
    variation = ""
    if req.variation:
        avoid = "; ".join(req.avoid_titles) or "the previous suggestion"
        variation = f"**Regenerate #{req.variation}:** make a clearly different dish from: {avoid}."
    user = prompts.SUGGEST.format(
        **_fields(req), feedback=feedback, variation=variation
    )
    return [
        {"role": "system", "content": prompts.SYSTEM},
        {"role": "user", "content": user},
    ]


def _plan_for_prompt(plan: SuggestResponse) -> str:
    return plan.model_dump_json(
        exclude={"community", "meta", "answer"}, exclude_none=True
    )


def build_followup_messages(f: FollowupRequest) -> list[dict]:
    user = prompts.FOLLOWUP.format(
        **_fields(f.request), plan=_plan_for_prompt(f.plan), question=f.question
    )
    return [
        {"role": "system", "content": prompts.SYSTEM},
        {"role": "user", "content": user},
    ]


# ── Cache keys ───────────────────────────────────────────────────


def cache_key(req: SuggestRequest) -> str:
    """Deterministic key over every input that affects a generation —
    including `variation`, so Regenerate never replays the cached plan."""
    payload = {
        "ingredients": sorted(normalize_ingredient(i) for i in req.ingredients),
        "diet": req.constraints.diet,
        "time_minutes": req.constraints.time_minutes,
        "equipment": sorted(normalize_ingredient(e) for e in req.constraints.equipment),
        "spice_level": req.constraints.spice_level,
        "flavour_mode": req.constraints.flavour_mode,
        "skill_mode": req.constraints.skill_mode,
        "pantry_items": sorted(normalize_ingredient(p) for p in req.pantry_items),
        "feedback_history": sorted(req.feedback_history),
        "variation": req.variation,
        "avoid_titles": sorted(t.lower() for t in req.avoid_titles),
        "model": llm.model_name(),
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode()).hexdigest()


def _followup_key(f: FollowupRequest) -> str:
    blob = (
        cache_key(f.request)
        + "|"
        + _plan_for_prompt(f.plan)
        + "|"
        + " ".join(f.question.lower().split())
    )
    return "f:" + hashlib.sha256(blob.encode()).hexdigest()


# ── Preparation ──────────────────────────────────────────────────


def _daily_cap() -> int:
    return int(os.environ.get("DAILY_LLM_CAP", "1000"))


def _reserve_or_raise() -> None:
    if not reserve_llm_call(_daily_cap()):
        raise BudgetExceeded()


def prepare_suggest(req: SuggestRequest) -> Job:
    job = Job(req=req, cache_key=cache_key(req))
    if not llm.is_live():
        job.mock = pick_mock(req)
        return job
    job.cached = get_cached_generation(job.cache_key)
    if job.cached is None:
        _reserve_or_raise()
        job.messages = build_suggest_messages(req)
        job.temperature = 0.7 if req.variation == 0 else 0.9
    return job


def prepare_followup(f: FollowupRequest) -> Job:
    if len(_plan_for_prompt(f.plan)) > _MAX_PLAN_CHARS:
        raise GenerationError(422, "Plan is too large for a follow-up.")
    job = Job(req=f.request, cache_key=_followup_key(f))
    if not llm.is_live():
        mock = f.plan.model_copy(deep=True)
        mock.answer = "Demo mode: connect a model API key and SPICE will rewrite the plan for this."
        mock.community = None
        mock.meta = None
        job.mock = mock
        return job
    job.cached = get_cached_generation(job.cache_key)
    if job.cached is None:
        _reserve_or_raise()
        job.messages = build_followup_messages(f)
        job.temperature = 0.4
    return job


# ── Running ──────────────────────────────────────────────────────


def _finalize(
    job: Job, resp: SuggestResponse, *, cached: bool, started: float
) -> SuggestResponse:
    req = job.req
    resp.flavour_mode = req.constraints.flavour_mode or resp.flavour_mode
    resp, grounding, checks = sanitize_and_check(resp, req)
    resp.meta = GenerationMeta(
        model="demo (no API key)" if job.mock else llm.model_name(),
        mock=job.mock is not None,
        cached=cached,
        latency_ms=round((time.monotonic() - started) * 1000),
        variation=req.variation,
        grounding=grounding,
        checks=checks,
    )
    if not resp.rejection:
        # Record that the combo exists (so it can be rated / marked cooked)
        # and attach the community numbers. Neither is part of the cache.
        sig, h = make_combo_hash(req.ingredients, req.constraints.flavour_mode)
        cooked = record_combo(sig, h)
        breakdown, total = get_feedback_breakdown(h)
        resp.community = CommunityStats(
            cooked_count=cooked, feedback_breakdown=breakdown, total_feedback=total
        )
    return resp


def _from_draft(data: dict) -> SuggestResponse:
    draft = llm.RecipeDraft.model_validate(data)
    if draft.rejection:
        return SuggestResponse(rejection=draft.rejection)
    payload = draft.model_dump()
    if payload["minimal_rescue"] and not payload["minimal_rescue"]["enabled"]:
        payload["minimal_rescue"] = None
    return SuggestResponse.model_validate(payload)


async def _mock_text(resp: SuggestResponse, delay: float) -> AsyncIterator[str]:
    """Replay a canned plan as a token stream, so demo mode streams like live."""
    text = resp.model_dump_json(exclude={"community", "meta"})
    size = 24
    for i in range(0, len(text), size):
        if delay:
            await asyncio.sleep(delay)
        yield text[i : i + size]


async def run(job: Job, *, stream: bool = True) -> AsyncIterator[dict]:
    started = time.monotonic()

    if job.cached is not None:
        resp = SuggestResponse.model_validate_json(job.cached)
        yield {
            "event": "final",
            "data": _finalize(job, resp, cached=True, started=started).model_dump(
                mode="json"
            ),
        }
        return

    if job.mock is not None:
        if stream:
            delay = float(os.environ.get("MOCK_STREAM_DELAY", "0.02"))
            async for snap in _snapshots(_mock_text(job.mock, delay)):
                yield snap
        resp = _finalize(
            job, job.mock.model_copy(deep=True), cached=False, started=started
        )
        yield {"event": "final", "data": resp.model_dump(mode="json")}
        return

    text = ""
    try:
        async with asyncio.timeout(float(os.environ.get("GENERATION_DEADLINE", "75"))):
            buf: list[str] = []

            async def collect() -> AsyncIterator[str]:
                async for delta in llm.stream_text(job.messages, job.temperature):
                    buf.append(delta)
                    yield delta

            if stream:
                async for snap in _snapshots(collect()):
                    yield snap
            else:
                async for _ in collect():
                    pass
            text = "".join(buf)
        resp = _from_draft(llm.extract_json(text))
    except TimeoutError:
        logger.warning("Generation timed out")
        yield _error(504, "SPICE took too long thinking about this one. Try again.")
        return
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.warning("Unparseable model output: %s; raw=%r", exc, text[:500])
        yield _error(502, "The model returned a plan SPICE couldn't read. Try again.")
        return
    except Exception:
        logger.exception("Generation failed")
        yield _error(
            502, "The recipe model is unavailable right now. Try again in a moment."
        )
        return

    # Cache the model output only — community/meta are per-request.
    store_generation(job.cache_key, resp.model_dump_json(exclude={"community", "meta"}))
    yield {
        "event": "final",
        "data": _finalize(job, resp, cached=False, started=started).model_dump(
            mode="json"
        ),
    }


async def _snapshots(deltas: AsyncIterator[str]) -> AsyncIterator[dict]:
    text = ""
    last_emit = 0.0
    last: dict | None = None
    async for delta in deltas:
        text += delta
        now = time.monotonic()
        if now - last_emit < _PARTIAL_EVERY_S:
            continue
        snap = parse_partial(text)
        if snap and snap != last:
            last, last_emit = snap, now
            yield {"event": "partial", "data": snap}


def _error(status: int, message: str) -> dict:
    return {"event": "error", "data": {"status": status, "message": message}}


async def run_to_response(job: Job) -> SuggestResponse:
    """Non-streaming helper: run the job and return the final plan or raise."""
    async for ev in run(job, stream=False):
        if ev["event"] == "final":
            return SuggestResponse.model_validate(ev["data"])
        if ev["event"] == "error":
            raise GenerationError(ev["data"]["status"], ev["data"]["message"])
    raise GenerationError(500, "No result produced.")
