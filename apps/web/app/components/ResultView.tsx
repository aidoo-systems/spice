"use client";

import type { RefObject } from "react";
import type { CommunityStats as CommunityStatsType, SuggestResponse } from "@/lib/types";
import { fmtTime, sourceOf, type IngredientSource } from "@/lib/plan";
import CookMode from "./CookMode";
import UpgradeLadderUI from "./UpgradeLadderUI";
import WhyThisWorks from "./WhyThisWorks";
import FeedbackButtons from "./FeedbackButtons";
import ShareCard from "./ShareCard";
import CommunityStats from "./CommunityStats";
import GenerationDetails from "./GenerationDetails";
import FollowupBox from "./FollowupBox";
import { FLAVOUR_MODES } from "./InputsPanel";
import { Icon } from "./icons";
import { Card, Chip, SectionHeader } from "./ui";

const SOURCE_TONE: Record<IngredientSource, string> = {
  list: "bg-amber-100/80 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  pantry: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
  staple: "bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-[rgba(245,245,245,0.6)]",
  missing: "bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-[rgba(245,245,245,0.6)]",
  unlisted: "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300",
};

const SOURCE_TITLE: Record<IngredientSource, string> = {
  list: "From your ingredients",
  pantry: "From your pantry",
  staple: "Basic staple",
  missing: "SPICE flagged this as something you may need",
  unlisted: "Not in your list",
};

interface Props {
  plan: SuggestResponse;
  streaming: boolean;
  busy: boolean;
  ingredientCount: number;
  community: CommunityStatsType | null;
  onCommunityUpdate: (c: CommunityStatsType) => void;
  signature: string;
  cooked: boolean;
  onCooked: () => void;
  cookModeActive: boolean;
  onCookModeChange: (active: boolean) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Follow-ups need the original request; absent for saved recipes. */
  canFollowup: boolean;
  onAsk: (question: string) => void;
  canUndo: boolean;
  onUndo: () => void;
}

