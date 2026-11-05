import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { nextDueDate } from "@/lib/billing";
import { addDays, diffDays, monthRange, periodKey, today } from "@/lib/dates";
import { fmtDate, fmtPeriod, reminderLink, rupees } from "@/lib/format";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const owner = await requireOwner();
  const asOf = today();
  const month = periodKey(asOf);
  const range = monthRange(month)!;
  await syncRentCharges(owner.id);

  const [properties, tenants, balances, monthPayments, monthExpenses] = await Promise.all([
    db.property.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: "asc" },
      include: { rooms: { select: { beds: { select: { id: true } } } } },
    }),
    db.tenant.findMany({
      where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } },
      include: { property: true, bed: { include: { room: true } } },
    }),
    tenantBalances(owner.id),
    db.payment.aggregate({
      where: { tenant: { ownerId: owner.id }, paidOn: { gte: range.start, lt: range.end }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { ownerId: owner.id, spentOn: { gte: range.start, lt: range.end } },
      _sum: { amount: true },
    }),
  ]);

  const totalBeds = properties.reduce((s, p) => s + p.rooms.reduce((x, r) => x + r.beds.length, 0), 0);
  const occupied = tenants.length;
  const occupancy = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;
  const collected = monthPayments._sum.amount ?? 0;
  const spent = monthExpenses._sum.amount ?? 0;

  // Dues include tenants who already moved out but still owe money.
  const allTenants = await db.tenant.findMany({
    where: { ownerId: owner.id, id: { in: [...balances.values()].filter((b) => b.outstanding > 0).map((b) => b.tenantId) } },
    include: { property: true, bed: { include: { room: true } } },
  });
  const dues = allTenants
    .map((t) => ({ t, b: balances.get(t.id)! }))
    .sort((a, b) => b.b.overdueDays - a.b.overdueDays || b.b.outstanding - a.b.outstanding);
  const totalDues = dues.reduce((s, d) => s + d.b.outstanding, 0);

  const upcoming = tenants
    .filter((t) => t.status === "ACTIVE")
    .map((t) => ({ t, due: nextDueDate({ moveIn: t.moveInDate, dueDay: t.rentDueDay, asOf }) }))
    .filter((x) => x.due <= addDays(asOf, 7))
    .sort((a, b) => a.due.getTime() - b.due.getTime());

  const leaving = tenants
    .filter((t) => t.status === "NOTICE" && t.moveOutDate)
    .sort((a, b) => a.moveOutDate!.getTime() - b.moveOutDate!.getTime());

  const bedText = (t: (typeof tenants)[number]) =>
    `${t.property.name}${t.bed ? ` · ${t.bed.room.number}${t.bed.label}` : ""}`;

  if (properties.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome, ${owner.name.split(" ")[0]}`} subtitle="Let's set up your first PG." />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Add your property", "Name and address of your PG.", "/properties"],
            ["2", "Add rooms and beds", "Pick the sharing type and rent per bed.", "/properties"],
            ["3", "Onboard tenants", "Assign beds; rent starts billing automatically.", "/tenants/new"],
          ].map(([n, title, body, href]) => (
            <Link key={n} href={href} className="card block p-5 hover:border-brand-200">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-marigold-100 text-sm font-bold text-marigold-700">
                {n}
              </span>
              <p className="mt-3 font-semibold text-brand-900">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Hello, ${owner.name.split(" ")[0]}`}
        subtitle={`Here is how your PGs look on ${fmtDate(asOf)}.`}
        actions={
          <>
            <Link href="/payments" className="btn-secondary">
              Record payment
            </Link>
            <Link href="/tenants/new" className="btn-primary">
              Add tenant
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Occupancy" value={`${occupancy}%`} hint={`${occupied} of ${totalBeds} beds filled`} tone="brand" />
        <Stat
          label="Pending dues"
          value={rupees(totalDues)}
          hint={`${dues.length} tenant${dues.length === 1 ? "" : "s"}`}
          tone={totalDues ? "warn" : "good"}
        />
        <Stat label={`Collected in ${fmtPeriod(month).split(" ")[0]}`} value={rupees(collected)} />
        <Stat label="Expenses this month" value={rupees(spent)} hint={`Net ${rupees(collected - spent)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Dues to collect"
          action={
            <Link href="/tenants?tab=dues" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
          padded={false}
        >
          {dues.length === 0 ? (
            <div className="p-5">
              <EmptyState title="All caught up" body="No one owes you anything right now." />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {dues.slice(0, 10).map(({ t, b }) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/tenants/${t.id}`} className="font-medium text-brand-900 hover:underline">
                      {t.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {t.status === "MOVED_OUT" ? `${t.property.name} · moved out` : bedText(t)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-700">{rupees(b.outstanding)}</p>
                    <p className="text-xs text-muted">
                      {b.overdueDays === 0 ? "Due today" : `${b.overdueDays} days overdue`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      className="btn-accent btn-sm"
                      target="_blank"
                      rel="noreferrer"
                      href={reminderLink({
                        phone: t.phone,
                        tenantName: t.name,
                        amount: b.outstanding,
                        propertyName: t.property.name,
                        since: b.oldestUnpaid,
                      })}
                    >
                      Remind
                    </a>
                    <Link href={`/tenants/${t.id}`} className="btn-secondary btn-sm">
                      Collect
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Rent due this week" padded={false}>
            {upcoming.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No rent falls due in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map(({ t, due }) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <Link href={`/tenants/${t.id}`} className="truncate hover:underline">
                      {t.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">
                      {rupees(t.monthlyRent)} · {diffDays(due, asOf) === 0 ? "today" : fmtDate(due)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming move-outs" padded={false}>
            {leaving.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Nobody is on notice.</p>
            ) : (
              <ul className="divide-y divide-line">
                {leaving.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <Link href={`/tenants/${t.id}`} className="truncate hover:underline">
                      {t.name}
                    </Link>
                    <Badge tone="amber">{fmtDate(t.moveOutDate)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Occupancy by property">
            <div className="space-y-3">
              {properties.map((p) => {
                const beds = p.rooms.reduce((s, r) => s + r.beds.length, 0);
                const occ = tenants.filter((t) => t.propertyId === p.id).length;
                const pct = beds ? Math.round((occ / beds) * 100) : 0;
                return (
                  <Link key={p.id} href={`/properties/${p.id}`} className="block">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-muted">
                        {occ}/{beds}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-canvas">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
