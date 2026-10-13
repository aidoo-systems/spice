"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

const POINTS: { title: string; body: string }[] = [
  {
    title: "Structured, streamed output",
    body: "The model writes to a strict JSON schema, and you see the plan appear as it is written. There's no free-text parsing and no “please fix your JSON” retry.",
  },
  {
    title: "Checked before you see it",
    body: "Every plan is checked on the server: steps in order and inside your time limit, only ingredients you have, and nothing that breaks your diet. Open “How this was generated” under any plan to see the results.",
  },
  {
    title: "It learns your taste",
    body: "Rate a dish “too salty” and the next plan for those ingredients changes. The plan tells you what changed.",
  },
  {
    title: "Ask follow-ups",
    body: "Out of garlic? Cooking for four? Ask, and SPICE rewrites the plan.",
  },
  {
    title: "Tested like software",
    body: "A fixed evaluation set runs the same checks on every change, so prompt or model updates can't quietly make plans worse.",
  },
];

export default function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="About SPICE"
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">An ai.doo demo</p>
            <h2 className="font-display text-2xl font-bold mt-1">About SPICE</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 min-w-[44px] min-h-[44px] grid place-items-center -mr-2 -mt-2"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4 text-sm">
          <p className="text-stone-600 dark:text-[rgba(245,245,245,0.75)]">
            SPICE turns whatever is in your kitchen into a timed, step-by-step meal plan. It was built by{" "}
            <a href="https://aidoo.biz" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">ai.doo</a>{" "}
            to show what a well-made AI feature looks like: fast, honest about what it did, and checked before it reaches you.
          </p>

          <ul className="space-y-3">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  <span className="font-semibold">{p.title}.</span>{" "}
                  <span className="text-stone-600 dark:text-[rgba(245,245,245,0.7)]">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-stone-500 dark:text-[rgba(245,245,245,0.55)]">
            Privacy: there are no accounts. Your pantry, saved recipes and ratings stay in this browser. The server keeps
            only anonymous counts per ingredient combination.
          </p>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 p-4">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Want something like this in your product?</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href="https://aidoo.biz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                Visit ai.doo
              </a>
              <a
                href="mailto:hello@aidoo.biz?subject=SPICE%20demo"
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-amber-400/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors"
              >
                hello@aidoo.biz
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
