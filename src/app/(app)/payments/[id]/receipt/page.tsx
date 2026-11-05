import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, methodLabel, rupees } from "@/lib/format";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const p = await db.payment.findFirst({
    where: { id: Number(id) || -1, tenant: { ownerId: owner.id } },
    include: { tenant: { include: { property: true, bed: { include: { room: true } } } } },
  });
  if (!p) notFound();
  const refund = p.amount < 0;
  const rows: [string, string][] = [
    ["Received from", p.tenant.name],
    ["Mobile", p.tenant.phone],
    [
      "Stay",
      `${p.tenant.property.name}${p.tenant.bed ? `, Room ${p.tenant.bed.room.number} Bed ${p.tenant.bed.label}` : ""}`,
    ],
    ["Date", fmtDate(p.paidOn)],
    ["Mode", methodLabel[p.method] ?? p.method],
  ];
  if (p.reference) rows.push(["Reference", p.reference]);
  if (p.note) rows.push(["Note", p.note]);
  if (refund) rows[0] = ["Paid to", p.tenant.name];

  return (
    <div className="mx-auto max-w-lg">
      <div className="no-print mb-4 flex justify-between">
        <a href={`/tenants/${p.tenantId}`} className="text-sm text-brand-600 hover:underline">
          ← Back to tenant
        </a>
        <PrintButton />
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between bg-brand-700 px-6 py-5 text-white">
          <div>
            <p className="text-xs tracking-widest text-brand-200 uppercase">
              {refund ? "Refund voucher" : "Rent receipt"}
            </p>
            <p className="text-lg font-bold">{p.tenant.property.name}</p>
            {p.tenant.property.address && <p className="text-xs text-brand-100">{p.tenant.property.address}</p>}
          </div>
          <LogoMark className="h-10 w-10" />
        </div>
        <div className="p-6">
          <div className="mb-5 flex items-end justify-between">
            <p className="text-sm text-muted">No. {String(p.id).padStart(5, "0")}</p>
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
            Issued by {owner.name}. This is a computer-generated receipt.
          </p>
        </div>
      </div>
    </div>
  );
}
