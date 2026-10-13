"use client";

import type { CommunityStats as Stats } from "@/lib/types";

const LABELS: Record<string, string> = {
  perfect: "Perfect",
  too_salty: "Too salty",
  too_bland: "Too bland",
  needs_spice: "Needs spice",
};

interface Props {
  stats: Stats;
}

export default function CommunityStats({ stats }: Props) {
  const cooked = stats.cooked_count ?? 0;
  if (cooked === 0 && stats.total_feedback === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {cooked > 0 && (
        <p className="text-[10px] text-stone-400 dark:text-[rgba(245,245,245,0.4)]">
          Cooked {cooked} {cooked === 1 ? "time" : "times"} by SPICE users
        </p>
      )}
      {stats.total_feedback > 0 && (
        <div>
          <p className="text-[10px] text-stone-400 dark:text-[rgba(245,245,245,0.35)] mb-1">
            Combo ratings
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.feedback_breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([key, pct]) => (
                <span
                  key={key}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-[rgba(245,245,245,0.5)]"
                >
                  {pct}% {LABELS[key] || key}
                </span>
              ))}
            <span className="text-[10px] text-stone-400 dark:text-[rgba(245,245,245,0.3)] self-center">
              ({stats.total_feedback} {stats.total_feedback === 1 ? "vote" : "votes"})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
