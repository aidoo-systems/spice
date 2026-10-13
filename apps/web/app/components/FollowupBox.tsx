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
          className="flex-1 min-w-0 border border-stone-300 dark:border-line bg-white dark:bg-surface-dark-input rounded-xl px-4 py-3 text-base focus:outline-none focus:border-stone-500 dark:focus:border-muted"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          aria-label="Ask"
          className="px-4 rounded-xl border border-stone-300 dark:border-line text-stone-800 dark:text-ink hover:border-stone-500 dark:hover:border-muted disabled:opacity-40 transition-colors"
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
            className="text-sm px-3 py-1.5 min-h-[36px] rounded-lg border border-stone-300 dark:border-line text-stone-700 dark:text-muted hover:border-stone-500 dark:hover:border-muted hover:text-stone-900 dark:hover:text-ink disabled:opacity-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
