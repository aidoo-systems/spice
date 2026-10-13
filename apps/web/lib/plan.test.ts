import { describe, expect, it } from "vitest";
import { fmtTime, normalizePlan, sourceOf } from "./plan";

describe("normalizePlan", () => {
  it("fills every field for an empty snapshot", () => {
    const p = normalizePlan({});
    expect(p.title).toBe("");
    expect(p.steps).toEqual([]);
    expect(p.upgrade_ladder).toEqual({ pantry_upgrade: [], if_you_have: [], one_pound_shop: null });
    expect(p.safety.missing_ingredients).toEqual([]);
    expect(p.minimal_rescue).toBeNull();
  });

  it("drops half-written steps and upgrades", () => {
    const p = normalizePlan({
      title: "Rice",
      steps: [{ t_seconds: 0, instruction: "Boil", uses: ["water", ""] }, { t_seconds: 60 }],
      upgrade_ladder: { if_you_have: [{ requires: "egg", why: "rich" }, {}], one_pound_shop: { why: "x" } },
    });
    expect(p.steps).toEqual([{ t_seconds: 0, instruction: "Boil", tip: null, uses: ["water"] }]);
    expect(p.upgrade_ladder.if_you_have).toEqual([{ requires: "egg", why: "rich", how: "" }]);
    expect(p.upgrade_ladder.one_pound_shop).toBeNull();
  });

  it("only enables rescue when the model said so", () => {
    expect(normalizePlan({ minimal_rescue: { enabled: false } }).minimal_rescue).toBeNull();
    expect(normalizePlan({ minimal_rescue: { enabled: true, rescue_line: "Go" } }).minimal_rescue?.rescue_line).toBe("Go");
  });

  it("ignores wrong types", () => {
    const p = normalizePlan({ title: 3, steps: "nope", why_this_works: [1, "ok"], rejection: "" });
    expect(p.title).toBe("");
    expect(p.steps).toEqual([]);
    expect(p.why_this_works).toEqual(["ok"]);
    expect(p.rejection).toBeNull();
  });
});

describe("sourceOf", () => {
  const plan = normalizePlan({
    meta: {
      grounding: { from_ingredients: ["rice"], from_pantry: ["soy sauce"], staples: ["oil"], flagged_missing: [], unlisted: ["truffle"] },
      checks: [],
    },
  });

  it("maps items to their grounding bucket, case-insensitively", () => {
    expect(sourceOf("Rice", plan)).toBe("list");
    expect(sourceOf("soy  sauce", plan)).toBe("pantry");
    expect(sourceOf("oil", plan)).toBe("staple");
    expect(sourceOf("truffle", plan)).toBe("unlisted");
    expect(sourceOf("salt", plan)).toBeNull();
  });

  it("returns null without meta", () => {
    expect(sourceOf("rice", normalizePlan({}))).toBeNull();
  });
});

describe("fmtTime", () => {
  it("formats seconds as m:ss", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(125)).toBe("2:05");
  });
});
