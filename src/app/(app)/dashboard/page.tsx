import Link from "next/link";
import { db } from "@/lib/db";
import { TodayList } from "@/components/today-list";
import { requireActor } from "@/lib/auth";
import { nextDueDate } from "@/lib/billing";
import { addDays, diffDays, monthRange, periodKey, today } from "@/lib/dates";
import { fmtDate, fmtPeriod, reminderLink, rupees } from "@/lib/format";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";
import { payTokens } from "@/lib/paylink";
import { payLinksOn } from "@/lib/pay-mode";
import { appOrigin } from "@/lib/url";
import { getT } from "@/lib/i18n/server";
import { asLang } from "@/lib/i18n";
import { QuickCollect } from "@/components/quick-collect";
import { Icon } from "@/components/nav";
import { navIcon } from "@/lib/nav-items";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const { owner, role, staff } = await requireActor();
  const isOwner = role === "OWNER";
  const { t, lang } = await getT();
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
  const tokens = payLinksOn(owner) ? await payTokens(owner.id, dues.map((d) => d.t.id)) : new Map<string, string>();
  const origin = await appOrigin();
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
        <PageHeader title={t("welcome", { name: owner.name.split(" ")[0] })} subtitle={t("setupFirst")} />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", t("step1Title"), t("step1Body"), "/properties"],
            ["2", t("step2Title"), t("step2Body"), "/properties"],
            ["3", t("step3Title"), t("step3Body"), "/tenants/new"],
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
      {sp.denied && (
        <p role="alert" className="mb-4 rounded-lg bg-marigold-100 px-4 py-2.5 text-sm text-marigold-700">
          {t("deniedBanner")}
        </p>
      )}
      <PageHeader
        title={t("greeting", { name: (isOwner ? owner.name : (staff?.name ?? owner.name)).split(" ")[0] })}
        subtitle={t("howLook", { date: fmtDate(asOf, lang) })}
      />
      <TodayList ownerId={owner.id} isOwner={isOwner} staffId={staff?.id ?? null} autoReminders={owner.autoReminders} />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 lg:grid-cols-4">
        <Stat label={t("occupancy")} value={`${occupancy}%`} hint={t("bedsFilled", { occ: occupied, beds: totalBeds })} tone="brand" />
        <Stat
          label={t("pendingDues")}
          value={rupees(totalDues)}
          hint={dues.length === 1 ? t("tenantOne") : t("tenantsN", { n: dues.length })}
          tone={totalDues ? "warn" : "good"}
        />
        {isOwner && <Stat label={t("collectedIn", { month: fmtPeriod(month, lang).split(" ")[0] })} value={rupees(collected)} />}
        {isOwner && <Stat label={t("expensesMonth")} value={rupees(spent)} hint={t("netAmt", { amt: rupees(collected - spent) })} />}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:grid-cols-6 sm:gap-3">
        {[
          { href: "/payments", label: t("qaCollect"), icon: navIcon("/payments"), tone: "bg-brand-600 text-white" },
          ...(isOwner
            ? [
                { href: "/tenants/new", label: t("qaAddTenant"), icon: navIcon("/tenants"), tone: "bg-white" },
                { href: "/expenses", label: t("qaExpense"), icon: navIcon("/expenses"), tone: "bg-white" },
              ]
            : []),
          { href: "/reminders", label: t("qaRemind"), icon: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0", tone: "bg-marigold-100" },
          { href: "/announce", label: t("navAnnounce"), icon: "M3 11l15-6v14L3 13zM8 13v5", tone: "bg-white" },
          ...(isOwner
            ? [{ href: "/cashbook", label: t("navCashbook"), icon: navIcon("/expenses"), tone: "bg-white" }]
            : [{ href: "/complaints", label: t("qaComplaints"), icon: navIcon("/complaints"), tone: "bg-white" }]),
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className={`card flex flex-col items-center gap-1 px-1 py-3 text-center text-sm font-semibold hover:shadow-sm ${q.tone}`}
          >
            <Icon d={q.icon} className="h-7 w-7" />
            <span className="leading-tight">{q.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={t("duesToCollect")}
          action={
            <span className="flex items-center gap-3">
              <Link href="/reminders" className="text-xs font-medium text-brand-600 hover:underline">
                {t("remindAll")}
              </Link>
              <Link href="/tenants?tab=dues" className="text-xs font-medium text-brand-600 hover:underline">
                {t("viewAll")}
              </Link>
            </span>
          }
          padded={false}
        >
          {dues.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t("noDues")} />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {dues.slice(0, 10).map(({ t: tn, b }) => (
                <li key={tn.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1 basis-40">
                    <Link href={`/tenants/${tn.id}`} className="text-base font-medium sm:text-sm text-brand-900 hover:underline">
                      {tn.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {tn.status === "MOVED_OUT" ? `${tn.property.name} · ${t("movedOutShort")}` : bedText(tn)}
                    </p>
                    {tn.payClaimedAt && (
                      <p className="mt-1">
                        <Badge tone="amber">{t("saysPaid")}</Badge>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-700">{rupees(b.outstanding)}</p>
                    <p className="text-xs text-muted">
                      {b.overdueDays === 0 ? t("dueToday") : t("daysOverdue", { n: b.overdueDays })}
                    </p>
                  </div>
                  <div className="flex w-full gap-2 [&>*]:flex-1 sm:w-auto sm:[&>*]:flex-none">
                    <a
                      className="btn-accent btn-sm"
                      target="_blank"
                      rel="noreferrer"
                      href={reminderLink({
                        phone: tn.phone,
                        tenantName: tn.name,
                        amount: b.outstanding,
                        propertyName: owner.businessName ?? tn.property.name,
                        since: b.oldestUnpaid,
                        lang: asLang(tn.language ?? lang),
                        payUrl: tokens.get(tn.id) ? `${origin}/pay/${tokens.get(tn.id)}` : undefined,
                      })}
                    >
                      {t("remind")}
                    </a>
                    <Link href={`/tenants/${tn.id}`} className="btn-secondary btn-sm">
                      {t("collect")}
                    </Link>
                  </div>
                  <div className="w-full">
                    <QuickCollect tenantId={tn.id} name={tn.name} amount={rupees(b.outstanding)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title={t("rentDueWeek")} padded={false}>
            {upcoming.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">{t("noRentWeek")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map(({ t: tn, due }) => (
                  <li key={tn.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <Link href={`/tenants/${tn.id}`} className="truncate hover:underline">
                      {tn.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">
                      {rupees(tn.monthlyRent)} · {diffDays(due, asOf) === 0 ? t("todayLower") : fmtDate(due, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("upcomingMoveOuts")} padded={false}>
            {leaving.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">{t("nobodyNotice")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {leaving.map((tn) => (
                  <li key={tn.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <Link href={`/tenants/${tn.id}`} className="truncate hover:underline">
                      {tn.name}
                    </Link>
                    <Badge tone="amber">{fmtDate(tn.moveOutDate, lang)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("occByProperty")}>
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
