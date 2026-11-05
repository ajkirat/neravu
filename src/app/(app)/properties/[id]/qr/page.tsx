import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { qrDataUrl } from "@/lib/qr";
import { appOrigin } from "@/lib/url";
import { PrintButton } from "@/components/print-button";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Enquiry QR code" };

export default async function PropertyQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const { t } = await getT();
  const property = await db.property.findFirst({ where: { id, ownerId: owner.id } });
  if (!property) notFound();
  const link = `${await appOrigin()}/enquire/${property.id}`;
  const qr = await qrDataUrl(link, 640);
  return (
    <div className="mx-auto max-w-lg">
      <div className="no-print mb-4 flex justify-between">
        <a href={`/properties/${property.id}`} className="text-sm text-brand-600 hover:underline">
          ← {t("backToProperty")}
        </a>
        <PrintButton />
      </div>
      <div className="card p-8 text-center">
        <p className="text-2xl font-bold text-brand-900">{owner.businessName ?? property.name}</p>
        {owner.businessName && owner.businessName !== property.name && <p className="text-muted">{property.name}</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Enquiry QR code" className="mx-auto my-6 h-72 w-72" />
        <p className="text-xl font-semibold text-brand-900">{t("qrScan")}</p>
        <p className="mt-1 text-sm text-muted">{t("qrSub")}</p>
        {owner.phone && <p className="mt-3 font-medium">{t("qrCall", { phone: owner.phone })}</p>}
        <p className="mt-4 text-xs break-all text-muted">{link}</p>
      </div>
    </div>
  );
}
