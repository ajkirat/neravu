import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, rupees } from "@/lib/format";
import { taggedRupees } from "@/lib/paycode";
import { cashWithStaff } from "@/lib/cash";
import { ladder, ownerSelect } from "@/lib/auto-reminders";
import { billCandidates } from "@/lib/monthly-bill";
import { whatsappConfigured } from "@/lib/whatsapp";
import { getT } from "@/lib/i18n/server";
import { confirmClaim, rejectClaim } from "@/app/actions/claims";
import { assignCredit, ignoreCredit } from "@/app/actions/pay-confirm";
import { acceptLeave, dismissRequest } from "@/app/actions/requests";
import { ActionButton, AssignCredit } from "@/components/today-actions";
import { jobDone, jobLater } from "@/app/actions/jobs";
import { diffDays, today } from "@/lib/dates";

type Props = { ownerId: string; isOwner: boolean; staffId: string | null; autoReminders: boolean };

/**
 * Everything that needs a person today, in one list, each with one button. Neravu does the thinking;
 * a person decides and taps. Money is only ever recorded by those taps (or by a verified bank alert).
 */
export async function TodayList({ ownerId, isOwner, staffId, autoReminders }: Props) {
  const { t, lang } = await getT();
  const ownerRow = await db.owner.findUnique({ where: { id: ownerId }, select: ownerSelect });
  const [jobs, claims, credits, leaves, complaints, joining, cash, lad, bills, tenants] = await Promise.all([
    db.recurringJob.findMany({ where: { ownerId, active: true, nextDue: { lte: today() } }, orderBy: { nextDue: "asc" }, take: 10 }),
    isOwner ? db.paymentClaim.findMany({ where: { ownerId, status: "PENDING" }, include: { tenant: { select: { name: true } } }, orderBy: { createdAt: "asc" } }) : [],
    isOwner ? db.bankCredit.findMany({ where: { ownerId, status: "UNMATCHED" }, orderBy: { createdAt: "asc" }, take: 20 }) : [],
    isOwner ? db.tenantRequest.findMany({ where: { ownerId, status: "PENDING" }, include: { tenant: { select: { name: true } } } }) : [],
    db.complaint.count({ where: { ownerId, status: { not: "RESOLVED" } } }),
    isOwner ? db.joinRequest.count({ where: { ownerId, status: "PENDING" } }) : 0,
    cashWithStaff(ownerId, isOwner ? undefined : (staffId ?? "-")),
    ownerRow ? ladder(ownerRow) : { items: [], calls: [] },
    billCandidates(ownerId),
    isOwner ? db.tenant.findMany({ where: { ownerId, status: { in: ["ACTIVE", "NOTICE"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [],
  ]);
  // With automatic WhatsApp on, reminders go out by themselves; otherwise they wait here for a tap.
  const autoOn = autoReminders && whatsappConfigured();
  const remind = autoOn ? [] : lad.items.filter((i) => i.kind === "OVERDUE");
  const cashTotal = cash.reduce((n, c) => n + c.amount, 0);
  const billIds = new Set(bills.map((b) => b.id));
  const remindOnly = remind.filter((r) => !billIds.has(r.tenantId));
  const count = jobs.length + claims.length + credits.length + leaves.length + (complaints ? 1 : 0) + (joining ? 1 : 0) + (cashTotal ? 1 : 0) + bills.length + remindOnly.length + lad.calls.length;

  const Row = ({ children }: { children: React.ReactNode }) => <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-5">{children}</li>;

  return (
    <section className="card mb-4 sm:mb-6" aria-label={t("todayTitle")}>
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-brand-900">{t("todayTitle")}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${count ? "bg-marigold-100 text-marigold-700" : "bg-brand-50 text-brand-700"}`}>{count || "✓"}</span>
      </header>
      {count === 0 ? (
        <p className="px-4 py-4 text-sm text-muted sm:px-5">{t("todayNothing")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {jobs.map((j) => {
            const late = diffDays(today(), j.nextDue);
            return (
              <Row key={`job-${j.id}`}>
                <span className="text-base">
                  <span className="font-semibold">{t("todayJob", { title: j.title })}</span>
                  <span className="block text-sm text-muted">{late > 0 ? t("jobLate", { n: late }) : t("jobDueToday")}</span>
                </span>
                <span className="flex gap-2">
                  <ActionButton action={jobDone.bind(null, j.id)} label={t("jobDoneBtn")} className="btn-primary btn-sm" />
                  <ActionButton action={jobLater.bind(null, j.id)} label={t("jobLaterBtn")} />
                </span>
              </Row>
            );
          })}
          {claims.map((c) => (
            <Row key={c.id}>
              <span className="min-w-0 text-base">
                <span className="font-semibold">{t("todayClaim", { name: c.tenant.name.split(" ")[0], amt: taggedRupees(c.amount, c.paise) })}</span>
                <span className="block text-sm text-muted">
                  {fmtDate(c.createdAt, lang)}
                  {c.utr ? ` · UTR ${c.utr}` : ""} · {t("todayClaimHint")}
                </span>
              </span>
              <span className="flex gap-2">
                <ActionButton action={confirmClaim.bind(null, c.id)} label={t("todayReceived")} className="btn-primary btn-sm" />
                <ActionButton action={rejectClaim.bind(null, c.id)} label={t("todayNotReceived")} confirm={t("todayNotReceivedConfirm")} />
              </span>
            </Row>
          ))}
          {credits.map((c) => (
            <Row key={c.id}>
              <span className="min-w-0 text-base">
                <span className="font-semibold">{t("todayCredit", { amt: taggedRupees(Math.floor(c.amountPaise / 100), c.amountPaise % 100) })}</span>
                <span className="block text-sm text-muted">{[c.payer, c.utr ? `UTR ${c.utr}` : null, fmtDate(c.createdAt, lang)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                <AssignCredit assign={assignCredit.bind(null, c.id)} tenants={tenants} label={t("todayAssign")} placeholder={t("todayWhose")} />
                <ActionButton action={ignoreCredit.bind(null, c.id)} label={t("todayNotRent")} />
              </span>
            </Row>
          ))}
          {leaves.map((r) => (
            <Row key={r.id}>
              <span className="text-base font-semibold">{t("todayLeave", { name: r.tenant.name.split(" ")[0], date: fmtDate(r.date, lang) })}</span>
              <span className="flex gap-2">
                <ActionButton action={acceptLeave.bind(null, r.id)} label={t("todayAccept")} className="btn-primary btn-sm" />
                <ActionButton action={dismissRequest.bind(null, r.id)} label={t("todayDismiss")} />
              </span>
            </Row>
          ))}
          {bills.map((b) => (
            <Row key={`bill-${b.id}`}>
              <span className="text-base">
                <span className="font-semibold">{t("todayBill", { name: b.name.split(" ")[0], amt: rupees(b.outstanding) })}</span>
              </span>
              <a href={`/send?k=BILL&t=${b.id}`} target="_blank" rel="noreferrer" className="btn-accent btn-sm">
                {t("todaySendBill")}
              </a>
            </Row>
          ))}
          {remindOnly.map((r) => (
            <Row key={`rem-${r.tenantId}`}>
              <span className="text-base font-semibold">{t("todayRemind", { name: r.tenant.name.split(" ")[0], amt: rupees(r.amount), n: r.daysLate })}</span>
              <a href={`/send?k=REMIND&t=${r.tenantId}`} target="_blank" rel="noreferrer" className="btn-accent btn-sm">
                {t("remind")}
              </a>
            </Row>
          ))}
          {lad.calls.map((c) => (
            <Row key={`call-${c.tenant.id}`}>
              <span className="text-base">
                <span className="font-semibold">{t("todayCall", { name: c.tenant.name.split(" ")[0], amt: rupees(c.amount) })}</span>
                <span className="block text-sm text-muted">{t("todayCallHint")}</span>
              </span>
              <a href={`tel:${c.tenant.phone}`} className="btn-secondary btn-sm">
                {t("call")}
              </a>
            </Row>
          ))}
          {joining > 0 && (
            <Row>
              <Link href="/tenants/joining" className="text-base font-semibold text-marigold-700 hover:underline">
                {t("joiningBanner", { n: joining })} →
              </Link>
            </Row>
          )}
          {complaints > 0 && (
            <Row>
              <Link href="/complaints" className="text-base font-semibold hover:underline">
                {t("todayComplaints", { n: complaints })} →
              </Link>
            </Row>
          )}
          {cashTotal > 0 && (
            <Row>
              {isOwner ? (
                <Link href="/staff" className="text-base font-semibold hover:underline">
                  {t("cashBanner", { amt: rupees(cashTotal) })} →
                </Link>
              ) : (
                <span className="text-base font-semibold">{t("cashMine", { amt: rupees(cashTotal) })}</span>
              )}
            </Row>
          )}
        </ul>
      )}
    </section>
  );
}
