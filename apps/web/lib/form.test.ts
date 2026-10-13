import { describe, expect, it } from "vitest";
import { DEFAULT_FORM, flavourLabel, prefsSummary } from "./form";

describe("prefsSummary", () => {
  it("summarises the defaults in one line", () => {
    expect(prefsSummary(DEFAULT_FORM)).toBe("30 min · Any diet · Savoury & umami · Medium heat · hob, pan");
  });

  it("handles no equipment", () => {
    expect(prefsSummary({ ...DEFAULT_FORM, equipment: [] })).toContain("any equipment");
  });

  it("labels flavour modes in sentence case", () => {
    expect(flavourLabel("bold_spicy")).toBe("Bold & spicy");
    expect(flavourLabel(null)).toBeNull();
  });
});
