import { describe, expect, it } from "vitest";
import { assetAlerts, dueState, expenseCategoryFor, periodFor, runState, SERVICE_PRESETS } from "./upkeep";
import { EXPENSE_CATEGORIES } from "./format";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("upkeep", () => {
  it("tells late, due, heads-up and later apart", () => {
    const today = d("2026-11-10");
    expect(dueState(d("2026-11-08"), 0, today)).toEqual({ state: "late", days: -2 });
    expect(dueState(d("2026-11-10"), 3, today).state).toBe("due");
    expect(dueState(d("2026-11-13"), 3, today).state).toBe("soon");
    expect(dueState(d("2026-11-14"), 3, today).state).toBe("later");
    expect(dueState(d("2026-11-11"), 0, today).state).toBe("later");
  });
  it("weekly lists belong to the Monday of their week", () => {
    expect(periodFor("WEEKLY", d("2026-11-12")).toISOString().slice(0, 10)).toBe("2026-11-09"); // Thursday -> Monday
    expect(periodFor("WEEKLY", d("2026-11-15")).toISOString().slice(0, 10)).toBe("2026-11-09"); // Sunday -> Monday
    expect(periodFor("WEEKLY", d("2026-11-09")).toISOString().slice(0, 10)).toBe("2026-11-09");
    expect(periodFor("DAILY", d("2026-11-12")).toISOString().slice(0, 10)).toBe("2026-11-12");
  });
  it("marks a checklist done, part done or missed (ignoring items removed since)", () => {
    expect(runState(["a", "b"], ["a", "b"])).toBe("done");
    expect(runState(["a"], ["a", "b"])).toBe("part");
    expect(runState(["old"], ["a", "b"])).toBe("missed");
    expect(runState(undefined, ["a"])).toBe("missed");
  });
  it("warns about warranty / AMC ending within 30 days, for a week after too", () => {
    const today = d("2026-11-10");
    expect(assetAlerts({ warrantyUntil: d("2026-11-25"), amcUntil: d("2027-05-01") }, today)).toEqual([{ kind: "warranty", days: 15 }]);
    expect(assetAlerts({ warrantyUntil: d("2026-11-05"), amcUntil: null }, today)).toEqual([{ kind: "warranty", days: -5 }]);
    expect(assetAlerts({ warrantyUntil: d("2026-10-01"), amcUntil: null }, today)).toEqual([]);
  });
  it("puts every service's cost into a real expense category", () => {
    for (const p of SERVICE_PRESETS) expect(EXPENSE_CATEGORIES as readonly string[]).toContain(expenseCategoryFor(p.category, p.key === "job_GAS" ? "Gas cylinder booking" : ""));
    expect(expenseCategoryFor("KITCHEN", "Gas cylinder booking")).toBe("Cooking gas");
    expect(expenseCategoryFor("PEST")).toBe("Cleaning & housekeeping");
  });
});
