"use client";

import type { GenerationMeta } from "@/lib/types";
import { Icon } from "./icons";

const CHECK_LABELS: Record<string, string> = {
  timeline: "Timeline",
  time_budget: "Time limit",
  grounding: "Ingredients",
  diet: "Diet",
  calories: "Calories",
};

const GROUPS: { key: keyof GenerationMeta["grounding"]; label: string; tone: string }[] = [
  { key: "from_ingredients", label: "From your list", tone: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  { key: "from_pantry", label: "From your pantry", tone: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { key: "staples", label: "Basic staples", tone: "bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-[rgba(245,245,245,0.7)]" },
  { key: "flagged_missing", label: "Flagged as missing", tone: "bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-[rgba(245,245,245,0.7)]" },
  { key: "unlisted", label: "Not in your list", tone: "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300" },
];

export function checksSummary(meta: GenerationMeta): { passed: number; total: number } {
  return { passed: meta.checks.filter((c) => c.passed).length, total: meta.checks.length };
}

export default function GenerationDetails({ meta }: { meta: GenerationMeta }) {
  const { passed, total } = checksSummary(meta);
  const speed = meta.cached ? "from cache" : `${(meta.latency_ms / 1000).toFixed(1)}s`;

  return (
    <details className="group rounded-xl border border-stone-200/80 dark:border-white/10 bg-surface-card dark:bg-surface-dark-card">
      <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-[rgba(245,245,245,0.6)]">
        <span className="font-semibold uppercase tracking-widest">How this was generated</span>
        <span className="truncate">
          {meta.model} · {speed} · {passed}/{total} checks passed
          <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
        </span>
      </summary>

      <div className="px-4 pb-4 space-y-4 text-sm">
        <p className="text-xs text-stone-500 dark:text-[rgba(245,245,245,0.6)] leading-relaxed">
          SPICE asks the model for a plan in a strict JSON schema and streams it to you as it is written.
          Before the plan is final, the server checks it: are the steps in order and inside your time limit,
          does every step use only ingredients you have, and does it fit your diet? Upgrades that break your
          diet are removed. The results are below, pass or fail.
        </p>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt className="text-stone-400 dark:text-[rgba(245,245,245,0.45)]">Model</dt>
          <dd>{meta.model}</dd>
          <dt className="text-stone-400 dark:text-[rgba(245,245,245,0.45)]">Response</dt>
          <dd>{meta.cached ? "Served from cache (same inputs were generated earlier)" : `Generated in ${speed}`}</dd>
          {meta.variation > 0 && (
            <>
              <dt className="text-stone-400 dark:text-[rgba(245,245,245,0.45)]">Attempt</dt>
              <dd>Regenerate #{meta.variation} (asked for a different dish)</dd>
            </>
          )}
        </dl>

        {meta.checks.length > 0 && (
          <ul className="space-y-1.5">
            {meta.checks.map((c) => (
              <li key={c.name} className="flex gap-2 items-start">
                <span
                  className={`mt-0.5 grid place-items-center w-4 h-4 rounded-full shrink-0 ${
                    c.passed ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                  }`}
                  aria-label={c.passed ? "passed" : "needs attention"}
                >
                  {c.passed ? <Icon name="check" className="w-3 h-3" strokeWidth={3} /> : <span className="text-[10px] font-bold leading-none">!</span>}
                </span>
                <span className="text-xs">
                  <span className="font-medium">{CHECK_LABELS[c.name] ?? c.name}:</span>{" "}
                  <span className="text-stone-500 dark:text-[rgba(245,245,245,0.65)]">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {GROUPS.some((g) => meta.grounding[g.key].length > 0) && (
          <div className="space-y-2">
            {GROUPS.filter((g) => meta.grounding[g.key].length > 0).map((g) => (
              <div key={g.key}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[rgba(245,245,245,0.45)] mb-1">{g.label}</p>
                <div className="flex flex-wrap gap-1">
                  {meta.grounding[g.key].map((item) => (
                    <span key={item} className={`text-[11px] px-2 py-0.5 rounded-full ${g.tone}`}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
