/** Helpers for rendering plans, including half-written ones mid-stream. */

import type { Step, SuggestResponse, Upgrade } from "./types";

type Partial = Record<string, unknown>;

const arr = <T>(v: unknown, keep: (x: unknown) => boolean = () => true): T[] =>
  Array.isArray(v) ? (v.filter(keep) as T[]) : [];
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const obj = (v: unknown): Partial => (v && typeof v === "object" && !Array.isArray(v) ? (v as Partial) : {});
const isStr = (x: unknown) => typeof x === "string" && x.length > 0;

function upgrade(v: unknown): Upgrade | null {
  const o = obj(v);
  return isStr(o.requires) ? { requires: str(o.requires), why: str(o.why), how: str(o.how) } : null;
}

/**
 * Turn a streamed snapshot (any subset of fields, possibly cut mid-array)
 * into a SuggestResponse the result view can render without guards.
 */
export function normalizePlan(p: Partial): SuggestResponse {
  const ladder = obj(p.upgrade_ladder);
  const rescue = obj(p.minimal_rescue);
  const safety = obj(p.safety);
  const steps: Step[] = arr<Partial>(p.steps, (s) => isStr(obj(s).instruction)).map((s) => ({
    t_seconds: typeof s.t_seconds === "number" ? s.t_seconds : 0,
    instruction: str(s.instruction),
    tip: isStr(s.tip) ? str(s.tip) : null,
    uses: arr<string>(s.uses, isStr),
  }));
  return {
    rejection: isStr(p.rejection) ? str(p.rejection) : null,
    answer: isStr(p.answer) ? str(p.answer) : null,
    title: str(p.title),
    prep_time_minutes: typeof p.prep_time_minutes === "number" ? p.prep_time_minutes : 0,
    calories_estimate: typeof p.calories_estimate === "number" ? p.calories_estimate : null,
    flavour_mode: (p.flavour_mode as SuggestResponse["flavour_mode"]) ?? null,
    steps,
    why_this_works: arr<string>(p.why_this_works, isStr),
    upgrade_ladder: {
      pantry_upgrade: arr<unknown>(ladder.pantry_upgrade).map(upgrade).filter((u): u is Upgrade => !!u),
      if_you_have: arr<unknown>(ladder.if_you_have).map(upgrade).filter((u): u is Upgrade => !!u),
      one_pound_shop: upgrade(ladder.one_pound_shop),
    },
    minimal_rescue: rescue.enabled === true
      ? {
          enabled: true,
          flavour_hacks: arr<string>(rescue.flavour_hacks, isStr),
          ask_for: arr<string>(rescue.ask_for, isStr),
          rescue_line: str(rescue.rescue_line),
        }
      : null,
    pantry_used: arr<string>(p.pantry_used, isStr),
    notes: arr<string>(p.notes, isStr),
    safety: {
      assumptions: arr<string>(safety.assumptions, isStr),
      missing_ingredients: arr<string>(safety.missing_ingredients, isStr),
      disclaimer: str(safety.disclaimer),
    },
    adjustments: arr<string>(p.adjustments, isStr),
    community: (p.community as SuggestResponse["community"]) ?? null,
    meta: (p.meta as SuggestResponse["meta"]) ?? null,
  };
}

export type IngredientSource = "list" | "pantry" | "staple" | "missing" | "unlisted";

/** Which bucket the server's grounding check put an ingredient in. */
export function sourceOf(item: string, plan: SuggestResponse): IngredientSource | null {
  const g = plan.meta?.grounding;
  if (!g) return null;
  const n = item.trim().toLowerCase().replace(/\s+/g, " ");
  if (g.from_ingredients.includes(n)) return "list";
  if (g.from_pantry.includes(n)) return "pantry";
  if (g.staples.includes(n)) return "staple";
  if (g.flagged_missing.includes(n)) return "missing";
  if (g.unlisted.includes(n)) return "unlisted";
  return null;
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
