"use client";

import { useState, type ReactNode, type RefObject } from "react";
import type { CommunityStats as CommunityStatsType, SuggestResponse } from "@/lib/types";
import { flavourLabel } from "@/lib/form";
import { fmtClock } from "@/lib/timeline";
import { normalizeIngredient } from "@/lib/feedback";
import CookMode from "./CookMode";
import Timeline from "./Timeline";
import UpgradeLadderUI from "./UpgradeLadderUI";
import FeedbackButtons from "./FeedbackButtons";
import ShareCard from "./ShareCard";
import CommunityStats from "./CommunityStats";
import GenerationDetails from "./GenerationDetails";
import FollowupBox from "./FollowupBox";
import { Icon } from "./icons";

interface Props {
  plan: SuggestResponse;
  streaming: boolean;
  busy: boolean;
  /** Ingredients the plan was asked for (empty for saved recipes and the sample). */
  fromIngredients: string[];
  community: CommunityStatsType | null;
  onCommunityUpdate: (c: CommunityStatsType) => void;
  signature: string;
  cooked: boolean;
  onCooked: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Follow-ups and regenerate need the original request. */
  canFollowup: boolean;
  onAsk: (question: string) => void;
  onRegenerate: () => void;
  canUndo: boolean;
  onUndo: () => void;
  onBack: () => void;
  /** Shown above the title, e.g. "A plan we made earlier". */
  kicker?: string;
}

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="pt-8 mt-8 border-t border-stone-200 dark:border-line">
      <h3 className="font-display text-xl font-semibold tracking-tight mb-4">{title}</h3>
      {children}
    </section>
  );
}

/** What the steps need, grouped by where it comes from. */
function NeedList({ plan }: { plan: SuggestResponse }) {
  const g = plan.meta?.grounding;
  const used = [...new Set(plan.steps.flatMap((s) => (s.uses ?? []).map(normalizeIngredient)).filter(Boolean))];
  if (!g && used.length === 0) return null;

  const groups: { label: string; items: string[]; tone: string }[] = g
    ? [
        { label: "From your list", items: g.from_ingredients, tone: "" },
        { label: "From your pantry", items: g.from_pantry, tone: "" },
        { label: "Basics", items: g.staples, tone: "text-stone-500 dark:text-muted" },
        { label: "You may need", items: g.flagged_missing, tone: "text-stone-500 dark:text-muted" },
        { label: "Not on your list", items: g.unlisted, tone: "text-amber-800 dark:text-amber-300" },
      ]
    : [{ label: "Ingredients", items: used, tone: "" }];

  return (
    <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
      {groups
        .filter((x) => x.items.length > 0)
        .map((x) => (
          <div key={x.label}>
            <dt className="text-sm text-stone-500 dark:text-dim">{x.label}</dt>
            <dd className={`text-base ${x.tone}`}>{x.items.join(", ")}</dd>
          </div>
        ))}
    </dl>
  );
}

