import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 dark:border-line bg-surface-card dark:bg-surface-dark-card p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-base font-semibold tracking-tight text-stone-900 dark:text-ink mb-3">
      {children}
    </h3>
  );
}

export function Pill({ active, onClick, children, accent, disabled }: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  accent?: boolean;
  disabled?: boolean;
}) {
  // Toggles and quick actions: square-ish, quiet until chosen. The accent
  // variant reads as a link, so the page keeps one filled button.
  const base = "text-sm px-3 py-1.5 rounded-lg border transition-colors duration-150 min-h-[36px] disabled:opacity-50";
  const tone = accent
    ? "border-transparent px-1 text-spice-700 dark:text-spice-300 font-medium underline underline-offset-4 decoration-1 hover:text-spice-800 dark:hover:text-spice-200"
    : active
    ? "border-spice-500 bg-spice-50 text-spice-800 dark:bg-spice-500/10 dark:text-spice-200 font-medium"
    : "border-stone-300 dark:border-line text-stone-600 dark:text-muted hover:text-stone-900 dark:hover:text-ink hover:border-stone-500 dark:hover:border-muted";
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active} className={`${base} ${tone}`}>
      {children}
    </button>
  );
}

export function Chip({ children, tone = "neutral", title }: {
  children: ReactNode;
  tone?: "neutral" | "spice" | "green" | "warn";
  title?: string;
}) {
  const tones = {
    neutral: "bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-muted",
    spice: "bg-spice-100 dark:bg-spice-500/15 text-spice-800 dark:text-spice-300",
    green: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warn: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  };
  return (
    <span title={title} className={`text-xs font-medium px-2 py-0.5 rounded-md ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const iconButton =
  "p-2 rounded-lg text-stone-500 dark:text-muted hover:text-stone-800 dark:hover:text-ink hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150";
