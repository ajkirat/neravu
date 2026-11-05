import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { monthRange, periodKey, today } from "@/lib/dates";
import { fmtDate, methodLabel, rupees } from "@/lib/format";
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
  const owner = await requireOwner();
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
        title="Payments"
        subtitle="Every rupee received, with receipts."
        actions={
          <>
            <Link href="/reminders" className="btn-secondary">
              Remind overdue
            </Link>
            <MonthPicker base="/payments" month={month} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card flex flex-wrap items-center gap-x-8 gap-y-2 p-4">
            <div>
              <p className="text-xs text-muted uppercase">Net received</p>
              <p className="text-2xl font-bold text-brand-900">{rupees(total)}</p>
            </div>
            {[...byMethod].map(([m, v]) => (
              <div key={m}>
                <p className="text-xs text-muted uppercase">{methodLabel[m] ?? m}</p>
                <p className="font-semibold">{rupees(v)}</p>
              </div>
            ))}
          </div>
          {payments.length === 0 ? (
            <EmptyState title="No payments this month" body="Payments you record will show up here." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tenant</th>
                    <th>Method</th>
                    <th className="text-right">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="text-sm whitespace-nowrap text-muted">{fmtDate(p.paidOn)}</td>
                      <td>
                        <Link href={`/tenants/${p.tenantId}`} className="font-medium hover:underline">
                          {p.tenant.name}
                        </Link>
                        <div className="text-xs text-muted">{p.tenant.property.name}</div>
                      </td>
                      <td className="text-sm">
                        {methodLabel[p.method] ?? p.method}
                        {p.reference && <div className="text-xs text-muted">{p.reference}</div>}
                      </td>
                      <td className={`text-right font-semibold ${p.amount < 0 ? "text-red-700" : ""}`}>
                        {rupees(p.amount)}
                      </td>
                      <td className="text-right">
                        <Link href={`/payments/${p.id}/receipt`} className="text-xs text-brand-600 hover:underline">
                          Receipt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <Card title="Record a payment">
          {tenants.length ? (
            <PaymentForm
              tenants={tenants.map((t) => ({
                id: t.id,
                name: t.name,
                detail: t.bed ? `${t.property.name}, ${t.bed.room.number}${t.bed.label}` : t.property.name,
              }))}
            />
          ) : (
            <p className="text-sm text-muted">Add tenants first to record their payments.</p>
          )}
        </Card>
      </div>
    </>
  );
}
