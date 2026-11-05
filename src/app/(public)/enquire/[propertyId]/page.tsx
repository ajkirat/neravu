import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { submitEnquiry } from "@/app/actions/leads";
import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { VoiceInput } from "@/components/voice-input";

export const metadata = { title: "Enquire about a room", robots: { index: false, follow: false } };

export default async function EnquirePage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const { t } = await getT();
  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { name: true, address: true, city: true, owner: { select: { businessName: true } } },
  });
  if (!property) notFound();
  const title = property.owner.businessName ?? property.name;
  return (
    <Card>
      <h1 className="text-lg font-semibold text-brand-900">{title}</h1>
      <p className="mb-4 text-sm text-muted">
        {[property.name !== title ? property.name : null, property.address, property.city].filter(Boolean).join(" · ")}
      </p>
      <ActionForm action={submitEnquiry.bind(null, propertyId)} submitLabel={t("enquireSend")} resetOnSuccess>
        <Field label={t("enquireName")}>
          <input name="name" className="input" required maxLength={80} autoComplete="name" />
        </Field>
        <Field label={t("enquirePhone")}>
          <input name="phone" type="tel" className="input" required maxLength={20} autoComplete="tel" />
        </Field>
        <Field label={t("enquireLooking")} hint={t("enquireHint")}>
          <VoiceInput name="note" maxLength={500} />
        </Field>
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      </ActionForm>
    </Card>
  );
}
