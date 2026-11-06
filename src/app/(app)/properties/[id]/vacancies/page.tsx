import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { availability } from "@/lib/availability";
import { rupees } from "@/lib/format";
import { asLang, makeT, LANGS, type Lang } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { qrDataUrl } from "@/lib/qr";
import { appOrigin } from "@/lib/url";
import { CopyButton } from "@/components/copy-button";
import { PrintButton } from "@/components/print-button";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Share empty beds" };

/** A ready "beds available" message for WhatsApp groups, and a To-Let poster with the enquiry QR. */
export default async function VacanciesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const property = await db.property.findFirst({ where: { id, ownerId: owner.id } });
  if (!property) notFound();
  const msgLang: Lang = asLang((await searchParams).lang ?? lang);
  const mt = makeT(msgLang);
  const avail = await availability(id);
  const link = `${await appOrigin()}/enquire/${id}`;
  const qr = await qrDataUrl(link, 480);
  const pg = owner.businessName ?? property.name;
  const where = [property.address, property.city].filter(Boolean).join(", ");
  const lines = avail.map((a) =>
    mt("vacLine", { sharing: a.sharing === 1 ? mt("single") : mt("sharingN", { n: a.sharing }), n: a.free, rent: rupees(a.fromRent) }),
  );
  const text = avail.length
    ? [mt("vacHead", { pg }), where, ...lines.map((l) => `• ${l}`), mt("vacEnquire", { url: link }), owner.phone ? mt("vacCall", { phone: owner.phone }) : ""].filter(Boolean).join("\n")
    : "";
  const chip = (on: boolean) => `rounded-lg px-3 py-2 text-sm font-semibold ${on ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print">
        <PageHeader back={{ href: `/properties/${id}`, label: property.name }} title={t("shareVacancies")} subtitle={t("vacSub")} />
        {avail.length === 0 ? (
          <Card>
            <p className="text-base">{t("vacNone")}</p>
          </Card>
        ) : (
          <Card title={t("vacMessage")}>
            <div className="mb-3 flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <Link key={l.code} href={`/properties/${id}/vacancies?lang=${l.code}`} className={chip(msgLang === l.code)}>
                  {l.label}
                </Link>
              ))}
            </div>
            <pre className="rounded-xl bg-canvas p-3 font-sans text-sm whitespace-pre-wrap" data-testid="vac-text">
              {text}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn-accent" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
                {t("vacSendWa")}
              </a>
              <CopyButton text={text} />
              <PrintButton />
            </div>
            <p className="mt-2 text-xs text-muted">{t("vacHint")}</p>
          </Card>
        )}
      </div>

      {/* The poster: what prints. Big, in all three languages, with the enquiry QR. */}
      {avail.length > 0 && (
        <div className="card mt-6 p-6 text-center print:mt-0 print:border-0 print:shadow-none">
          <p className="text-4xl font-black tracking-tight text-brand-900">TO-LET</p>
          <p className="text-2xl font-bold text-brand-900">ಬಾಡಿಗೆಗೆ ಇದೆ · అద్దెకు ఉంది</p>
          <p className="mt-2 text-xl font-semibold">{pg}</p>
          {where && <p className="text-muted">{where}</p>}
          <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-lg">
            {avail.map((a) => (
              <li key={a.sharing} className="flex justify-between gap-3 border-b border-line py-1">
                <span>{a.sharing === 1 ? t("single") : t("sharingN", { n: a.sharing })}</span>
                <span className="font-semibold">{rupees(a.fromRent)} / {t("monthShort")}</span>
              </li>
            ))}
          </ul>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="mx-auto mt-5 h-56 w-56" />
          <p className="text-lg font-semibold">{t("qrScan")}</p>
          {owner.phone && <p className="mt-2 text-2xl font-bold">📞 {owner.phone}</p>}
        </div>
      )}
    </div>
  );
}
