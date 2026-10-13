"use client";

import { useEffect, useRef } from "react";
import { AidooWordmark } from "./AidooMark";
import { Icon } from "./icons";

const POINTS: { title: string; body: string }[] = [
  {
    title: "You watch it write",
    body: "The plan arrives a line at a time, in a fixed recipe format, so it can't wander off into an essay.",
  },
  {
    title: "We check it before it's done",
    body: "Steps in order, inside your time, only what you said you have (plus water, salt, pepper and oil), and nothing that breaks your diet. “How this was generated” under each plan shows what passed and what didn't.",
  },
  {
    title: "It remembers how it went",
    body: "Tell it a dish was too salty and the next plan for those ingredients changes. It says what it changed.",
  },
  {
    title: "You can argue with it",
    body: "Out of garlic? Cooking for four? Ask, and it rewrites the plan. You can go back if you preferred the first one.",
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
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="About SPICE"
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-surface-card dark:bg-surface-dark-card border border-stone-200 dark:border-line"
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">About SPICE</h2>
            <p className="mt-1 text-stone-600 dark:text-muted">
              by <AidooWordmark />
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="text-stone-500 dark:text-muted hover:text-stone-900 dark:hover:text-ink min-w-[44px] min-h-[44px] grid place-items-center -mr-2 -mt-2"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <p className="text-stone-700 dark:text-ink leading-relaxed">
            Tell SPICE what&rsquo;s in your kitchen and it plans a meal, with timings and a cook mode that counts you
            through it. We built it for the fifteen-minute weeknight, when the fridge is half empty and takeaway is
            looking tempting.
          </p>

          <div>
            <h3 className="font-display text-lg font-semibold mb-2">How it works</h3>
            <ul className="space-y-3">
              {POINTS.map((p) => (
                <li key={p.title} className="text-sm leading-relaxed">
                  <span className="font-semibold">{p.title}.</span>{" "}
                  <span className="text-stone-600 dark:text-muted">{p.body}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-stone-600 dark:text-muted leading-relaxed">
            No accounts. Your pantry, saved recipes and ratings stay in this browser. To write plans we send your
            ingredients, settings and any question you ask to OpenAI; our server keeps only anonymous counts for each
            ingredient combination.{" "}
            <a href="https://aidoo.biz/privacy-spice/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-stone-900 dark:hover:text-ink">
              Privacy policy
            </a>
          </p>

          <div className="pt-4 border-t border-stone-200 dark:border-line">
            <p className="text-sm text-stone-700 dark:text-ink">
              We&rsquo;re a small studio on the Isle of Man that makes games and apps. If your business wants an app
              like this of its own, we&rsquo;ll make that too.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <a
                href="mailto:hello@aidoo.biz?subject=SPICE"
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-stone-900 text-surface dark:bg-ink dark:text-surface-dark hover:bg-black dark:hover:bg-white transition-colors"
              >
                Email us
              </a>
              <a
                href="https://aidoo.biz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline underline-offset-4 text-stone-700 dark:text-ink hover:text-stone-900 dark:hover:text-white"
              >
                See what else we make
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
