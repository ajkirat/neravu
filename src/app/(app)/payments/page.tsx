import Link from "next/link";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { monthRange, periodKey, today } from "@/lib/dates";
import { fmtDate, methodText, rupees } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { MonthPicker } from "@/components/month-picker";
import { PaymentForm } from "@/components/payment-form";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const { owner } = await requireActor();
  const { t, lang } = await getT();
  const month = sp.month && monthRange(sp.month) ? sp.month : periodKey(today());
  const range = monthRange(month)!;
  const [payments, tenants] = await Promise.all([
    db.payment.findMany({
      where: { tenant: { ownerId: owner.id }, paidOn: { gte: range.start, lt: range.end } },
      include: { tenant: { include: { property: true } } },
      orderBy: [{ paidOn: "desc" }, { id: "desc" }],
    }),
    db.tenant.findMany({
      where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } },
      include: { property: true, bed: { include: { room: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const byMethod = new Map<string, number>();
  for (const p of payments) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);

  return (
    <>
      <PageHeader
        title={t("paymentsTitle")}
        subtitle={t("paymentsSub")}
        actions={
          <>
            <Link href="/reminders" className="btn-secondary">
              {t("remindOverdue")}
            </Link>
            <MonthPicker base="/payments" month={month} />
          </>
        }
      />
      <div className="space-y-4">
        <Card title={t("recordPaymentCard")}>
          {tenants.length ? (
            <PaymentForm wide
              tenants={tenants.map((t) => ({
                id: t.id,
                name: t.name,
                detail: t.bed ? `${t.property.name}, ${t.bed.room.number}${t.bed.label}` : t.property.name,
              }))}
            />
          ) : (
            <p className="text-sm text-muted">{t("addTenantsFirst")}</p>
          )}
        </Card>
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center gap-x-8 gap-y-2 p-4">
            <div>
              <p className="text-xs text-muted uppercase">{t("netReceived")}</p>
              <p className="text-2xl font-bold text-brand-900">{rupees(total)}</p>
            </div>
            {[...byMethod].map(([m, v]) => (
              <div key={m}>
                <p className="text-xs text-muted uppercase">{methodText(t, m)}</p>
                <p className="font-semibold">{rupees(v)}</p>
              </div>
            ))}
          </div>
          {payments.length === 0 ? (
            <EmptyState title={t("noPayments")} body={t("noPaymentsBody")} />
          ) : (
            <>
            <ul className="space-y-2 md:hidden">
              {payments.map((p) => (
                <li key={p.id} className="card flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <Link href={`/tenants/${p.tenantId}`} className="block truncate text-base font-semibold text-brand-900">
                      {p.tenant.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {fmtDate(p.paidOn, lang)} · {methodText(t, p.method)}
                    </p>
                    {p.reference && <p className="truncate text-xs text-muted">{p.reference}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-base font-bold ${p.amount < 0 ? "text-red-700" : "text-brand-900"}`}>{rupees(p.amount)}</p>
                    <Link href={`/payments/${p.id}/receipt`} className="text-sm text-brand-600 underline">
                      {t("receipt")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <div className="card hidden overflow-x-auto md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("date")}</th>
                    <th>{t("colTenant")}</th>
                    <th>{t("colMethod")}</th>
                    <th className="text-right">{t("colAmount")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="text-sm whitespace-nowrap text-muted">{fmtDate(p.paidOn, lang)}</td>
                      <td>
                        <Link href={`/tenants/${p.tenantId}`} className="font-medium hover:underline">
                          {p.tenant.name}
                        </Link>
                        <div className="text-xs text-muted">{p.tenant.property.name}</div>
                      </td>
                      <td className="text-sm">
                        {methodText(t, p.method)}
                        {p.reference && <div className="text-xs text-muted">{p.reference}</div>}
                        {p.recordedByName && <div className="text-xs text-muted">{t("recordedByName", { name: p.recordedByName })}</div>}
                      </td>
                      <td className={`text-right font-semibold ${p.amount < 0 ? "text-red-700" : ""}`}>
                        {rupees(p.amount)}
                      </td>
                      <td className="text-right">
                        <Link href={`/payments/${p.id}/receipt`} className="text-xs text-brand-600 hover:underline">
                          {t("receipt")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
