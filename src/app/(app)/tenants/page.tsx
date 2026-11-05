import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, rupees } from "@/lib/format";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";
import { Badge, EmptyState, PageHeader, TenantStatusBadge } from "@/components/ui";

export const metadata = { title: "Tenants" };

const TABS = [
  { key: "current", label: "Current", statuses: ["ACTIVE", "NOTICE"] },
  { key: "dues", label: "With dues", statuses: ["ACTIVE", "NOTICE", "MOVED_OUT"] },
  { key: "notice", label: "On notice", statuses: ["NOTICE"] },
  { key: "past", label: "Moved out", statuses: ["MOVED_OUT"] },
];

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab = "current", q = "" } = await searchParams;
  const owner = await requireOwner();
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  await syncRentCharges(owner.id);
  const [tenants, balances] = await Promise.all([
    db.tenant.findMany({
      where: {
        ownerId: owner.id,
        status: { in: active.statuses },
        ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {}),
      },
      include: { property: true, bed: { include: { room: true } } },
      orderBy: { name: "asc" },
    }),
    tenantBalances(owner.id),
  ]);
  const rows =
    active.key === "dues"
      ? tenants
          .filter((t) => (balances.get(t.id)?.outstanding ?? 0) > 0)
          .sort((a, b) => balances.get(b.id)!.outstanding - balances.get(a.id)!.outstanding)
      : tenants;

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle="Everyone staying with you, their bed and what they owe."
        actions={
          <Link href="/tenants/new" className="btn-primary">
            Add tenant
          </Link>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/tenants?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                t.key === active.key ? "bg-brand-600 text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form className="sm:w-64">
          <input type="hidden" name="tab" value={active.key} />
          <input className="input" name="q" defaultValue={q} placeholder="Search name or phone" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={q ? "No tenants match your search" : "No tenants here"}
          body={active.key === "current" ? "Add a tenant to a vacant bed to start tracking rent." : undefined}
          action={
            active.key === "current" && !q ? (
              <Link href="/tenants/new" className="btn-primary">
                Add tenant
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Bed</th>
                <th>Rent</th>
                <th>Since</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const b = balances.get(t.id);
                return (
                  <tr key={t.id} className="hover:bg-canvas/60">
                    <td>
                      <Link href={`/tenants/${t.id}`} className="font-medium text-brand-900 hover:underline">
                        {t.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        {t.phone} <TenantStatusBadge status={t.status} />
                      </div>
                    </td>
                    <td className="text-sm">
                      <div>{t.property.name}</div>
                      <div className="text-xs text-muted">
                        {t.bed ? `Room ${t.bed.room.number} · Bed ${t.bed.label}` : "—"}
                      </div>
                    </td>
                    <td>{rupees(t.monthlyRent)}</td>
                    <td className="text-sm text-muted">{fmtDate(t.moveInDate)}</td>
                    <td className="text-right">
                      {b && b.outstanding > 0 ? (
                        <Badge tone="red">{rupees(b.outstanding)} due</Badge>
                      ) : b && b.advance > 0 ? (
                        <Badge tone="green">{rupees(b.advance)} advance</Badge>
                      ) : (
                        <Badge tone="green">Settled</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
