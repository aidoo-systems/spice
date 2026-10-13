import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`card-elev rounded-xl border border-stone-200/80 dark:border-white/10 bg-surface-card dark:bg-surface-dark-card p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-[rgba(245,245,245,0.65)] mb-3">
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
  const base = "text-xs px-3 py-1.5 rounded-full border transition-colors duration-150 min-h-[36px] disabled:opacity-50";
  const tone = accent
    ? "border-amber-400/50 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20"
    : active
    ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40 font-semibold"
    : "border-stone-300/70 dark:border-white/10 text-stone-500 dark:text-[rgba(245,245,245,0.65)] hover:text-stone-800 dark:hover:text-[#F5F5F5] hover:border-amber-400/50 dark:hover:border-amber-500/40";
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active} className={`${base} ${tone}`}>
      {children}
    </button>
  );
}

export function Chip({ children, tone = "neutral", title }: {
  children: ReactNode;
  tone?: "neutral" | "amber" | "green" | "warn";
  title?: string;
}) {
  const tones = {
    neutral: "bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-[rgba(245,245,245,0.7)]",
    amber: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
    green: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warn: "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300",
  };
  return (
    <span title={title} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const iconButton =
  "p-2 rounded-lg text-stone-500 dark:text-[rgba(245,245,245,0.65)] hover:text-stone-800 dark:hover:text-[#F5F5F5] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors duration-150";
