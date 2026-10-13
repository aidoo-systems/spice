/** Shared TypeScript types for SPICE. Mirrors packages/shared/schemas.py. */

export type FlavourMode =
  | "bold_spicy"
  | "umami"
  | "comfort_rich"
  | "bright_fresh"
  | "clean_light";

export type SkillMode = "beginner" | "confident";

export type SpiceLevel = "mild" | "medium" | "hot";

export type FeedbackType = "too_salty" | "too_bland" | "perfect" | "needs_spice";

// ── Request ──────────────────────────────────────────────────────

export interface Constraints {
  diet?: string;
  time_minutes?: number;
  equipment?: string[];
  spice_level?: SpiceLevel;
  flavour_mode?: FlavourMode;
  skill_mode?: SkillMode;
}

export interface SuggestRequest {
  ingredients: string[];
  constraints?: Constraints;
  pantry_items?: string[];
  feedback_history?: FeedbackType[];
  /** Regenerate counter; part of the cache key so each regenerate is new. */
  variation?: number;
  /** Titles already shown for these inputs, so the model avoids repeats. */
  avoid_titles?: string[];
}

// ── Response ─────────────────────────────────────────────────────

export interface Step {
  t_seconds: number;
  instruction: string;
  tip?: string | null;
  /** Ingredients this step touches. */
  uses?: string[];
}

export interface Upgrade {
  requires: string;
  why: string;
  how: string;
}

export interface UpgradeLadder {
  pantry_upgrade: Upgrade[];
  if_you_have: Upgrade[];
  one_pound_shop: Upgrade | null;
}

export interface MinimalRescue {
  enabled: boolean;
  flavour_hacks: string[];
  ask_for: string[];
  rescue_line: string;
}

export interface Safety {
  assumptions: string[];
  missing_ingredients: string[];
  disclaimer: string;
}

export interface CommunityStats {
  /** Times someone actually finished cooking this combo. */
  cooked_count: number;
  feedback_breakdown: Record<string, number>;
  total_feedback: number;
}

export interface Grounding {
  from_ingredients: string[];
  from_pantry: string[];
  staples: string[];
  flagged_missing: string[];
  unlisted: string[];
}

export interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

export interface GenerationMeta {
  model: string;
  mock: boolean;
  cached: boolean;
  latency_ms: number;
  variation: number;
  grounding: Grounding;
  checks: Check[];
}

export interface SuggestResponse {
  rejection?: string | null;
  /** Follow-ups only: one-line reply to the user's question. */
  answer?: string | null;
  title: string;
  prep_time_minutes: number;
  calories_estimate?: number | null;
  flavour_mode?: FlavourMode | null;
  steps: Step[];
  why_this_works: string[];
  upgrade_ladder: UpgradeLadder;
  minimal_rescue?: MinimalRescue | null;
  pantry_used: string[];
  notes: string[];
  safety: Safety;
  adjustments?: string[];
  community?: CommunityStats | null;
  meta?: GenerationMeta | null;
}

// ── Follow-up ────────────────────────────────────────────────────

export interface FollowupRequest {
  request: SuggestRequest;
  plan: SuggestResponse;
  question: string;
}

// ── Feedback / cooked ────────────────────────────────────────────

export interface FeedbackRequest {
  combo_signature: string;
  feedback_type: FeedbackType;
}

export interface FeedbackResponse {
  status: string;
  feedback_breakdown: Record<string, number>;
  total_feedback: number;
}

export interface CookedResponse {
  cooked_count: number;
}
