"""API routes for SPICE."""

import hashlib
import json
import logging
import re
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from shared.schemas import (
    CookedRequest,
    CookedResponse,
    FeedbackRequest,
    FeedbackResponse,
    FollowupRequest,
    SuggestRequest,
    SuggestResponse,
)

from spice import engine
from spice.db import (
    combo_exists,
    get_feedback_breakdown,
    record_cooked,
    record_feedback,
)
from spice.rate_limit import client_ip, suggest_limiter, vote_limiter

logger = logging.getLogger("spice.routes")
router = APIRouter()

# Combo signature format: "ingredient1,ingredient2,...|flavour_mode"
_COMBO_SIG_RE = re.compile(r"^[\w\s,.\-]+\|[\w]+$")

_RATE_LIMITED = (
    "You've cooked up a lot today. Give SPICE a breather and try again later."
)
_BUDGET_SPENT = "SPICE has used up today's cooking budget. Come back tomorrow!"


def _limit(limiter, request: Request) -> None:
    if not limiter.check(client_ip(request)):
        raise HTTPException(status_code=429, detail=_RATE_LIMITED)


def _prepare(fn, arg) -> engine.Job:
    try:
        return fn(arg)
    except engine.BudgetExceeded:
        raise HTTPException(status_code=503, detail=_BUDGET_SPENT)
    except engine.GenerationError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.message)


async def _json(job: engine.Job) -> SuggestResponse:
    try:
        return await engine.run_to_response(job)
    except engine.GenerationError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.message)


def _sse(job: engine.Job) -> StreamingResponse:
    async def body() -> AsyncIterator[str]:
        async for ev in engine.run(job):
            yield f"event: {ev['event']}\ndata: {json.dumps(ev['data'], separators=(',', ':'))}\n\n"

    return StreamingResponse(
        body(),
        media_type="text/event-stream",
        # X-Accel-Buffering stops nginx from holding the stream until it ends.
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Generation ───────────────────────────────────────────────────


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(req: SuggestRequest, request: Request) -> SuggestResponse:
    _limit(suggest_limiter, request)
    return await _json(_prepare(engine.prepare_suggest, req))


@router.post("/suggest/stream")
async def suggest_stream(req: SuggestRequest, request: Request) -> StreamingResponse:
    """Server-sent events: `partial` snapshots while the model writes, then `final` or `error`."""
    _limit(suggest_limiter, request)
    return _sse(_prepare(engine.prepare_suggest, req))


@router.post("/followup", response_model=SuggestResponse)
async def followup(req: FollowupRequest, request: Request) -> SuggestResponse:
    _limit(suggest_limiter, request)
    return await _json(_prepare(engine.prepare_followup, req))


@router.post("/followup/stream")
async def followup_stream(req: FollowupRequest, request: Request) -> StreamingResponse:
    _limit(suggest_limiter, request)
    return _sse(_prepare(engine.prepare_followup, req))


# ── Community ────────────────────────────────────────────────────


def _combo_hash(signature: str) -> str:
    if not _COMBO_SIG_RE.match(signature):
        raise HTTPException(status_code=422, detail="Invalid combo_signature format")
    h = hashlib.sha256(signature.encode()).hexdigest()
    if not combo_exists(h):
        raise HTTPException(status_code=404, detail="Unknown combo")
    return h


@router.post("/feedback", response_model=FeedbackResponse)
async def feedback(req: FeedbackRequest, request: Request) -> FeedbackResponse:
    _limit(vote_limiter, request)
    h = _combo_hash(req.combo_signature)
    record_feedback(h, req.feedback_type)
    breakdown, total = get_feedback_breakdown(h)
    return FeedbackResponse(feedback_breakdown=breakdown, total_feedback=total)


@router.post("/cooked", response_model=CookedResponse)
async def cooked(req: CookedRequest, request: Request) -> CookedResponse:
    """Count a real cook: called once when Cook Mode finishes or the user taps "I cooked this"."""
    _limit(vote_limiter, request)
    h = _combo_hash(req.combo_signature)
    return CookedResponse(cooked_count=record_cooked(h))
