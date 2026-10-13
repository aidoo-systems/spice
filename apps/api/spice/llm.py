"""Model client: strict structured output, streamed.

Works with any OpenAI-compatible endpoint. Set OPENAI_BASE_URL to point the
SDK at another provider (for example a local Ollama at
``http://localhost:11434/v1``) and OPENAI_MODEL to the model it serves.
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

load_dotenv()

DEFAULT_MODEL = "gpt-4o"
_client: AsyncOpenAI | None = None


def model_name() -> str:
    return os.environ.get("OPENAI_MODEL", DEFAULT_MODEL)


def is_live() -> bool:
    """True when a model endpoint is configured; otherwise SPICE runs in demo mode."""
    return bool(os.environ.get("OPENAI_API_KEY"))


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set")
        # One attempt, bounded: the route owns the overall deadline.
        _client = AsyncOpenAI(
            api_key=api_key,
            # docker compose passes unset vars as "", which the SDK would
            # otherwise take as the base URL.
            base_url=os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1",
            timeout=float(os.environ.get("LLM_TIMEOUT", "60")),
            max_retries=0,
        )
    return _client


# ── Output schema ────────────────────────────────────────────────
# What the model is allowed to write. Field order is the streaming order, so
# the title lands first and the steps render while the tail is still coming.


class DraftUpgrade(BaseModel):
    requires: str
    why: str
    how: str


class DraftStep(BaseModel):
    t_seconds: int
    instruction: str
    tip: str | None
    uses: list[str]


class DraftLadder(BaseModel):
    pantry_upgrade: list[DraftUpgrade]
    if_you_have: list[DraftUpgrade]
    one_pound_shop: DraftUpgrade | None


class DraftRescue(BaseModel):
    enabled: bool
    flavour_hacks: list[str]
    ask_for: list[str]
    rescue_line: str


class DraftSafety(BaseModel):
    assumptions: list[str]
    missing_ingredients: list[str]
    disclaimer: str


class RecipeDraft(BaseModel):
    rejection: str | None
    answer: str | None
    title: str
    prep_time_minutes: int
    calories_estimate: int | None
    adjustments: list[str]
    steps: list[DraftStep] = Field(default_factory=list)
    why_this_works: list[str]
    upgrade_ladder: DraftLadder
    minimal_rescue: DraftRescue | None
    pantry_used: list[str]
    notes: list[str]
    safety: DraftSafety


def strict_schema(model: type[BaseModel]) -> dict[str, Any]:
    """Convert a Pydantic schema into the subset strict structured output accepts:
    every object closed (additionalProperties false), every property required,
    and no defaults or titles."""

    def fix(node: Any) -> Any:
        if isinstance(node, dict):
            node = {
                # Property maps and $defs are keyed by field/model names
                # (one of which is "title"), so only their values are fixed.
                k: (
                    {name: fix(sub) for name, sub in v.items()}
                    if k in ("properties", "$defs")
                    else fix(v)
                )
                for k, v in node.items()
                if k not in ("default", "title")
            }
            if node.get("type") == "object" and "properties" in node:
                node["additionalProperties"] = False
                node["required"] = list(node["properties"].keys())
            return node
        if isinstance(node, list):
            return [fix(v) for v in node]
        return node

    return fix(model.model_json_schema())


RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "spice_plan",
        "strict": True,
        "schema": strict_schema(RecipeDraft),
    },
}


async def stream_text(messages: list[dict], temperature: float) -> AsyncIterator[str]:
    """Yield raw text deltas of a schema-constrained completion."""
    client = _get_client()
    stream = await client.chat.completions.create(
        model=model_name(),
        messages=messages,
        temperature=temperature,
        max_tokens=2500,
        response_format=RESPONSE_FORMAT,
        stream=True,
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


def extract_json(text: str) -> dict:
    """Parse the final model text. Strict mode returns bare JSON; the fence
    stripping is for OpenAI-compatible providers that don't enforce it."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text)
