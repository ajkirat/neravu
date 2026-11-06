import { describe, expect, it } from "vitest";
import { CATEGORY_KEYWORDS, EXPENSE_CATEGORIES, categoryMatches } from "./format";

describe("category search", () => {
  const find = (q: string) => EXPENSE_CATEGORIES.filter((c) => categoryMatches(q, c, c));
  it("finds by name, everyday words and local words", () => {
    expect(find("diesel")).toEqual(["Diesel (generator)"]);
    expect(find("hotel")).toContain("Food from outside");
    expect(find("swiggy")).toEqual(["Food from outside"]);
    expect(find("haalu")).toEqual(["Milk & dairy"]);
    expect(find("current")).toContain("Electricity");
    expect(find("CYLINDER")).toContain("Cooking gas");
  });
  it("searches the label shown in the chosen language", () => {
    expect(categoryMatches("ಡೀಸೆಲ್", "Diesel (generator)", "ಡೀಸೆಲ್ (ಜನರೇಟರ್)")).toBe(true);
  });
  it("empty search shows everything; nonsense shows nothing", () => {
    expect(find("")).toHaveLength(EXPENSE_CATEGORIES.length);
    expect(find("zzqx")).toEqual([]);
  });
  it("has keywords only for real categories", () => {
    for (const k of Object.keys(CATEGORY_KEYWORDS)) expect(EXPENSE_CATEGORIES as readonly string[]).toContain(k);
  });
});
