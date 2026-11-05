import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, reminderLink, rupees } from "@/lib/format";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";
import { payTokens } from "@/lib/paylink";
import { payLinksOn } from "@/lib/pay-mode";
import { appOrigin } from "@/lib/url";
import { getT } from "@/lib/i18n/server";
import { asLang } from "@/lib/i18n";
import { RemindButton } from "@/components/remind-button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Remind overdue" };

export default async function RemindersPage() {
  const owner = await requireOwner();
  const { t: tr, lang } = await getT();
  await syncRentCharges(owner.id);
  const balances = await tenantBalances(owner.id);
  const owing = [...balances.values()].filter((b) => b.outstanding > 0);
  const tenants = owing.length
    ? await db.tenant.findMany({
        where: { ownerId: owner.id, id: { in: owing.map((b) => b.tenantId) } },
        include: { property: true, bed: { include: { room: true } } },
      })
    : [];
  const tokens = payLinksOn(owner) ? await payTokens(owner.id, tenants.map((t) => t.id)) : new Map<string, string>();
  const origin = await appOrigin();
  const rows = tenants
    .map((t) => ({ t, b: balances.get(t.id)! }))
    .sort((x, y) => y.b.overdueDays - x.b.overdueDays || y.b.outstanding - x.b.outstanding);
  const total = rows.reduce((s, r) => s + r.b.outstanding, 0);

  return (
    <>
      <PageHeader
        title={tr("remindTitle")}
        subtitle={rows.length ? tr("remindSub", { n: rows.length, amt: rupees(total) }) : undefined}
        back={{ href: "/payments", label: tr("paymentsTitle") }}
      />
      {!payLinksOn(owner) && rows.length > 0 && (
        <p className="mb-4 rounded-lg bg-marigold-100 px-3 py-2 text-sm text-marigold-700">
          <Link href="/settings" className="font-medium underline">{tr("addUpiTip")}</Link>
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState title={tr("nobodyOwes")} body={tr("nobodyOwesBody")} />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {rows.map(({ t, b }) => {
              const token = tokens.get(t.id);
              const href = reminderLink({
                phone: t.phone,
                tenantName: t.name,
                amount: b.outstanding,
                propertyName: owner.businessName ?? t.property.name,
                since: b.oldestUnpaid,
                payUrl: token ? `${origin}/pay/${token}` : undefined,
                lang: asLang(t.language ?? lang),
              });
              const sentToday = t.lastRemindedAt && Date.now() - t.lastRemindedAt.getTime() < 24 * 3600 * 1000;
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/tenants/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {t.property.name}
                      {t.bed ? ` · ${t.bed.room.number}${t.bed.label}` : ""} · {tr("daysOverdueRow", { n: b.overdueDays })}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {t.payClaimedAt && <Badge tone="amber">{tr("saysPaid")}</Badge>}
                      {t.lastRemindedAt && <Badge>{tr("remindedOn", { date: fmtDate(t.lastRemindedAt, lang) })}</Badge>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-700">{rupees(b.outstanding)}</span>
                    <RemindButton href={href} tenantId={t.id} again={!!sentToday} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
