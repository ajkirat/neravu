import { describe, expect, it } from "vitest";
import { PITCH_DEFAULTS, cleanPitchInputs, computePitch } from "./pitch";

describe("pitch calculator", () => {
  it("works out the default PG", () => {
    const r = computePitch(PITCH_DEFAULTS);
    expect(r.occupied).toBe(34); // 40 beds x 85%
    expect(r.rentRoll).toBe(272000);
    const by = Object.fromEntries(r.lines.map((l) => [l.key, l]));
    expect(by.chase.hours).toBe(7); // 10 h x 70%
    expect(by.receipts.hours).toBe(1.7); // 34 receipts x 3 min
    expect(by.bills.hours).toBe(2.3); // 40 x 5 min x 70%
    expect(by.electricity.hours).toBe(2); // 15 x 10 min x 80%
    expect(by.unpaid.rupees).toBe(2720); // 2% of rent, half recovered
    expect(by.leak.rupees).toBe(653); // 30% cash, 1% lost, 80% stopped
    expect(by.elecLost.rupees).toBe(2400);
    expect(by.vacancy.rupees).toBe(3000); // 3 leavers x 15 days x 25% x 8000/30
    expect(r.hours).toBeCloseTo(13.8, 1);
    expect(r.perYear).toBe(r.perMonth * 12);
    expect(r.perMonth).toBe(r.money + r.timeValue);
  });
  it("cleans form values: blanks use defaults, junk and negatives are safe, huge values are capped", () => {
    const i = cleanPitchInputs({ beds: "", rent: "₹9,000", occupancy: "-5", chaseHours: "abc", leakPct: 999 });
    expect(i.beds).toBe(40);
    expect(i.rent).toBe(9000);
    expect(i.occupancy).toBe(0);
    expect(i.chaseHours).toBe(0);
    expect(i.leakPct).toBe(50);
    expect(computePitch(i).perMonth).toBeGreaterThanOrEqual(0);
  });
  it("an empty PG saves nothing from rent", () => {
    const r = computePitch({ ...PITCH_DEFAULTS, occupancy: 0 });
    expect(r.rentRoll).toBe(0);
    expect(r.lines.find((l) => l.key === "unpaid")!.rupees).toBe(0);
  });
});
