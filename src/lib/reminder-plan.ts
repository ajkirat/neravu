import { diffDays } from "./dates";

export type ReminderKind = "DUE_SOON" | "OVERDUE";

export type PlanTenant = {
  id: string;
  phone: string;
  status: "ACTIVE" | "NOTICE";
  monthlyRent: number;
  outstanding: number;
  oldestUnpaid: Date | null;
  /** Date the next rent falls due, or null if no more rent will be billed (moving out before then). */
  nextDue: Date | null;
  payClaimedAt: Date | null;
};
export type PlanLog = { tenantId: string; kind: ReminderKind; sentAt: Date };
export type PlanSettings = { before: number; overdueEvery: number };
export type PlanItem = { tenantId: string; kind: ReminderKind; amount: number; daysLate: number };

/** After this many overdue reminders for one unpaid month we stop and leave it to the owner. */
export const MAX_OVERDUE_REMINDERS = 4;
/** A tenant who just said "I've paid" is not nagged for this many days. */
export const CLAIM_GRACE_DAYS = 2;

const sameDay = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

/**
 * Decide who should get a WhatsApp reminder today. Pure: no database, no clock.
 * - DUE_SOON: nothing owed, and rent falls due exactly `before` days from today.
 * - OVERDUE: money is owed and at least a day late; repeated every `overdueEvery` days, at most
 *   MAX_OVERDUE_REMINDERS times per unpaid month.
 * - Never twice in one day, never to someone who just said they paid, never without a usable number.
 */
export function planReminders(tenants: PlanTenant[], logs: PlanLog[], settings: PlanSettings, asOf: Date): PlanItem[] {
  const out: PlanItem[] = [];
  for (const t of tenants) {
    if (t.phone.replace(/\D/g, "").length < 10) continue;
    if (t.payClaimedAt && diffDays(asOf, t.payClaimedAt) <= CLAIM_GRACE_DAYS) continue;
    const mine = logs.filter((l) => l.tenantId === t.id);
    if (mine.some((l) => sameDay(l.sentAt, asOf))) continue;

    if (t.outstanding > 0 && t.oldestUnpaid) {
      const daysLate = diffDays(asOf, t.oldestUnpaid);
      if (settings.overdueEvery <= 0 || daysLate < 1) continue;
      const since = mine.filter((l) => l.kind === "OVERDUE" && l.sentAt >= t.oldestUnpaid!);
      if (since.length >= MAX_OVERDUE_REMINDERS) continue;
      const last = since.reduce<Date | null>((m, l) => (!m || l.sentAt > m ? l.sentAt : m), null);
      if (last && diffDays(asOf, last) < settings.overdueEvery) continue;
      out.push({ tenantId: t.id, kind: "OVERDUE", amount: t.outstanding, daysLate });
    } else if (t.outstanding <= 0 && t.nextDue && settings.before > 0 && diffDays(t.nextDue, asOf) === settings.before) {
      out.push({ tenantId: t.id, kind: "DUE_SOON", amount: t.monthlyRent, daysLate: 0 });
    }
  }
  return out;
}
