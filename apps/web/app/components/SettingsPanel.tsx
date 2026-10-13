"use client";

import { useState, useEffect, useRef } from "react";
import type { SkillMode } from "@/lib/types";
import { CHANGELOG } from "@/lib/changelog";

const TYPE_LABELS: Record<string, string> = {
  added: "Added",
  changed: "Changed",
  fixed: "Fixed",
};

const TYPE_COLORS: Record<string, string> = {
  added: "text-green-600 dark:text-green-400",
  changed: "text-amber-600 dark:text-amber-400",
  fixed: "text-blue-600 dark:text-blue-400",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenTutorial: () => void;
  pantry: string[];
  pantryInput: string;
  onPantryInputChange: (value: string) => void;
  onAddPantryItem: () => void;
  onRemovePantryItem: (item: string) => void;
  skillMode: SkillMode;
  onSkillModeChange: (mode: SkillMode) => void;
}

export default function SettingsPanel({
  open,
  onClose,
  onOpenTutorial,
  pantry,
  pantryInput,
  onPantryInputChange,
  onAddPantryItem,
  onRemovePantryItem,
  skillMode,
  onSkillModeChange,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"settings" | "changelog">("settings");

  // Trap focus and handle Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset to settings view when panel closes
  useEffect(() => {
    if (!open) setView("settings");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-sm bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-700 shadow-xl overflow-y-auto flex flex-col"
        role="dialog"
        aria-label={view === "settings" ? "Settings" : "What's New"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            {view === "changelog" && (
              <button
                onClick={() => setView("settings")}
                className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 min-w-[36px] min-h-[36px] flex items-center justify-center -ml-1"
                aria-label="Back to settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="font-bold text-lg">
              {view === "settings" ? "Settings" : "What's New"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {view === "settings" ? (
          <>
            <div className="p-4 space-y-6">
              {/* Skill mode */}
              <section>
                <label className="block text-sm font-medium mb-2">Skill level</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSkillModeChange("beginner")}
                    className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                      skillMode === "beginner"
                        ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200"
                        : "border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    Beginner
                  </button>
                  <button
                    onClick={() => onSkillModeChange("confident")}
                    className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                      skillMode === "confident"
                        ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200"
                        : "border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    Confident
                  </button>
                </div>
              </section>

              {/* Pantry staples */}
              <section>
                <label className="block text-sm font-medium mb-2">
                  Pantry staples ({pantry.length})
                </label>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">
                  Things you always have at home (oil, salt, etc.)
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    className="flex-1 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. oil, salt, soy sauce"
                    value={pantryInput}
                    onChange={(e) => onPantryInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddPantryItem();
                      }
                    }}
                  />
                  <button
                    onClick={onAddPantryItem}
                    className="text-sm bg-stone-700 dark:bg-stone-600 text-white px-3 py-2 rounded-lg hover:bg-stone-800 dark:hover:bg-stone-500 transition-colors min-h-[44px]"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pantry.map((item) => (
                    <span
                      key={item}
                      className="bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                    >
                      {item}
                      <button
                        onClick={() => onRemovePantryItem(item)}
                        className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 min-w-[20px] min-h-[20px] flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {pantry.length === 0 && (
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      No pantry items yet.
                    </span>
                  )}
                </div>
              </section>

              {/* Tutorial */}
              <section>
                <label className="block text-sm font-medium mb-2">Tutorial</label>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">
                  A quick guided tour for first-time users.
                </p>
                <button
                  onClick={onOpenTutorial}
                  className="text-sm px-4 py-2 rounded-full border border-amber-400/60 dark:border-amber-500/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  Start tutorial
                </button>
              </section>
            </div>

            <div className="px-4 pb-4">
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Your pantry, saved recipes and taste feedback live only in this browser. SPICE has no
                accounts; the server only keeps anonymous ingredient-combo counts and ratings.
              </p>
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-stone-700 mt-auto">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  Smart Pantry Intelligence &amp; Culinary Engine
                </p>
                <button
                  onClick={() => setView("changelog")}
                  className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 underline transition-colors"
                >
                  What&apos;s New
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 space-y-5 flex-1">
            {CHANGELOG.map((entry) => (
              <section key={entry.version}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm font-bold">v{entry.version}</span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">{entry.date}</span>
                </div>
                {(["added", "changed", "fixed"] as const).map((type) => {
                  const items = entry.changes.filter((c) => c.type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type} className="mb-1.5">
                      <p className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${TYPE_COLORS[type]}`}>
                        {TYPE_LABELS[type]}
                      </p>
                      <ul className="space-y-0.5">
                        {items.map((item, i) => (
                          <li key={i} className="text-xs text-stone-600 dark:text-stone-300">
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
