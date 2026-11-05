import { describe, expect, it } from "vitest";
import { planReminders, type PlanLog, type PlanTenant } from "./reminder-plan";
import { buildTemplatePayload, cleanParam, waNumber } from "./whatsapp-utils";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const asOf = d("2026-11-10");
const base: PlanTenant = { id: "t1", phone: "9876543210", status: "ACTIVE", monthlyRent: 8000, outstanding: 0, oldestUnpaid: null, nextDue: null, payClaimedAt: null };
const cfg = { before: 2, overdueEvery: 3 };

describe("planReminders: due soon", () => {
  it("fires exactly `before` days ahead, once", () => {
    expect(planReminders([{ ...base, nextDue: d("2026-11-12") }], [], cfg, asOf)).toEqual([{ tenantId: "t1", kind: "DUE_SOON", amount: 8000, daysLate: 0 }]);
    expect(planReminders([{ ...base, nextDue: d("2026-11-13") }], [], cfg, asOf)).toEqual([]);
    expect(planReminders([{ ...base, nextDue: d("2026-11-11") }], [], cfg, asOf)).toEqual([]);
  });
  it("is off when `before` is 0, and silent when no more rent will be billed", () => {
    expect(planReminders([{ ...base, nextDue: d("2026-11-10") }], [], { before: 0, overdueEvery: 3 }, asOf)).toEqual([]);
    expect(planReminders([{ ...base, nextDue: null }], [], cfg, asOf)).toEqual([]);
  });
});

describe("planReminders: overdue", () => {
  const owing = { ...base, outstanding: 8000, oldestUnpaid: d("2026-11-05") };
  it("starts the day after the due date and repeats on the cadence", () => {
    expect(planReminders([{ ...owing, oldestUnpaid: d("2026-11-10") }], [], cfg, asOf)).toEqual([]);
    expect(planReminders([owing], [], cfg, asOf)[0]).toMatchObject({ kind: "OVERDUE", amount: 8000, daysLate: 5 });
    const sent = (day: string): PlanLog => ({ tenantId: "t1", kind: "OVERDUE", sentAt: d(day) });
    expect(planReminders([owing], [sent("2026-11-08")], cfg, asOf)).toEqual([]);
    expect(planReminders([owing], [sent("2026-11-07")], cfg, asOf)).toHaveLength(1);
  });
  it("stops after the maximum for one unpaid month", () => {
    const logs: PlanLog[] = ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"].map((x) => ({ tenantId: "t1", kind: "OVERDUE", sentAt: d(x) }));
    expect(planReminders([{ ...owing, oldestUnpaid: d("2026-11-05") }], logs, { before: 2, overdueEvery: 1 }, asOf)).toEqual([]);
  });
  it("can be switched off", () => {
    expect(planReminders([owing], [], { before: 2, overdueEvery: 0 }, asOf)).toEqual([]);
  });
});

describe("planReminders: guard rails", () => {
  const owing = { ...base, outstanding: 5000, oldestUnpaid: d("2026-11-01") };
  it("never sends twice in a day", () => {
    expect(planReminders([owing], [{ tenantId: "t1", kind: "DUE_SOON", sentAt: d("2026-11-10") }], cfg, asOf)).toEqual([]);
  });
  it("leaves alone a tenant who just said they paid, then resumes", () => {
    expect(planReminders([{ ...owing, payClaimedAt: d("2026-11-09") }], [], cfg, asOf)).toEqual([]);
    expect(planReminders([{ ...owing, payClaimedAt: d("2026-11-05") }], [], cfg, asOf)).toHaveLength(1);
  });
  it("skips numbers that cannot be messaged", () => {
    expect(planReminders([{ ...owing, phone: "12345" }], [], cfg, asOf)).toEqual([]);
  });
});

describe("whatsapp helpers", () => {
  it("normalises Indian numbers", () => {
    expect(waNumber("98765 43210")).toBe("919876543210");
    expect(waNumber("+91 98765-43210")).toBe("919876543210");
    expect(waNumber("0919876543210")).toBe("919876543210");
    expect(waNumber("12345")).toBeNull();
  });
  it("cleans template variables and builds the payload", () => {
    expect(cleanParam("a\nb\t c    d")).toBe("a b c d");
    expect(cleanParam("")).toBe("-");
    const p = buildTemplatePayload({ to: "919876543210", template: "rent_overdue", language: "kn", params: ["Asha", "Sunrise PG", "₹8,000", "https://x/pay/1"] });
    expect(p.template.language.code).toBe("kn");
    expect(p.template.components[0].parameters).toHaveLength(4);
    expect(p.template.components[0].parameters[0]).toEqual({ type: "text", text: "Asha" });
  });
});
