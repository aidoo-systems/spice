"use client";

import { useState } from "react";
import type { FeedbackType } from "@/lib/types";
import { saveFeedback } from "@/lib/feedback";
import { submitFeedback } from "@/lib/api";

const OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "perfect", label: "Perfect" },
  { value: "too_salty", label: "Too salty" },
  { value: "too_bland", label: "Too bland" },
  { value: "needs_spice", label: "Needs more heat" },
];

interface Props {
  signature: string;
  onCommunityUpdate?: (breakdown: Record<string, number>, total: number) => void;
  /** "dark" for cook mode's full-screen done view. */
  tone?: "app" | "dark";
}

export default function FeedbackButtons({ signature, onCommunityUpdate, tone = "app" }: Props) {
  const [chosen, setChosen] = useState<FeedbackType | null>(null);
  const dark = tone === "dark";

  if (chosen) {
    return (
      <p className={dark ? "text-lg text-ink" : "text-sm text-stone-600 dark:text-muted py-1.5"} role="status">
        Thanks. The next plan for these ingredients will take that into account.
      </p>
    );
  }

  const btn = dark
    ? "text-lg px-5 min-h-[52px] rounded-xl border border-line text-ink hover:border-muted transition-colors"
    : "text-sm px-3 py-1.5 min-h-[36px] rounded-lg border border-stone-300 dark:border-line hover:border-stone-500 dark:hover:border-muted transition-colors";

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="How was it?">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={async () => {
            setChosen(opt.value);
            saveFeedback(signature, opt.value);
            const res = await submitFeedback({ combo_signature: signature, feedback_type: opt.value });
            if (res && res.total_feedback > 0) onCommunityUpdate?.(res.feedback_breakdown, res.total_feedback);
          }}
          className={btn}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
