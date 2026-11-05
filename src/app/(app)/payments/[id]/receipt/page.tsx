import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, methodText, rupees, whatsappNumber } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { asLang, makeT } from "@/lib/i18n";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const p = await db.payment.findFirst({
    where: { id: Number(id) || -1, tenant: { ownerId: owner.id } },
    include: { tenant: { include: { property: true, bed: { include: { room: true } } } } },
  });
  if (!p) notFound();
  const refund = p.amount < 0;
  const tl = makeT(asLang(p.tenant.language ?? lang));
  const shareHref = `https://wa.me/${whatsappNumber(p.tenant.phone)}?text=${encodeURIComponent(
    tl("receiptMsg", { name: p.tenant.name.split(" ")[0], amt: rupees(p.amount), date: fmtDate(p.paidOn, asLang(p.tenant.language ?? lang)), mode: methodText(tl, p.method), no: String(p.id).padStart(5, "0"), pg: owner.businessName ?? p.tenant.property.name }),
  )}`;
  const rows: [string, string][] = [
    [t("receivedFrom"), p.tenant.name],
    [t("mobile"), p.tenant.phone],
    [
      t("stay"),
      `${p.tenant.property.name}${p.tenant.bed ? `, Room ${p.tenant.bed.room.number} Bed ${p.tenant.bed.label}` : ""}`,
    ],
    [t("date"), fmtDate(p.paidOn, lang)],
    [t("mode"), methodText(t, p.method)],
  ];
  if (p.reference) rows.push([t("reference"), p.reference]);
  if (p.note) rows.push([t("note"), p.note]);
  if (refund) rows[0] = [t("paidTo"), p.tenant.name];

  return (
    <div className="mx-auto max-w-lg">
      <div className="no-print mb-4 flex justify-between">
        <a href={`/tenants/${p.tenantId}`} className="text-sm text-brand-600 hover:underline">
          ← {t("backToTenant")}
        </a>
        <span className="flex items-center gap-2">
          {!refund && (
            <a className="btn-accent btn-sm" target="_blank" rel="noreferrer" href={shareHref}>
              {t("shareReceipt")}
            </a>
          )}
          <PrintButton />
        </span>
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between bg-brand-700 px-6 py-5 text-white">
          <div>
            <p className="text-xs tracking-widest text-brand-200 uppercase">
              {refund ? t("refundVoucher") : t("rentReceipt")}
            </p>
            <p className="text-lg font-bold">{p.tenant.property.name}</p>
            {p.tenant.property.address && <p className="text-xs text-brand-100">{p.tenant.property.address}</p>}
          </div>
          <LogoMark className="h-10 w-10" />
        </div>
        <div className="p-6">
          <div className="mb-5 flex items-end justify-between">
            <p className="text-sm text-muted">{t("receiptNo", { n: String(p.id).padStart(5, "0") })}</p>
            <p className="text-3xl font-bold text-brand-900">{rupees(Math.abs(p.amount))}</p>
          </div>
          <dl className="divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs text-muted">
            {t("issuedBy", { name: owner.name })}
          </p>
        </div>
      </div>
    </div>
  );
}
