import { describe, expect, it } from "vitest";
import { amountFromReadings, electricityDescription, parseElectricityDescription, periodSpan, splitByDays, stayDays, unitsUsed } from "./electricity";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("periodSpan / stayDays", () => {
  it("knows month lengths", () => {
    expect(periodSpan("2026-02")?.days).toBe(28);
    expect(periodSpan("2028-02")?.days).toBe(29);
    expect(periodSpan("2026-11")?.days).toBe(30);
    expect(periodSpan("nope")).toBeNull();
  });
  it("counts a full month for someone who stayed throughout", () => {
    expect(stayDays({ id: "a", moveIn: d("2026-01-01"), moveOut: null }, "2026-11")).toBe(30);
  });
  it("counts both the move-in day and the move-out day", () => {
    expect(stayDays({ id: "a", moveIn: d("2026-11-10"), moveOut: null }, "2026-11")).toBe(21);
    expect(stayDays({ id: "a", moveIn: d("2026-01-01"), moveOut: d("2026-11-10") }, "2026-11")).toBe(10);
    expect(stayDays({ id: "a", moveIn: d("2026-11-10"), moveOut: d("2026-11-10") }, "2026-11")).toBe(1);
  });
  it("is zero when they were not there that month", () => {
    expect(stayDays({ id: "a", moveIn: d("2026-12-01"), moveOut: null }, "2026-11")).toBe(0);
    expect(stayDays({ id: "a", moveIn: d("2026-01-01"), moveOut: d("2026-10-31") }, "2026-11")).toBe(0);
  });
});

describe("splitByDays", () => {
  const total = (s: { share: number }[]) => s.reduce((a, b) => a + b.share, 0);
  it("splits evenly for equal stays", () => {
    expect(splitByDays(900, [{ id: "a", days: 30 }, { id: "b", days: 30 }, { id: "c", days: 30 }]).map((s) => s.share)).toEqual([300, 300, 300]);
  });
  it("weights by days", () => {
    const r = splitByDays(1000, [{ id: "a", days: 30 }, { id: "b", days: 10 }]);
    expect(r.map((s) => s.share)).toEqual([750, 250]);
  });
  it("always adds up exactly, even when the division is not whole", () => {
    for (const amount of [100, 101, 999, 1234, 1]) {
      const r = splitByDays(amount, [{ id: "a", days: 30 }, { id: "b", days: 30 }, { id: "c", days: 30 }]);
      expect(total(r)).toBe(amount);
    }
    expect(splitByDays(100, [{ id: "a", days: 1 }, { id: "b", days: 1 }, { id: "c", days: 1 }]).map((s) => s.share).sort()).toEqual([33, 33, 34]);
  });
  it("gives the extra rupee to the largest remainder, not always the first person", () => {
    const r = splitByDays(10, [{ id: "a", days: 1 }, { id: "b", days: 2 }]); // 3.33 / 6.67
    expect(r.map((s) => s.share)).toEqual([3, 7]);
  });
  it("ignores people who were not there and returns nothing when nobody was", () => {
    expect(splitByDays(500, [{ id: "a", days: 0 }, { id: "b", days: 5 }]).map((s) => [s.id, s.share])).toEqual([["b", 500]]);
    expect(splitByDays(500, [{ id: "a", days: 0 }])).toEqual([]);
    expect(splitByDays(0, [{ id: "a", days: 3 }])).toEqual([]);
  });
});

describe("readings", () => {
  it("computes the bill from readings and a rate", () => {
    expect(amountFromReadings(1000, 1120, 8)).toBe(960);
    expect(amountFromReadings(1000, 1120.5, 7.5)).toBe(Math.round(120.5 * 7.5));
  });
  it("rejects readings that go backwards or are missing", () => {
    expect(amountFromReadings(1200, 1000, 8)).toBeNull();
    expect(amountFromReadings(null, 1000, 8)).toBeNull();
    expect(amountFromReadings(1000, 1100, null)).toBeNull();
    expect(amountFromReadings(1000, 1100, -1)).toBeNull();
  });
  it("reports units used", () => {
    expect(unitsUsed(1000, 1120)).toBe(120);
    expect(unitsUsed(1200, 1000)).toBeNull();
  });
});

describe("charge description code", () => {
  it("round-trips and leaves ordinary text alone", () => {
    const code = electricityDescription("2026-10", "101", 28, 31);
    expect(parseElectricityDescription(code)).toEqual({ period: "2026-10", room: "101", days: 28, total: 31 });
    expect(parseElectricityDescription("October electricity, 112 units")).toBeNull();
  });
});
