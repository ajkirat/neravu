import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { AnnounceComposer } from "@/components/announce-composer";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Message everyone" };

export default async function AnnouncePage() {
  const { owner } = await requireActor();
  const { t } = await getT();
  const [properties, tenants] = await Promise.all([
    db.property.findMany({ where: { ownerId: owner.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.tenant.findMany({
      where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } },
      select: { id: true, name: true, phone: true, language: true, propertyId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader title={t("annTitle")} subtitle={t("annSub")} />
      <AnnounceComposer properties={properties} tenants={tenants} pgName={owner.businessName ?? properties[0]?.name ?? owner.name} />
    </>
  );
}
