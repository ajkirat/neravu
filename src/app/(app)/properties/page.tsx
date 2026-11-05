import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { FoldCard, Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { createProperty } from "@/app/actions/properties";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Properties" };

export default async function PropertiesPage() {
  const owner = await requireOwner();
  const { t } = await getT();
  const properties = await db.property.findMany({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "asc" },
    include: {
      rooms: { select: { beds: { select: { id: true } } } },
      tenants: { where: { status: { in: ["ACTIVE", "NOTICE"] } }, select: { id: true } },
    },
  });

  return (
    <>
      <PageHeader title={t("propsTitle")} subtitle={t("propsSub")} />
      <div className="space-y-4">
        <FoldCard title={"+ " + t("addProperty")} open={properties.length === 0}>
          <ActionForm action={createProperty} submitLabel={t("addPropertyBtn")} cols>
            <Field label={t("propertyName")}>
              <input className="input" name="name" placeholder="e.g. Sunrise Men's PG" required />
            </Field>
            <Field label={t("address")}>
              <input className="input" name="address" placeholder="Street, area" />
            </Field>
            <Field label={t("city")}>
              <input className="input" name="city" placeholder="Bengaluru" />
            </Field>
          </ActionForm>
        </FoldCard>
        <div className="space-y-4">
          {properties.length === 0 && (
            <EmptyState
              title={t("noPropsTitle")}
              body={t("noPropsBody")}
            />
          )}
          {properties.map((p) => {
            const beds = p.rooms.reduce((s, r) => s + r.beds.length, 0);
            const occupied = p.tenants.length;
            const pct = beds ? Math.round((occupied / beds) * 100) : 0;
            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="card block p-5 transition hover:border-brand-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-brand-900">{p.name}</h2>
                    <p className="text-sm text-muted">
                      {[p.address, p.city].filter(Boolean).join(", ") || t("noAddress")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-600">{t("pctFull", { pct })}</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {t("propStats", { rooms: p.rooms.length, beds, occ: occupied, vac: beds - occupied })}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
