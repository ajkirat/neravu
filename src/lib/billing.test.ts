import { describe, expect, it } from "vitest";
import { duePeriods, nextDueDate, summarizeLedger } from "./billing";
import { utcDate } from "./dates";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("duePeriods", () => {
  it("bills the first month on the move-in date and later months on the due day", () => {
    const p = duePeriods({ moveIn: d("2026-08-12"), dueDay: 5, asOf: d("2026-11-05") });
    expect(p.map((x) => [x.period, x.dueDate.toISOString().slice(0, 10)])).toEqual([
      ["2026-08", "2026-08-12"],
      ["2026-09", "2026-09-05"],
      ["2026-10", "2026-10-05"],
      ["2026-11", "2026-11-05"],
    ]);
  });

  it("does not bill a month that has not fallen due yet", () => {
    const p = duePeriods({ moveIn: d("2026-08-12"), dueDay: 12, asOf: d("2026-11-05") });
    expect(p.map((x) => x.period)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("clamps the due day to short months", () => {
    const p = duePeriods({ moveIn: d("2026-01-31"), dueDay: 31, asOf: d("2026-03-01") });
    expect(p[1].dueDate).toEqual(utcDate(2026, 1, 28));
  });

  it("stops billing after move-out", () => {
    const p = duePeriods({
      moveIn: d("2026-06-01"),
      moveOut: d("2026-09-01"),
      dueDay: 1,
      asOf: d("2026-11-05"),
    });
    expect(p.map((x) => x.period)).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("returns nothing for a future move-in", () => {
    expect(duePeriods({ moveIn: d("2026-12-01"), dueDay: 1, asOf: d("2026-11-05") })).toEqual([]);
  });
});

describe("nextDueDate", () => {
  it("finds the next due date in the same or next month", () => {
    expect(nextDueDate({ moveIn: d("2026-01-01"), dueDay: 10, asOf: d("2026-11-05") })).toEqual(
      d("2026-11-10"),
    );
    expect(nextDueDate({ moveIn: d("2026-01-01"), dueDay: 5, asOf: d("2026-11-05") })).toEqual(
      d("2026-12-05"),
    );
  });
});

describe("summarizeLedger", () => {
  const charges = [
    { amount: 8000, dueDate: d("2026-09-05") },
    { amount: 8000, dueDate: d("2026-10-05") },
    { amount: 8000, dueDate: d("2026-11-05") },
    { amount: 8000, dueDate: d("2026-12-05") },
  ];

  it("applies payments to the oldest dues first", () => {
    const s = summarizeLedger(charges, [{ amount: 12000 }], d("2026-11-05"));
    expect(s.charged).toBe(24000);
    expect(s.outstanding).toBe(12000);
    expect(s.oldestUnpaid).toEqual(d("2026-10-05"));
    expect(s.overdueDays).toBe(31);
  });

  it("reports advance when overpaid", () => {
    const s = summarizeLedger(charges, [{ amount: 30000 }], d("2026-11-05"));
    expect(s.outstanding).toBe(0);
    expect(s.advance).toBe(6000);
    expect(s.oldestUnpaid).toBeNull();
  });
});
