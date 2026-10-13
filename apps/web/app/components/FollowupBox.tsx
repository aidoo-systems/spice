"use client";

import { useState } from "react";
import { Icon } from "./icons";

interface Props {
  busy: boolean;
  /** An ingredient from the plan, for the "don't have it" suggestion. */
  sampleIngredient?: string;
  onAsk: (question: string) => void;
}

export default function FollowupBox({ busy, sampleIngredient, onAsk }: Props) {
  const [q, setQ] = useState("");

  const suggestions = [
    sampleIngredient ? `I don't have ${sampleIngredient} after all` : null,
    "Make it for 4 people",
    "Make it 10 minutes faster",
    "Make it spicier",
  ].filter((s): s is string => !!s);

  function submit(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    onAsk(text);
    setQ("");
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="flex gap-2"
      >
        <label htmlFor="followup" className="sr-only">Ask SPICE to change this plan</label>
        <input
          id="followup"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={200}
          placeholder="Missing something? Cooking for more? Ask…"
          className="flex-1 min-w-0 border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-surface-dark-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          aria-label="Ask"
          className="bg-amber-500 text-white px-3 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          <Icon name="send" />
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            disabled={busy}
            className="text-[11px] px-2.5 py-1 rounded-full border border-stone-300/70 dark:border-white/10 text-stone-500 dark:text-[rgba(245,245,245,0.6)] hover:border-amber-400/60 hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
