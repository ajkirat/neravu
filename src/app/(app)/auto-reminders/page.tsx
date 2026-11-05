import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { buildPlan, ownerSelect } from "@/lib/auto-reminders";
import { fmtDate, rupees } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { whatsappConfigured } from "@/lib/whatsapp";
import { saveAutoReminders } from "@/app/actions/auto-reminders";
import { ActionForm } from "@/components/action-form";
import { AutoReminderButtons } from "@/components/auto-reminder-buttons";
import { Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Automatic reminders" };

export default async function AutoRemindersPage() {
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const connected = whatsappConfigured();
  const row = await db.owner.findUnique({ where: { id: owner.id }, select: ownerSelect });
  const [plan, logs] = await Promise.all([
    row ? buildPlan(row) : [],
    db.reminderLog.findMany({
      where: { ownerId: owner.id },
      include: { tenant: { select: { name: true } } },
      orderBy: { sentAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <>
      <PageHeader title={t("autoTitle")} subtitle={t("autoSub")} back={{ href: "/reminders", label: t("navReminders") }} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <p className={`mb-4 rounded-lg px-3 py-2 text-sm ${connected ? "bg-brand-50 text-brand-700" : "bg-marigold-100 text-marigold-700"}`}>
              {connected ? `✓ ${t("autoConnected")}` : t("autoNotConnected")}
            </p>
            <ActionForm action={saveAutoReminders} submitLabel={t("save")}>
              <label className="flex items-center gap-3 text-sm font-semibold text-brand-900">
                <input type="checkbox" name="enabled" defaultChecked={owner.autoReminders} disabled={!connected && !owner.autoReminders} className="h-5 w-5" />
                {t("autoOn")}
              </label>
              <Field label={t("autoBefore")}>
                <select className="input" name="before" defaultValue={owner.remindBefore}>
                  {[0, 1, 2, 3, 5, 7].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? t("autoOff") : n === 1 ? t("autoDayBefore") : t("autoDaysBefore", { n })}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("autoEvery")}>
                <select className="input" name="every" defaultValue={owner.remindOverdueEvery}>
                  {[0, 2, 3, 5, 7].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? t("autoOff") : t("autoEveryN", { n })}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-muted">{t("autoNote")}</p>
            </ActionForm>
          </Card>
          <Card title={t("autoTodayTitle")}>
            {plan.length === 0 ? (
              <p className="text-sm text-muted">{t("autoTodayNone")}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {plan.map((p) => (
                  <li key={p.tenantId} className="py-2">
                    <p className="font-medium">{p.tenant.name}</p>
                    <p className="text-xs text-muted">
                      {p.kind === "DUE_SOON" ? t("autoRowDue", { amt: rupees(p.amount) }) : t("autoRowLate", { amt: rupees(p.amount), n: p.daysLate })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <AutoReminderButtons planned={plan.length} connected={connected} />
            </div>
          </Card>
        </div>
        <Card title={t("autoLogTitle")} padded={false}>
          {logs.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t("autoLogEmpty")} />
            </div>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.tenant?.name ?? t("logTest")}</p>
                    <p className="text-xs text-muted">
                      {fmtDate(l.sentAt, lang)} · {l.kind === "TEST" ? t("logTest") : l.kind === "DUE_SOON" ? t("autoBefore") : t("autoEvery")}
                      {l.amount ? ` · ${rupees(l.amount)}` : ""}
                    </p>
                    {l.detail && <p className="text-xs text-red-700">{l.detail}</p>}
                  </div>
                  <Badge tone={l.status === "SENT" ? "green" : "red"}>{l.status === "SENT" ? t("logSent") : t("logFailed")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
