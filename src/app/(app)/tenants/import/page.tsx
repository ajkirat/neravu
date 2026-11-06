import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { scanEnabled } from "@/lib/receipt-ai";
import { TenantImport } from "@/components/tenant-import";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Import tenants" };

export default async function ImportPage() {
  const owner = await requireOwner();
  const { t } = await getT();
  const properties = await db.property.findMany({ where: { ownerId: owner.id, rooms: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader back={{ href: "/tenants", label: t("tenantsTitle") }} title={t("impTitle")} subtitle={t("impSub")} />
      {properties.length === 0 ? (
        <EmptyState
          title={t("impNoRooms")}
          action={
            <Link href="/properties" className="btn-primary">
              {t("goToProperties")}
            </Link>
          }
        />
      ) : (
        <TenantImport properties={properties} scanOn={scanEnabled()} />
      )}
    </>
  );
}
