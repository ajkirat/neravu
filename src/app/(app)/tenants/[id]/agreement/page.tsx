import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, rupees } from "@/lib/format";
import { today } from "@/lib/dates";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Rent agreement" };

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const t = await db.tenant.findFirst({
    where: { id, ownerId: owner.id },
    include: { property: true, bed: { include: { room: true } } },
  });
  if (!t) notFound();
  const business = owner.businessName ?? t.property.name;
  const place = [t.property.name, t.property.address, t.property.city].filter(Boolean).join(", ");
  const bed = t.bed ? `Room ${t.bed.room.number}, Bed ${t.bed.label}` : "a bed";
  const idLine = t.idType && t.idNumber ? `${t.idType} ${t.idNumber}` : "ID proof on record";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex justify-between">
        <a href={`/tenants/${t.id}`} className="text-sm text-brand-600 hover:underline">
          ← Back to tenant
        </a>
        <PrintButton />
      </div>
      <article className="card space-y-4 p-8 text-sm leading-relaxed">
        <h1 className="text-center text-lg font-bold tracking-wide text-brand-900 uppercase">
          Paying guest / rent agreement
        </h1>
        <p>
          This agreement is made on <b>{fmtDate(today())}</b> between <b>{owner.name}</b> of <b>{business}</b> (the
          &ldquo;Owner&rdquo;) and <b>{t.name}</b> ({idLine}, mobile {t.phone}) (the &ldquo;Occupant&rdquo;).
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            The Owner allows the Occupant to stay in {bed} at {place}, from <b>{fmtDate(t.moveInDate)}</b>.
          </li>
          <li>
            Monthly rent is <b>{rupees(t.monthlyRent)}</b>, payable on or before day <b>{t.rentDueDay}</b> of every month.
          </li>
          <li>
            The Occupant has paid / will pay a refundable security deposit of <b>{rupees(t.deposit)}</b>. It will be
            refunded at move-out after adjusting unpaid rent, damages and other dues.
          </li>
          <li>The Occupant will keep the premises clean, follow the house rules and not sublet the bed or bring unregistered guests to stay.</li>
          <li>Either party may end this agreement by giving 30 days&rsquo; written notice. Rent is payable up to the move-out date.</li>
          <li>The Owner may ask the Occupant to vacate for serious or repeated breach of these terms.</li>
        </ol>
        <div className="grid grid-cols-2 gap-10 pt-14">
          <p className="border-t border-ink/60 pt-1">Owner: {owner.name}</p>
          <p className="border-t border-ink/60 pt-1">Occupant: {t.name}</p>
        </div>
        <p className="no-print text-xs text-muted">
          Standard template for convenience. It is not legal advice, so have it reviewed for your state&rsquo;s rules
          before relying on it.
        </p>
      </article>
    </div>
  );
}