export default function PlanView(props: Props) {
  const { plan, streaming, busy, community, cooked } = props;
  const [cooking, setCooking] = useState(false);
  const done = !streaming;
  const meta = plan.meta;
  const ingredientCount =
    props.fromIngredients.length || new Set(plan.steps.flatMap((s) => s.uses ?? []).map(normalizeIngredient)).size;
  const grounded = meta?.checks.find((c) => c.name === "grounding");
  const ladder = plan.upgrade_ladder;
  const hasUpgrades = ladder.pantry_upgrade.length + ladder.if_you_have.length > 0 || !!ladder.one_pound_shop;

  const nav = (
    <div className="flex items-center justify-between gap-3 mb-5">
      <button onClick={props.onBack} className="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-muted hover:text-stone-900 dark:hover:text-ink py-2">
        <Icon name="back" className="w-4 h-4" /> New plan
      </button>
      {props.canFollowup && (
        <button
          onClick={props.onRegenerate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-stone-300 dark:border-line hover:border-stone-500 dark:hover:border-muted disabled:opacity-40 transition-colors"
        >
          <Icon name="refresh" className="w-4 h-4" /> Try a different dish
        </button>
      )}
    </div>
  );

  if (plan.rejection) {
    return (
      <div className="max-w-3xl mx-auto">
        {nav}
        <p className="font-display text-3xl font-bold tracking-tight">{plan.rejection}</p>
        <p className="mt-3 text-stone-600 dark:text-muted">Try it with some actual food.</p>
      </div>
    );
  }

  const metaLine = [
    flavourLabel(plan.flavour_mode),
    plan.prep_time_minutes > 0 ? `about ${plan.prep_time_minutes} min` : null,
    ingredientCount ? `${ingredientCount} ingredients` : null,
    plan.calories_estimate ? `~${plan.calories_estimate} kcal` : null,
  ].filter(Boolean).join(" · ");

  return (
    <article className="max-w-3xl mx-auto">
      {nav}

      {props.fromIngredients.length > 0 && (
        <p className="text-sm text-stone-500 dark:text-muted mb-3">From {props.fromIngredients.join(", ")}</p>
      )}

      {meta?.mock && (
        <p role="status" className="text-sm text-stone-600 dark:text-muted mb-3">
          <strong className="text-stone-900 dark:text-ink">Demo mode.</strong> No model is connected, so this is one of
          a few sample plans played back as if it were being written. It wasn&rsquo;t made from your ingredients.
        </p>
      )}

      {plan.answer && (
        <div className="mb-3 flex items-start justify-between gap-3 text-base">
          <p>
            <span className="font-semibold">SPICE:</span> {plan.answer}
          </p>
          {props.canUndo && done && (
            <button onClick={props.onUndo} className="shrink-0 inline-flex items-center gap-1 text-sm underline underline-offset-4 text-stone-600 dark:text-muted hover:text-stone-900 dark:hover:text-ink">
              <Icon name="undo" className="w-3.5 h-3.5" /> Previous version
            </button>
          )}
        </div>
      )}

      {/* Title: SPICE's one loud surface */}
      <header className="rounded-3xl bg-spice-500 text-spice-950 p-6 sm:p-8">
        {props.kicker && <p className="text-sm font-semibold mb-2">{props.kicker}</p>}
        {streaming && (
          <p className="flex items-center gap-2 text-sm font-medium mb-2" role="status">
            <span className="w-2 h-2 rounded-full bg-spice-950 motion-safe:animate-pulse" /> Writing your plan…
          </p>
        )}
        <h2 ref={props.headingRef} tabIndex={-1} className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05] outline-none min-h-[2.25rem]">
          {plan.title || (streaming ? " " : "Untitled plan")}
        </h2>
        {metaLine && <p className="mt-3 text-base font-medium">{metaLine}</p>}
        {grounded && done && (
          <p className="mt-2 text-base" title={grounded.detail}>
            {grounded.passed ? "✓ Uses only what you have, plus water, salt, pepper and oil." : `Heads up: ${grounded.detail.toLowerCase()}.`}
          </p>
        )}
      </header>

      {done && plan.steps.length > 0 && (
        <button
          onClick={() => setCooking(true)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-stone-900 text-surface dark:bg-ink dark:text-surface-dark text-lg font-semibold hover:bg-black dark:hover:bg-white transition-colors"
        >
          <Icon name="play" className="w-5 h-5" /> Start cooking
        </button>
      )}

      {plan.steps.length > 0 && (
        <div className="mt-8">
          <Timeline steps={plan.steps} prepMinutes={plan.prep_time_minutes} />
        </div>
      )}

      {plan.minimal_rescue?.enabled && (
        <Section title={plan.minimal_rescue.rescue_line || "Rescue mode"}>
          {plan.minimal_rescue.flavour_hacks.length > 0 && (
            <ul className="space-y-1 list-disc pl-5">
              {plan.minimal_rescue.flavour_hacks.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          )}
          {plan.minimal_rescue.ask_for.length > 0 && (
            <p className="mt-2 text-stone-600 dark:text-muted">
              One more thing would help: <span className="text-stone-900 dark:text-ink font-medium">{plan.minimal_rescue.ask_for.join(" or ")}</span>
            </p>
          )}
        </Section>
      )}

      {plan.steps.length > 0 && (
        <Section title="What you need">
          <NeedList plan={plan} />
        </Section>
      )}

      {plan.steps.length > 0 && (
        <Section title="Steps">
          <ol className="space-y-5">
            {plan.steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-x-3">
                <span className="w-8 h-8 rounded-full border border-stone-300 dark:border-line grid place-items-center text-sm font-semibold tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs text-stone-500 dark:text-dim tabular-nums">at {fmtClock(step.t_seconds)}</p>
                  <p className="text-base sm:text-lg leading-snug">{step.instruction}</p>
                  {step.tip && <p className="mt-1 text-sm text-stone-600 dark:text-muted">{step.tip}</p>}
                </div>
              </li>
            ))}
          </ol>
          {plan.notes.length > 0 && (
            <ul className="mt-6 space-y-1 text-stone-600 dark:text-muted">
              {plan.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          {plan.safety.missing_ingredients.length > 0 && (
            <p className="mt-3 text-sm text-stone-500 dark:text-dim">
              Assumes you have {plan.safety.missing_ingredients.join(", ")}. {plan.safety.disclaimer}
            </p>
          )}
        </Section>
      )}

      {!!plan.adjustments?.length && (
        <Section title="Tuned to your feedback">
          <ul className="space-y-1">{plan.adjustments.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </Section>
      )}

      {plan.why_this_works.length > 0 && (
        <Section title="Why this works">
          <ul className="space-y-2">
            {plan.why_this_works.map((r, i) => (
              <li key={i} className="grid grid-cols-[1rem_1fr] gap-2">
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-spice-500" aria-hidden="true" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {hasUpgrades && (
        <Section title="Make it better">
          <UpgradeLadderUI ladder={ladder} />
        </Section>
      )}

      {done && props.canFollowup && (
        <Section title="Change something">
          <FollowupBox busy={busy} onAsk={props.onAsk} sampleIngredient={meta?.grounding.from_ingredients[0]} />
        </Section>
      )}

      {done && (
        <Section title="How was it?">
          <div className="flex flex-wrap items-center gap-2">
            <FeedbackButtons
              signature={props.signature}
              onCommunityUpdate={(breakdown, total) =>
                props.onCommunityUpdate({ cooked_count: community?.cooked_count ?? 0, feedback_breakdown: breakdown, total_feedback: total })
              }
            />
            <button
              onClick={props.onCooked}
              disabled={cooked}
              className="text-sm px-3 py-1.5 min-h-[36px] rounded-lg border border-stone-300 dark:border-line hover:border-stone-500 dark:hover:border-muted disabled:opacity-60 transition-colors"
            >
              {cooked ? "✓ Cooked" : "I cooked this"}
            </button>
          </div>
          {community && <CommunityStats stats={community} />}
          <div className="mt-5">
            <ShareCard result={plan} ingredientCount={ingredientCount} />
          </div>
        </Section>
      )}

      {done && meta && (
        <div className="mt-8">
          <GenerationDetails meta={meta} />
        </div>
      )}

      <CookMode
        open={cooking}
        title={plan.title}
        steps={plan.steps}
        prepMinutes={plan.prep_time_minutes}
        onClose={() => setCooking(false)}
        onFinish={props.onCooked}
        doneSlot={
          <FeedbackButtons
            signature={props.signature}
            tone="dark"
            onCommunityUpdate={(breakdown, total) =>
              props.onCommunityUpdate({ cooked_count: community?.cooked_count ?? 0, feedback_breakdown: breakdown, total_feedback: total })
            }
          />
        }
      />
    </article>
  );
}
