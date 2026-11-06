import { describe, expect, it } from "vitest";
import { CATEGORY_KEYWORDS, CATEGORY_MERGED, EXPENSE_CATEGORIES, canonicalCategory, categoryMatches } from "./format";
import { messages } from "./i18n/messages";

describe("expense categories", () => {
  const find = (q: string) => EXPENSE_CATEGORIES.filter((c) => categoryMatches(q, c, c));
  it("is a short list with no taxes category", () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(14);
    expect(EXPENSE_CATEGORIES.some((c) => /tax/i.test(c))).toBe(false);
  });
  it("finds by name, everyday words and local words, also words of merged categories", () => {
    expect(find("diesel")).toEqual(["Diesel (generator)"]);
    expect(find("swiggy")).toEqual(["Food from outside"]);
    expect(find("haalu")).toEqual(["Daily fresh"]);
    expect(find("tanker")).toEqual(["Water"]);
    expect(find("plumber")).toEqual(["Repairs & maintenance"]);
    expect(find("laundry")).toEqual(["Cleaning & housekeeping"]);
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
  it("maps every old category to a current one", () => {
    for (const [old, now] of Object.entries(CATEGORY_MERGED)) {
      expect(EXPENSE_CATEGORIES as readonly string[]).not.toContain(old);
      expect(EXPENSE_CATEGORIES as readonly string[]).toContain(now);
    }
    expect(canonicalCategory("Milk & dairy")).toBe("Daily fresh");
    expect(canonicalCategory("Property tax & licences")).toBe("Other");
    expect(canonicalCategory("Electricity")).toBe("Electricity");
    expect(canonicalCategory("nonsense")).toBe("Other");
    expect(canonicalCategory(null)).toBe("Other");
  });
  it("every category has keywords and a label; merged ones have Notes examples", () => {
    for (const c of EXPENSE_CATEGORIES) {
      expect(CATEGORY_KEYWORDS[c]).toBeTruthy();
      expect(`cat_${c}` in messages).toBe(true);
    }
    for (const c of new Set(Object.values(CATEGORY_MERGED))) expect(`catnote_${c}` in messages).toBe(true);
  });
});
