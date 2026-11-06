import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { today } from "@/lib/dates";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { registerRows } from "@/lib/register";
import { PrintButton } from "@/components/print-button";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Tenant register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ all?: string; property?: string }> }) {
  const sp = await searchParams;
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const all = sp.all === "1";
  const properties = await db.property.findMany({ where: { ownerId: owner.id }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const propertyId = properties.some((p) => p.id === sp.property) ? sp.property : undefined;
  const rows = await registerRows(owner.id, { all, propertyId });
  const missing = rows.filter((r) => !r.idNumber || !r.permanentAddress).length;
  const q = (o: { all?: boolean; property?: string }) => {
    const p = new URLSearchParams();
    if (o.all ?? all) p.set("all", "1");
    const prop = "property" in o ? o.property : propertyId;
    if (prop) p.set("property", prop);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const pg = properties.find((p) => p.id === propertyId)?.name ?? owner.businessName ?? owner.name;
  const chip = (on: boolean) => `rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${on ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`;

  return (
    <>
      <div className="no-print">
        <PageHeader
          back={{ href: "/tenants", label: t("tenantsTitle") }}
          title={t("regTitle")}
          subtitle={t("regSub")}
          actions={
            <>
              <PrintButton />
              <a href={`/tenants/register/csv${q({})}`} className="btn-secondary">
                {t("regDownload")}
              </a>
            </>
          }
        />
        <div className="mb-3 flex flex-wrap gap-2">
          <Link href={`/tenants/register${q({ all: false })}`} className={chip(!all)}>
            {t("regCurrent")}
          </Link>
          <Link href={`/tenants/register${q({ all: true })}`} className={chip(all)}>
            {t("regAll")}
          </Link>
        </div>
        {properties.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Link href={`/tenants/register${q({ property: undefined })}`} className={chip(!propertyId)}>
              {t("regAllProps")}
            </Link>
            {properties.map((p) => (
              <Link key={p.id} href={`/tenants/register${q({ property: p.id })}`} className={chip(propertyId === p.id)}>
                {p.name}
              </Link>
            ))}
          </div>
        )}
        {missing > 0 && <p className="mb-4 rounded-lg bg-marigold-100 px-4 py-3 text-sm text-marigold-700">{t("regMissing", { n: missing })}</p>}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("regEmpty")} />
      ) : (
        <div className="card overflow-x-auto print:border-0 print:shadow-none">
          <p className="hidden px-2 py-2 text-sm font-semibold print:block">
            {t("regTitle")} · {t("regPrinted", { pg, date: fmtDate(today(), lang), n: rows.length })}
          </p>
          <table className="table text-sm print:text-[10px]">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("fullName")}</th>
                <th>{t("idProof")}</th>
                <th>{t("permanentAddress")}</th>
                <th>{t("regRoom")}</th>
                <th>{t("regIn")}</th>
                {all && <th>{t("regOut")}</th>}
                <th>{t("regEmergency")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="align-top">
                  <td>{i + 1}</td>
                  <td>
                    <Link href={`/tenants/${r.id}`} className="font-medium text-brand-900 hover:underline print:no-underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-muted">{r.phone}</div>
                    {r.occupation && <div className="text-xs text-muted">{r.occupation}</div>}
                  </td>
                  <td className={r.idNumber ? "" : "text-red-700"}>
                    {r.idType ?? ""} {r.idNumber ?? "—"}
                  </td>
                  <td className={`max-w-56 ${r.permanentAddress ? "" : "text-red-700"}`}>{r.permanentAddress ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {properties.length > 1 && <div className="text-xs text-muted">{r.property.name}</div>}
                    {r.bed ? `${r.bed.room.number} / ${r.bed.label}` : "—"}
                  </td>
                  <td className="whitespace-nowrap">{fmtDate(r.moveInDate, lang)}</td>
                  {all && <td className="whitespace-nowrap">{r.moveOutDate ? fmtDate(r.moveOutDate, lang) : "—"}</td>}
                  <td>
                    {r.emergencyName ?? "—"}
                    {r.emergencyPhone && <div className="text-xs text-muted">{r.emergencyPhone}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
