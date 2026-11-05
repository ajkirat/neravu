import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate, rupees } from "@/lib/format";
import { today } from "@/lib/dates";
import { LANGS, asLang, isLang, makeT } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Rent agreement" };

export default async function AgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const owner = await requireOwner();
  const { t: ui, lang: uiLang } = await getT();
  const t0 = await db.tenant.findFirst({
    where: { id, ownerId: owner.id },
    include: { property: true, bed: { include: { room: true } } },
  });
  if (!t0) notFound();
  const t = t0;
  // Printed in the tenant's own language unless the owner picks another one.
  const lang = isLang(sp.lang) ? sp.lang : asLang(t.language ?? uiLang);
  const a = makeT(lang);
  const business = owner.businessName ?? t.property.name;
  const place = [t.property.name, t.property.address, t.property.city].filter(Boolean).join(", ");
  const bed = t.bed ? a("agrRoomBed", { r: t.bed.room.number, b: t.bed.label }) : a("agrABed");
  const idLine = t.idType && t.idNumber ? `${t.idType} ${t.idNumber}` : a("agrIdOnRecord");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/tenants/${t.id}`} className="text-sm text-brand-600 hover:underline">
          ← {ui("backToTenant")}
        </Link>
        <div className="flex items-center gap-2">
          {LANGS.map((l) => (
            <Link
              key={l.code}
              href={`/tenants/${t.id}/agreement?lang=${l.code}`}
              className={`rounded-lg px-2.5 py-1 text-sm font-medium ring-1 ring-line ${lang === l.code ? "bg-brand-600 text-white" : "bg-white text-muted"}`}
            >
              {l.label}
            </Link>
          ))}
          <PrintButton />
        </div>
      </div>
      <article lang={lang} className="card space-y-4 p-8 text-sm leading-relaxed">
        <h1 className="text-center text-lg font-bold tracking-wide text-brand-900 uppercase">{a("agrTitle")}</h1>
        <p>{a("agrIntro", { date: fmtDate(today(), lang), owner: owner.name, pg: business, tenant: t.name, id: idLine, phone: t.phone })}</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>{a("agr1", { bed, place, date: fmtDate(t.moveInDate, lang) })}</li>
          <li>{a("agr2", { rent: rupees(t.monthlyRent), day: t.rentDueDay })}</li>
          <li>{a("agr3", { deposit: rupees(t.deposit) })}</li>
          <li>{a("agr4")}</li>
          <li>{a("agr5")}</li>
          <li>{a("agr6")}</li>
        </ol>
        <div className="grid grid-cols-2 gap-10 pt-14">
          <p className="border-t border-ink/60 pt-1">{a("agrOwner", { name: owner.name })}</p>
          <p className="border-t border-ink/60 pt-1">{a("agrOccupant", { name: t.name })}</p>
        </div>
        <p className="no-print text-xs text-muted">{a("agrDisclaimer")}</p>
      </article>
    </div>
  );
}
