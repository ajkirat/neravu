import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, rupees } from "@/lib/format";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { TenantStatusBadge } from "@/components/tenant-status";
import type { MsgKey } from "@/lib/i18n";

export const metadata = { title: "Tenants" };

const TABS: { key: string; label: MsgKey; statuses: string[] }[] = [
  { key: "current", label: "tabCurrent", statuses: ["ACTIVE", "NOTICE"] },
  { key: "dues", label: "tabDues", statuses: ["ACTIVE", "NOTICE", "MOVED_OUT"] },
  { key: "notice", label: "tabNotice", statuses: ["NOTICE"] },
  { key: "past", label: "tabPast", statuses: ["MOVED_OUT"] },
];

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab = "current", q = "" } = await searchParams;
  const owner = await requireOwner();
  const { t, lang } = await getT();
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
        title={t("tenantsTitle")}
        subtitle={t("tenantsSub")}
        actions={
          <Link href="/tenants/new" className="btn-primary">
            {t("addTenant")}
          </Link>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/tenants?tab=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                tab.key === active.key ? "bg-brand-600 text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t(tab.label)}
            </Link>
          ))}
        </div>
        <form className="sm:w-64">
          <input type="hidden" name="tab" value={active.key} />
          <input className="input" name="q" defaultValue={q} placeholder={t("searchTenants")} />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={q ? t("noMatch") : t("noTenantsHere")}
          body={active.key === "current" ? t("noTenantsBody") : undefined}
          action={
            active.key === "current" && !q ? (
              <Link href="/tenants/new" className="btn-primary">
                {t("addTenant")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t("colTenant")}</th>
                <th>{t("colBed")}</th>
                <th>{t("colRent")}</th>
                <th>{t("colSince")}</th>
                <th className="text-right">{t("colBalance")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tn) => {
                const b = balances.get(tn.id);
                return (
                  <tr key={tn.id} className="hover:bg-canvas/60">
                    <td>
                      <Link href={`/tenants/${tn.id}`} className="font-medium text-brand-900 hover:underline">
                        {tn.name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        {tn.phone} <TenantStatusBadge status={tn.status} />
                      </div>
                    </td>
                    <td className="text-sm">
                      <div>{tn.property.name}</div>
                      <div className="text-xs text-muted">
                        {tn.bed ? t("roomBed", { r: tn.bed.room.number, b: tn.bed.label }) : "—"}
                      </div>
                    </td>
                    <td>{rupees(tn.monthlyRent)}</td>
                    <td className="text-sm text-muted">{fmtDate(tn.moveInDate, lang)}</td>
                    <td className="text-right">
                      {b && b.outstanding > 0 ? (
                        <Badge tone="red">{t("dueAmt", { amt: rupees(b.outstanding) })}</Badge>
                      ) : b && b.advance > 0 ? (
                        <Badge tone="green">{t("advanceAmt", { amt: rupees(b.advance) })}</Badge>
                      ) : (
                        <Badge tone="green">{t("settled")}</Badge>
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
