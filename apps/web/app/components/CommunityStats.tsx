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

  const ratings = Object.entries(stats.feedback_breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([key, pct]) => `${pct}% ${(LABELS[key] || key).toLowerCase()}`)
    .join(", ");

  return (
    <p className="text-sm text-stone-600 dark:text-muted mt-1">
      {cooked > 0 && <>Cooked {cooked} {cooked === 1 ? "time" : "times"} by SPICE users. </>}
      {stats.total_feedback > 0 && (
        <>
          Rated {ratings} ({stats.total_feedback} {stats.total_feedback === 1 ? "vote" : "votes"}).
        </>
      )}
    </p>
  );
}
