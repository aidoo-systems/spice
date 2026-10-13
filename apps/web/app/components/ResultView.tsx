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
import { Card, SectionHeader } from "./ui";

const SOURCE_TONE: Record<IngredientSource, string> = {
  list: "bg-spice-100/80 dark:bg-spice-500/15 text-spice-800 dark:text-spice-300",
  pantry: "bg-stone-200 dark:bg-white/15 text-stone-800 dark:text-ink",
  staple: "bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-muted",
  missing: "bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-muted",
  unlisted: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
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
        <div className=" text-center py-6">
          <p className="text-lg font-medium text-stone-600 dark:text-ink">{plan.rejection}</p>
          <p className="text-sm text-stone-500 dark:text-muted mt-2">Try adding some actual food ingredients.</p>
        </div>
      </Card>
    );
  }

  const meta = plan.meta;
  const grounded = meta?.checks.find((c) => c.name === "grounding");
  const ladder = plan.upgrade_ladder;
  const hasUpgrades = ladder.pantry_upgrade.length + ladder.if_you_have.length > 0 || !!ladder.one_pound_shop;
  const done = !streaming;
  const hasCommunity = !!community && (community.cooked_count > 0 || community.total_feedback > 0);

  return (
    <div className="space-y-3">
      {meta?.mock && (
        <div role="status" className="rounded-2xl border border-dashed border-stone-300 dark:border-line px-5 py-3 text-sm text-stone-600 dark:text-muted">
          <strong className="text-stone-900 dark:text-ink">Demo mode.</strong> No model is connected, so this is one of
          a few sample plans played back as if it were being written. It wasn&rsquo;t made from your ingredients.
        </div>
      )}

      {plan.answer && (
        <div className="rounded-xl border border-spice-300/70 dark:border-spice-500/30 bg-spice-50 dark:bg-spice-500/10 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-spice-900 dark:text-spice-200">
            <span className="font-semibold">SPICE:</span> {plan.answer}
          </p>
          {props.canUndo && done && (
            <button onClick={props.onUndo} className="shrink-0 flex items-center gap-1 text-xs text-spice-700 dark:text-spice-300 hover:underline">
              <Icon name="undo" className="w-3.5 h-3.5" /> Previous version
            </button>
          )}
        </div>
      )}

      {/* Header: SPICE's colour, the way its card looks on aidoo.biz. */}
      <div className="rounded-2xl bg-spice-500 text-spice-950 p-5 sm:p-6">
        {streaming && (
          <p className="flex items-center gap-2 text-sm font-medium mb-2" role="status">
            <span className="w-2 h-2 rounded-full bg-spice-950 motion-safe:animate-pulse" /> Writing your plan…
          </p>
        )}
        <h2 ref={props.headingRef} tabIndex={-1} className="font-display text-2xl sm:text-3xl font-bold tracking-tight outline-none leading-tight min-h-[2rem]">
          {plan.title || (streaming ? "\u00a0" : "Untitled plan")}
        </h2>
        <p className="mt-2 text-sm font-medium">
          {[
            plan.flavour_mode ? FLAVOUR_MODES.find((fm) => fm.value === plan.flavour_mode)?.label ?? plan.flavour_mode : null,
            plan.prep_time_minutes > 0 ? `about ${plan.prep_time_minutes} min` : null,
            `${props.ingredientCount} ingredients`,
            plan.calories_estimate ? `~${plan.calories_estimate} kcal` : null,
          ].filter(Boolean).join(" · ")}
        </p>
        {grounded && done && (
          <p className="mt-3 text-sm" title={grounded.detail}>
            {grounded.passed ? "✓ Uses only what you have, plus water, salt, pepper and oil." : `Heads up: ${grounded.detail.toLowerCase()}.`}
          </p>
        )}
      </div>

      {(!!plan.adjustments?.length || plan.pantry_used.length > 0 || (done && hasCommunity)) && (
      <Card>
        {!!plan.adjustments?.length && (
          <div className="mb-2">
            <p className="text-sm font-semibold mb-0.5">Tuned to your feedback</p>
            <ul className="text-sm text-stone-600 dark:text-muted space-y-0.5">
              {plan.adjustments.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}

        {plan.pantry_used.length > 0 && (
          <p className="text-sm text-stone-600 dark:text-muted">Using pantry staples: {plan.pantry_used.join(", ")}</p>
        )}
        {community && done && <CommunityStats stats={community} />}
      </Card>
      )}

      {plan.minimal_rescue?.enabled && (
        <Card className="border-spice-200 dark:border-spice-700/50">
          <p className="font-medium text-spice-800 dark:text-spice-300 text-sm mb-2">{plan.minimal_rescue.rescue_line}</p>
          {plan.minimal_rescue.flavour_hacks.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-spice-600 dark:text-spice-400  mb-1">Flavour hacks</p>
              <ul className="space-y-0.5">
                {plan.minimal_rescue.flavour_hacks.map((h, i) => <li key={i} className="text-sm text-spice-700 dark:text-spice-300">{h}</li>)}
              </ul>
            </div>
          )}
          {plan.minimal_rescue.ask_for.length > 0 && (
            <p className="text-sm text-spice-700 dark:text-spice-300">
              If you have one more thing: <span className="font-medium">{plan.minimal_rescue.ask_for.join(" or ")}</span>
            </p>
          )}
        </Card>
      )}

      {done && plan.steps.length > 0 && (
        <Card>
          <SectionHeader>Cook mode</SectionHeader>
          <CookMode steps={plan.steps} active={cookModeActive} onActiveChange={props.onCookModeChange} onFinish={props.onCooked} />
        </Card>
      )}

      {!cookModeActive && plan.steps.length > 0 && (
        <Card>
          <SectionHeader>Steps</SectionHeader>
          <ol className="space-y-2.5">
            {plan.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-spice-600 dark:text-spice-400 font-mono text-xs min-w-[3rem] pt-0.5">{fmtTime(step.t_seconds)}</span>
                <div className="min-w-0">
                  <span className="text-sm">{step.instruction}</span>
                  {step.tip && <p className="text-xs text-stone-500 dark:text-muted mt-0.5">{step.tip}</p>}
                  {!!step.uses?.length && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {step.uses.map((u) => {
                        const src = done ? sourceOf(u, plan) : null;
                        return (
                          <span
                            key={u}
                            title={src ? SOURCE_TITLE[src] : undefined}
                            className={`text-xs px-1.5 py-px rounded-md ${src ? SOURCE_TONE[src] : SOURCE_TONE.staple}`}
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
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-line/60">
              <SectionHeader>Notes</SectionHeader>
              <ul className="space-y-1">
                {plan.notes.map((n, i) => <li key={i} className="text-sm text-stone-500 dark:text-muted">{n}</li>)}
              </ul>
            </div>
          )}

          {plan.safety.missing_ingredients.length > 0 && (
            <p className="text-xs text-stone-500 dark:text-dim mt-3">
              Assumed available: {plan.safety.missing_ingredients.join(", ")}. {plan.safety.disclaimer}
            </p>
          )}
        </Card>
      )}

      {plan.why_this_works.length > 0 && (
        <Card>
          <SectionHeader>Why this works</SectionHeader>
          <WhyThisWorks reasons={plan.why_this_works} />
        </Card>
      )}

      {hasUpgrades && (
        <Card>
          <SectionHeader>Make it better</SectionHeader>
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
              className="text-sm px-3 py-1.5 rounded-lg border border-emerald-600/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-60 transition-colors min-h-[36px]"
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
