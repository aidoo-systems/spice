"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { FeedbackType } from "@/lib/types";
import { saveFeedback } from "@/lib/feedback";
import { submitFeedback } from "@/lib/api";

const OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "too_salty", label: "Too salty" },
  { value: "too_bland", label: "Too bland" },
  { value: "perfect", label: "Perfect" },
  { value: "needs_spice", label: "Needs spice" },
];

interface Props {
  signature: string;
  onCommunityUpdate?: (breakdown: Record<string, number>, total: number) => void;
}

export default function FeedbackButtons({ signature, onCommunityUpdate }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (submitted) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-[rgba(245,245,245,0.4)] mb-2">How was it?</p>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            disabled={submitting}
            onClick={async () => {
              if (submitting) return;
              setSubmitting(true);
              saveFeedback(signature, opt.value);
              setSubmitted(true);
              toast.success(`Noted: ${opt.label}`);

              const res = await submitFeedback({
                combo_signature: signature,
                feedback_type: opt.value,
              });
              if (res && res.total_feedback > 0 && onCommunityUpdate) {
                onCommunityUpdate(res.feedback_breakdown, res.total_feedback);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-stone-500 dark:text-[rgba(245,245,245,0.5)] hover:text-stone-800 dark:hover:text-[#F5F5F5] hover:border-white/20 transition-colors duration-150 whitespace-nowrap disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
