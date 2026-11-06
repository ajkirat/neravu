import { describe, expect, it } from "vitest";
import { settle } from "./settlement";

describe("settle", () => {
  it("refunds the deposit less what is owed", () => {
    expect(settle({ deposit: 18000, outstanding: 4500, advance: 0 })).toMatchObject({ refund: 13500, owes: 0 });
  });
  it("adds any advance to the refund", () => {
    expect(settle({ deposit: 10000, outstanding: 0, advance: 2000 })).toMatchObject({ refund: 12000, owes: 0 });
  });
  it("asks the tenant to pay when dues are more than the deposit", () => {
    expect(settle({ deposit: 5000, outstanding: 7200, advance: 0 })).toMatchObject({ refund: 0, owes: 2200 });
  });
  it("is settled once the refund is recorded as a negative payment", () => {
    // deposit 18000, dues 4500 -> refund 13500; recording -13500 makes outstanding 18000
    expect(settle({ deposit: 18000, outstanding: 18000, advance: 0 })).toMatchObject({ refund: 0, owes: 0 });
  });
});

import { openCharges } from "./settlement";
describe("openCharges", () => {
  const d = (n: number) => new Date(Date.UTC(2026, 0, n));
  const c = (id: string, day: number, amount: number) => ({ id, type: "RENT", description: id, period: null, dueDate: d(day), amount });
  it("pays the oldest first and lists what is left", () => {
    const got = openCharges([c("jan", 1, 5000), c("feb", 2, 5000), c("dmg", 3, 800)], 7000, d(10));
    expect(got.map((g) => [g.id, g.open])).toEqual([["feb", 3000], ["dmg", 800]]);
  });
  it("ignores charges not yet due", () => {
    expect(openCharges([c("later", 20, 5000)], 0, d(10))).toEqual([]);
  });
});