export default function ResultView(props: Props) {
  const { plan, streaming, busy, community, cooked, cookModeActive } = props;

  if (plan.rejection) {
    return (
      <Card>
        <div className="animate-fade-in-up text-center py-6">
          <p className="text-lg font-medium text-stone-600 dark:text-[#F5F5F5]">{plan.rejection}</p>
          <p className="text-sm text-stone-500 dark:text-[rgba(245,245,245,0.65)] mt-2">Try adding some actual food ingredients.</p>
        </div>
      </Card>
    );
  }

  const meta = plan.meta;
  const grounded = meta?.checks.find((c) => c.name === "grounding");
  const ladder = plan.upgrade_ladder;
  const hasUpgrades = ladder.pantry_upgrade.length + ladder.if_you_have.length > 0 || !!ladder.one_pound_shop;
  const done = !streaming;

  return (
    <div className="space-y-3">
      {meta?.mock && (
        <div role="status" className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-xs text-sky-800 dark:text-sky-200">
          <strong>Demo mode.</strong> No model API key is configured, so this is a canned sample plan (not built from your ingredients) replayed as a stream.
          Set <code>OPENAI_API_KEY</code> to cook for real.
        </div>
      )}

      {plan.answer && (
        <div className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <span className="font-semibold">SPICE:</span> {plan.answer}
          </p>
          {props.canUndo && done && (
            <button onClick={props.onUndo} className="shrink-0 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline">
              <Icon name="undo" className="w-3.5 h-3.5" /> Previous version
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <Card className="animate-fade-in-up">
        {streaming && (
          <p className="flex items-center gap-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 mb-2" role="status">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> SPICE is writing your plan…
          </p>
        )}
        <h2 ref={props.headingRef} tabIndex={-1} className="font-display text-xl sm:text-2xl font-bold outline-none leading-tight min-h-[1.75rem]">
          {plan.title || (streaming ? " " : "Untitled plan")}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {plan.flavour_mode && <Chip tone="amber">{FLAVOUR_MODES.find((fm) => fm.value === plan.flavour_mode)?.label ?? plan.flavour_mode}</Chip>}
          {plan.prep_time_minutes > 0 && <Chip>~{plan.prep_time_minutes} min</Chip>}
          <Chip>{props.ingredientCount} ingredients</Chip>
          {!!plan.calories_estimate && <Chip>~{plan.calories_estimate} cal</Chip>}
          {grounded && done && (
            <Chip tone={grounded.passed ? "green" : "warn"} title={grounded.detail}>
              {grounded.passed ? "✓ Only your ingredients" : "Uses extra ingredients"}
            </Chip>
          )}
        </div>

        {!!plan.adjustments?.length && (
          <div className="mt-3 rounded-lg bg-stone-50 dark:bg-white/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[rgba(245,245,245,0.45)] mb-0.5">Tuned to your feedback</p>
            <ul className="text-xs text-stone-600 dark:text-[rgba(245,245,245,0.75)] space-y-0.5">
              {plan.adjustments.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        {plan.pantry_used.length > 0 && (
          <p className="text-xs text-stone-500 dark:text-[rgba(245,245,245,0.6)] mt-2">Using pantry staples: {plan.pantry_used.join(", ")}</p>
        )}
        {community && done && <CommunityStats stats={community} />}
      </Card>

      {plan.minimal_rescue?.enabled && (
        <Card className="border-amber-200 dark:border-amber-700/50">
          <p className="font-medium text-amber-800 dark:text-amber-300 text-sm mb-2">{plan.minimal_rescue.rescue_line}</p>
          {plan.minimal_rescue.flavour_hacks.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Flavour Hacks</p>
              <ul className="space-y-0.5">
                {plan.minimal_rescue.flavour_hacks.map((h, i) => <li key={i} className="text-sm text-amber-700 dark:text-amber-300">{h}</li>)}
              </ul>
            </div>
          )}
          {plan.minimal_rescue.ask_for.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              If you have one more thing: <span className="font-medium">{plan.minimal_rescue.ask_for.join(" or ")}</span>
            </p>
          )}
        </Card>
      )}

      {done && plan.steps.length > 0 && (
        <Card>
          <SectionHeader>Cook Mode</SectionHeader>
          <CookMode steps={plan.steps} active={cookModeActive} onActiveChange={props.onCookModeChange} onFinish={props.onCooked} />
        </Card>
      )}

      {!cookModeActive && plan.steps.length > 0 && (
        <Card>
          <SectionHeader>Steps</SectionHeader>
          <ol className="space-y-2.5">
            {plan.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-amber-600 dark:text-amber-400 font-mono text-xs min-w-[3rem] pt-0.5">{fmtTime(step.t_seconds)}</span>
                <div className="min-w-0">
                  <span className="text-sm">{step.instruction}</span>
                  {step.tip && <p className="text-xs text-stone-500 dark:text-[rgba(245,245,245,0.6)] mt-0.5">{step.tip}</p>}
                  {!!step.uses?.length && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {step.uses.map((u) => {
                        const src = done ? sourceOf(u, plan) : null;
                        return (
                          <span
                            key={u}
                            title={src ? SOURCE_TITLE[src] : undefined}
                            className={`text-[10px] px-1.5 py-px rounded ${src ? SOURCE_TONE[src] : SOURCE_TONE.staple}`}
                          >
                            {u}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {plan.notes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-white/5">
              <SectionHeader>Notes</SectionHeader>
              <ul className="space-y-1">
                {plan.notes.map((n, i) => <li key={i} className="text-sm text-stone-500 dark:text-[rgba(245,245,245,0.65)]">{n}</li>)}
              </ul>
            </div>
          )}

          {plan.safety.missing_ingredients.length > 0 && (
            <p className="text-xs text-stone-500 dark:text-[rgba(245,245,245,0.55)] mt-3">
              Assumed available: {plan.safety.missing_ingredients.join(", ")}. {plan.safety.disclaimer}
            </p>
          )}
        </Card>
      )}

      {plan.why_this_works.length > 0 && (
        <Card>
          <SectionHeader>Why This Works</SectionHeader>
          <WhyThisWorks reasons={plan.why_this_works} />
        </Card>
      )}

      {hasUpgrades && (
        <Card>
          <SectionHeader>Upgrade Ladder</SectionHeader>
          <UpgradeLadderUI ladder={ladder} />
        </Card>
      )}

      {done && props.canFollowup && (
        <Card>
          <SectionHeader>Change something</SectionHeader>
          <FollowupBox busy={busy} onAsk={props.onAsk} sampleIngredient={meta?.grounding.from_ingredients[0]} />
        </Card>
      )}

      {done && (
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <FeedbackButtons
              signature={props.signature}
              onCommunityUpdate={(breakdown, total) =>
                props.onCommunityUpdate({ cooked_count: community?.cooked_count ?? 0, feedback_breakdown: breakdown, total_feedback: total })
              }
            />
            <button
              onClick={props.onCooked}
              disabled={cooked}
              className="text-xs px-3 py-1.5 rounded-full border border-emerald-400/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-60 transition-colors min-h-[36px]"
            >
              {cooked ? "✓ Cooked" : "I cooked this"}
            </button>
            <ShareCard result={plan} ingredientCount={props.ingredientCount} className="ml-auto shrink-0" />
          </div>
        </Card>
      )}

      {done && meta && <GenerationDetails meta={meta} />}
    </div>
  );
}
