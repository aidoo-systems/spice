import { describe, expect, it } from "vitest";
import { fmtClock, lanes, segments, stepAt, totalSeconds } from "./timeline";

const steps = [
  { t_seconds: 0, instruction: "a", uses: ["Garlic", "oil"] },
  { t_seconds: 60, instruction: "b", uses: ["egg"] },
  { t_seconds: 60, instruction: "c", uses: ["garlic"] },
  { t_seconds: 300, instruction: "d", uses: ["rice", "egg"] },
];

describe("timeline geometry", () => {
  it("gives the last step a minute, or uses the plan's estimate if longer", () => {
    expect(totalSeconds(steps)).toBe(360);
    expect(totalSeconds(steps, 10)).toBe(600);
    expect(totalSeconds([])).toBe(60);
  });

  it("lays steps out by time, keeping instant steps visible", () => {
    const seg = segments(steps, 360);
    expect(seg[0]).toMatchObject({ start: 0, end: 60, left: 0 });
    expect(seg[0].width).toBeCloseTo(16.67, 1);
    expect(seg[1].width).toBe(2); // 60s → 60s, would be zero
    expect(seg[3].end).toBe(360);
    for (const s of seg) expect(s.left + s.width).toBeLessThanOrEqual(100);
  });

  it("builds ingredient lanes in order of first use", () => {
    expect(lanes(steps)).toEqual([
      { name: "garlic", steps: [0, 2] },
      { name: "oil", steps: [0] },
      { name: "egg", steps: [1, 3] },
      { name: "rice", steps: [3] },
    ]);
    expect(lanes(steps, 2)).toHaveLength(2);
  });

  it("finds the step running at a time", () => {
    expect(stepAt(steps, 0)).toBe(0);
    expect(stepAt(steps, 61)).toBe(2);
    expect(stepAt(steps, 9999)).toBe(3);
  });

  it("formats clock time", () => {
    expect(fmtClock(65)).toBe("1:05");
    expect(fmtClock(-3)).toBe("0:00");
  });
});
