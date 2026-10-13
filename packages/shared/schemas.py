"""Shared Pydantic models for SPICE API request/response."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

# ── Enums as literals ─────────────────────────────────────────────

FlavourMode = Literal[
    "bold_spicy", "umami", "comfort_rich", "bright_fresh", "clean_light"
]

SkillMode = Literal["beginner", "confident"]

SpiceLevel = Literal["mild", "medium", "hot"]

FeedbackType = Literal["too_salty", "too_bland", "perfect", "needs_spice"]

# Every free-text field that reaches the prompt is length-capped so a single
# request can't be inflated into an expensive (or prompt-stuffed) generation.
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
TitleText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]


# ── Request ───────────────────────────────────────────────────────

class Constraints(BaseModel):
    diet: Annotated[str, StringConstraints(strip_whitespace=True, max_length=30)] | None = None
    time_minutes: int | None = Field(default=None, ge=5, le=240)
    equipment: list[ShortText] = Field(default_factory=list, max_length=12)
    spice_level: SpiceLevel | None = None
    flavour_mode: FlavourMode | None = None
    skill_mode: SkillMode | None = None


class SuggestRequest(BaseModel):
    ingredients: list[ShortText] = Field(..., min_length=1, max_length=50)
    constraints: Constraints = Field(default_factory=Constraints)
    pantry_items: list[ShortText] = Field(default_factory=list, max_length=50)
    feedback_history: list[FeedbackType] = Field(default_factory=list, max_length=20)
    # Regenerate: bump `variation` and pass the titles already shown so the
    # model (and the cache) produce a genuinely different dish.
    variation: int = Field(default=0, ge=0, le=20)
    avoid_titles: list[TitleText] = Field(default_factory=list, max_length=5)


# ── Response ──────────────────────────────────────────────────────

class Step(BaseModel):
    t_seconds: int
    instruction: str
    tip: str | None = None
    # Ingredients this step touches — powers the grounding check in the UI.
    uses: list[str] = Field(default_factory=list)


class Upgrade(BaseModel):
    requires: str
    why: str
    how: str


class UpgradeLadder(BaseModel):
    pantry_upgrade: list[Upgrade] = Field(default_factory=list)
    if_you_have: list[Upgrade] = Field(default_factory=list)
    one_pound_shop: Upgrade | None = None


class MinimalRescue(BaseModel):
    enabled: bool = False
    flavour_hacks: list[str] = Field(default_factory=list)
    ask_for: list[str] = Field(default_factory=list)
    rescue_line: str = ""


class Safety(BaseModel):
    assumptions: list[str] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)
    disclaimer: str = "Adjust salt to taste."


class CommunityStats(BaseModel):
    # Times someone finished Cook Mode or tapped "I cooked this" — never
    # inflated by generations or regenerates.
    cooked_count: int = 0
    feedback_breakdown: dict[str, int] = Field(default_factory=dict)
    total_feedback: int = 0


class Grounding(BaseModel):
    """Where every ingredient the steps use came from."""

    from_ingredients: list[str] = Field(default_factory=list)
    from_pantry: list[str] = Field(default_factory=list)
    staples: list[str] = Field(default_factory=list)
    flagged_missing: list[str] = Field(default_factory=list)
    unlisted: list[str] = Field(default_factory=list)


class Check(BaseModel):
    name: str
    passed: bool
    detail: str = ""


class GenerationMeta(BaseModel):
    model: str
    mock: bool = False
    cached: bool = False
    latency_ms: int = 0
    variation: int = 0
    grounding: Grounding = Field(default_factory=Grounding)
    checks: list[Check] = Field(default_factory=list)


class SuggestResponse(BaseModel):
    rejection: str | None = None
    # Follow-ups only: a one-line reply to the user's question.
    answer: str | None = None
    title: str = ""
    prep_time_minutes: int = 0
    calories_estimate: int | None = None
    flavour_mode: FlavourMode | None = None
    steps: list[Step] = Field(default_factory=list)
    why_this_works: list[str] = Field(default_factory=list)
    upgrade_ladder: UpgradeLadder = Field(default_factory=UpgradeLadder)
    minimal_rescue: MinimalRescue | None = None
    pantry_used: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    safety: Safety = Field(default_factory=Safety)
    # How past taste feedback changed this plan, in plain words.
    adjustments: list[str] = Field(default_factory=list)
    community: CommunityStats | None = None
    meta: GenerationMeta | None = None


# ── Follow-up ────────────────────────────────────────────────────

class FollowupRequest(BaseModel):
    request: SuggestRequest
    plan: SuggestResponse
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


# ── Feedback / cooked ────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    combo_signature: Annotated[str, StringConstraints(max_length=4000)]
    feedback_type: FeedbackType


class FeedbackResponse(BaseModel):
    status: str = "ok"
    feedback_breakdown: dict[str, int] = Field(default_factory=dict)
    total_feedback: int = 0


class CookedRequest(BaseModel):
    combo_signature: Annotated[str, StringConstraints(max_length=4000)]


class CookedResponse(BaseModel):
    cooked_count: int = 0
