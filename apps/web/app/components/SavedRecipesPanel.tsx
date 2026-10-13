"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SuggestResponse } from "@/lib/types";
import { getSavedRecipes, deleteRecipe, type SavedRecipe } from "@/lib/recipes";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (result: SuggestResponse) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function SavedRecipesPanel({ open, onClose, onLoad }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);

  useEffect(() => {
    if (open) setRecipes(getSavedRecipes());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteRecipe(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

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
        className="relative w-full max-w-sm bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-700 shadow-xl overflow-y-auto"
        role="dialog"
        aria-label="Saved recipes"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700">
          <h2 className="font-bold text-lg">Saved Recipes ({recipes.length})</h2>
          <button
            onClick={onClose}
            className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close saved recipes"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mb-3">
            Saved in this browser only — clearing site data removes them.
          </p>
          {recipes.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">
              No saved recipes yet. Hit Save on any recipe to keep it here.
            </p>
          ) : (
            <ul className="space-y-3">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    onClick={() => { onLoad(recipe.result); onClose(); }}
                    className="w-full text-left p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2">
                        {recipe.result.title}
                      </h3>
                      <button
                        onClick={(e) => handleDelete(e, recipe.id)}
                        className="text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
                        aria-label={`Delete ${recipe.result.title}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        ~{recipe.result.prep_time_minutes} min
                      </span>
                      {recipe.result.calories_estimate && (
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          ~{recipe.result.calories_estimate} cal
                        </span>
                      )}
                      <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">
                        {timeAgo(recipe.timestamp)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
