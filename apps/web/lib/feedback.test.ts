import { describe, expect, it } from "vitest";
import { makeSignature, normalizeIngredient } from "./feedback";

// Must match spice.db.make_combo_hash on the API, or ratings/cooked counts
// land on a combo the server has never seen.
describe("makeSignature", () => {
  it("normalizes and sorts like the API", () => {
    expect(makeSignature(["  Onion ", "EGG"], "umami")).toBe("egg,onion|umami");
    expect(makeSignature(["rice"])).toBe("rice|none");
    expect(normalizeIngredient(" soy   Sauce ")).toBe("soy sauce");
  });
});
