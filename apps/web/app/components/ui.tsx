import type { ReactNode } from "react";

export function Pill({ active, onClick, children, accent, disabled }: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  accent?: boolean;
  disabled?: boolean;
}) {
  // Toggles and quick actions: neutral, so vermilion stays for the one loud
  // thing on screen. Chosen = ink-filled; accent = dashed (a wildcard).
  const base = "text-sm px-3 py-1.5 rounded-lg border transition-colors duration-150 min-h-[36px] disabled:opacity-50";
  const tone = accent
    ? "border-dashed border-stone-400 dark:border-dim text-stone-700 dark:text-ink hover:border-stone-600 dark:hover:border-muted"
    : active
    ? "border-stone-900 bg-stone-900 text-surface dark:border-ink dark:bg-ink dark:text-surface-dark font-medium"
    : "border-stone-300 dark:border-line text-stone-600 dark:text-muted hover:text-stone-900 dark:hover:text-ink hover:border-stone-500 dark:hover:border-muted";
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active} className={`${base} ${tone}`}>
      {children}
    </button>
  );
}

export const iconButton =
  "p-2 rounded-lg text-stone-500 dark:text-muted hover:text-stone-800 dark:hover:text-ink hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150";
