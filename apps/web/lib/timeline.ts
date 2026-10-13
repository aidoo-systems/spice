/** Geometry for the plan timeline: where each step and ingredient sits in time. */

import type { Step } from "./types";
import { normalizeIngredient } from "./feedback";

export interface Segment {
  index: number;
  start: number; // seconds
  end: number; // seconds
  left: number; // % of total
  width: number; // % of total
}

export interface Lane {
  name: string;
  /** Indexes of the steps that use this ingredient. */
  steps: number[];
}

const LAST_STEP_SECONDS = 60;
const MIN_WIDTH = 2; // % — keeps instant steps visible

/** Total length: the last step gets a minute, or the plan's own estimate if longer. */
export function totalSeconds(steps: Step[], prepMinutes = 0): number {
  const last = steps.length ? steps[steps.length - 1].t_seconds + LAST_STEP_SECONDS : 0;
  return Math.max(last, prepMinutes * 60, 60);
}

export function segments(steps: Step[], total: number): Segment[] {
  return steps.map((s, i) => {
    const end = i + 1 < steps.length ? steps[i + 1].t_seconds : total;
    const left = (s.t_seconds / total) * 100;
    const width = Math.max(((end - s.t_seconds) / total) * 100, MIN_WIDTH);
    return { index: i, start: s.t_seconds, end, left: Math.min(left, 100 - MIN_WIDTH), width: Math.min(width, 100 - left) };
  });
}

/** Ingredients in order of first use, each with the steps that touch it. */
export function lanes(steps: Step[], max = 6): Lane[] {
  const byName = new Map<string, number[]>();
  steps.forEach((s, i) => {
    for (const raw of s.uses ?? []) {
      const name = normalizeIngredient(raw);
      if (!name) continue;
      const list = byName.get(name) ?? [];
      if (!list.includes(i)) list.push(i);
      byName.set(name, list);
    }
  });
  return [...byName.entries()].slice(0, max).map(([name, idx]) => ({ name, steps: idx }));
}

/** Index of the step running at `elapsed` seconds. */
export function stepAt(steps: Step[], elapsed: number): number {
  let idx = 0;
  steps.forEach((s, i) => {
    if (elapsed >= s.t_seconds) idx = i;
  });
  return idx;
}

export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
