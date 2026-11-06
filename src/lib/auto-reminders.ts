import "server-only";
import { db } from "./db";
import { nextDueDate } from "./billing";
import { isQuietHours, today } from "./dates";
import { rupees } from "./format";
import { asLang } from "./i18n";
import { syncRentCharges, tenantBalances } from "./ledger";
import { payLinksOn } from "./pay-mode";
import { payTokens } from "./paylink";
import { needsCall, planReminders, type PlanItem, type PlanLog, type PlanTenant, type ReminderKind } from "./reminder-plan";
import { appOrigin } from "./url";
import { sendTemplate, templateNames, whatsappConfigured } from "./whatsapp";

const MAX_PER_OWNER = 200;

type OwnerRow = {
  id: string;
  name: string;
  phone: string | null;
  businessName: string | null;
  language: string;
  paymentMode: string;
  upiId: string | null;
  razorpayEnabled: boolean;
  remindBefore: number;
  remindOverdueEvery: number;
};

export const ownerSelect = {
  id: true,
  name: true,
  phone: true,
  businessName: true,
  language: true,
  paymentMode: true,
  upiId: true,
  razorpayEnabled: true,
  remindBefore: true,
  remindOverdueEvery: true,
} as const;

/** Who would get a reminder today, with names for display. Read-only. */
export async function buildPlan(owner: OwnerRow, asOf = today()) {
  return (await ladder(owner, asOf)).items;
}

/** Today's reminders, plus the people who have had every reminder and should get a call. Read-only. */
export async function ladder(owner: OwnerRow, asOf = today()) {
  await syncRentCharges(owner.id);
  const [tenants, balances, logs] = await Promise.all([
    db.tenant.findMany({
      where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } },
      select: { id: true, name: true, phone: true, status: true, monthlyRent: true, moveInDate: true, moveOutDate: true, rentDueDay: true, payClaimedAt: true, remindersPausedUntil: true, language: true },
    }),
    tenantBalances(owner.id),
    db.reminderLog.findMany({
      where: { ownerId: owner.id, status: "SENT", kind: { in: ["DUE_SOON", "OVERDUE"] }, sentAt: { gte: new Date(asOf.getTime() - 120 * 86400_000) } },
      select: { tenantId: true, kind: true, sentAt: true },
    }),
  ]);
  const planTenants: PlanTenant[] = tenants.map((t) => {
    const b = balances.get(t.id);
    const next = nextDueDate({ moveIn: t.moveInDate, dueDay: t.rentDueDay, asOf });
    return {
      id: t.id,
      phone: t.phone,
      status: t.status as "ACTIVE" | "NOTICE",
      monthlyRent: t.monthlyRent,
      outstanding: b?.outstanding ?? 0,
      oldestUnpaid: b?.oldestUnpaid ?? null,
      nextDue: !t.moveOutDate || next < t.moveOutDate ? next : null,
      payClaimedAt: t.payClaimedAt,
      pausedUntil: t.remindersPausedUntil,
    };
  });
  const planLogs: PlanLog[] = logs.filter((l) => l.tenantId).map((l) => ({ tenantId: l.tenantId!, kind: l.kind as ReminderKind, sentAt: l.sentAt }));
  const items = planReminders(planTenants, planLogs, { before: owner.remindBefore, overdueEvery: owner.remindOverdueEvery }, asOf);
  const byId = new Map(tenants.map((t) => [t.id, t]));
  const calls = planTenants
    .filter((p) => needsCall(p, planLogs) && !(p.pausedUntil && p.pausedUntil > asOf))
    .map((p) => ({ tenant: byId.get(p.id)!, amount: p.outstanding }));
  return { items: items.map((i) => ({ ...i, tenant: byId.get(i.tenantId)! })), calls };
}

export type RunSummary = { planned: number; sent: number; failed: number; stopped?: string };

/** Send today's reminders for one owner and log every attempt. */
export async function runForOwner(owner: OwnerRow): Promise<RunSummary> {
  if (!whatsappConfigured()) return { planned: 0, sent: 0, failed: 0, stopped: "WhatsApp is not connected" };
  // Never message people at night, whoever starts the run.
  if (isQuietHours()) return { planned: 0, sent: 0, failed: 0, stopped: "Quiet hours (9 pm - 8 am)" };
  const plan = (await buildPlan(owner)).slice(0, MAX_PER_OWNER);
  const tokens = payLinksOn(owner) ? await payTokens(owner.id, plan.map((p) => p.tenantId)) : new Map<string, string>();
  const origin = tokens.size ? await appOrigin() : "";
  const names = templateNames();
  const pg = owner.businessName ?? owner.name;
  let sent = 0;
  let failed = 0;
  for (const item of plan) {
    const t = item.tenant;
    const token = tokens.get(t.id);
    // {{4}} is the pay link, or the owner's phone when online payment is not set up.
    const contact = token ? `${origin}/pay/${token}` : (owner.phone ?? "-");
    const res = await sendTemplate({
      phone: t.phone,
      template: item.kind === "DUE_SOON" ? names.dueSoon : names.overdue,
      language: asLang(t.language ?? owner.language),
      params: [t.name.split(" ")[0], pg, rupees(item.amount), contact],
    });
    await db.reminderLog.create({
      data: { ownerId: owner.id, tenantId: t.id, kind: item.kind, status: res.ok ? "SENT" : "FAILED", amount: item.amount, detail: res.ok ? null : res.detail.slice(0, 200) },
    });
    if (res.ok) {
      sent += 1;
      await db.tenant.update({ where: { id: t.id }, data: { lastRemindedAt: new Date() } });
    } else {
      failed += 1;
      // If WhatsApp refuses our access, every other message would fail too: stop for this run.
      if (res.reason === "auth" || res.reason === "off") return { planned: plan.length, sent, failed, stopped: res.detail };
    }
  }
  return { planned: plan.length, sent, failed };
}

export type { PlanItem };
