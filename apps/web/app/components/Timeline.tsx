"use client";

import type { Step } from "@/lib/types";
import { fmtClock, lanes, segments, totalSeconds } from "@/lib/timeline";

interface Props {
  steps: Step[];
  prepMinutes?: number;
  /** Highlight the running step (cook mode); earlier steps are dimmed. */
  current?: number;
  /** Show the per-ingredient lanes under the step bar. */
  showLanes?: boolean;
  /** "poster" draws dark-on-vermilion for the share image. */
  tone?: "app" | "poster";
  onSelect?: (index: number) => void;
}

/**
 * The plan drawn in time: one block per step across the minutes, and a lane
 * per ingredient marking the steps that use it. SPICE's signature visual.
 */
export default function Timeline({ steps, prepMinutes = 0, current, showLanes = true, tone = "app", onSelect }: Props) {
  if (steps.length === 0) return null;
  const total = totalSeconds(steps, prepMinutes);
  const segs = segments(steps, total);
  const ingredientLanes = showLanes ? lanes(steps) : [];
  const poster = tone === "poster";

  const block = (i: number) => {
    if (poster) return "bg-spice-950 text-spice-500";
    if (current === undefined) return "bg-spice-500 text-spice-950";
    if (i === current) return "bg-spice-500 text-spice-950";
    return i < current ? "bg-stone-300 text-stone-600 dark:bg-white/15 dark:text-muted" : "bg-stone-200 text-stone-600 dark:bg-white/10 dark:text-muted";
  };
  const label = poster ? "text-spice-950" : "text-stone-500 dark:text-dim";
  const dot = poster ? "bg-spice-950" : "bg-stone-800 dark:bg-ink";
  const rule = poster ? "bg-spice-950/25" : "bg-stone-200 dark:bg-line";

  return (
    <figure
      role="img"
      aria-label={`Timeline: ${steps.length} steps over ${Math.round(total / 60)} minutes`}
      className="w-full select-none"
    >
      <div className={`grid ${showLanes ? "grid-cols-[5.5rem_1fr] sm:grid-cols-[7rem_1fr]" : "grid-cols-1"} gap-x-3 items-center`}>
        {showLanes && <span className={`text-xs ${label}`}>Steps</span>}
        <div className="relative h-8">
          {segs.map((s) => {
            const Tag = onSelect ? "button" : "div";
            return (
              <Tag
                key={s.index}
                {...(onSelect ? { type: "button" as const, onClick: () => onSelect(s.index), "aria-label": `Step ${s.index + 1}` } : {})}
                className={`absolute inset-y-0 rounded-md grid place-items-center text-xs font-bold tabular-nums transition-colors ${block(s.index)}`}
                style={{ left: `calc(${s.left}% + 1px)`, width: `calc(${s.width}% - 2px)` }}
              >
                {s.width > 4 ? s.index + 1 : ""}
              </Tag>
            );
          })}
        </div>

        {ingredientLanes.map((lane) => (
          <div key={lane.name} className="contents">
            <span className={`text-xs truncate py-1 ${label}`} title={lane.name}>{lane.name}</span>
            <div className="relative h-5">
              <div className={`absolute inset-x-0 top-1/2 h-px ${rule}`} />
              {lane.steps.map((i) => {
                const s = segs[i];
                return (
                  <span
                    key={i}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full ${dot} ${current !== undefined && i !== current && !poster ? "opacity-40" : ""}`}
                    style={{ left: `${s.left + s.width / 2}%` }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {showLanes && <span />}
        <div className={`flex justify-between text-xs tabular-nums mt-1 ${label}`}>
          <span>0:00</span>
          <span>{fmtClock(total / 2)}</span>
          <span>{fmtClock(total)}</span>
        </div>
      </div>
    </figure>
  );
}
