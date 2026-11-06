import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { submitEnquiry } from "@/app/actions/leads";
import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { VoiceInput } from "@/components/voice-input";
import { rupees } from "@/lib/format";
import { availability } from "@/lib/availability";

export const metadata = { title: "Enquire about a room", robots: { index: false, follow: false } };

export default async function EnquirePage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const { t } = await getT();
  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { name: true, address: true, city: true, owner: { select: { businessName: true } } },
  });
  if (!property) notFound();
  const avail = await availability(propertyId);
  const title = property.owner.businessName ?? property.name;
  return (
    <Card>
      <h1 className="text-lg font-semibold text-brand-900">{title}</h1>
      <p className="mb-4 text-sm text-muted">
        {[property.name !== title ? property.name : null, property.address, property.city].filter(Boolean).join(" · ")}
      </p>
      <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3">
        <p className="text-sm font-semibold text-brand-900">{t("availTitle")}</p>
        {avail.length === 0 ? (
          <p className="mt-1 text-sm text-muted">{t("availNone")}</p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-sm">
            {avail.map((a) => (
              <li key={a.sharing}>
                {t("availLine", {
                  sharing: a.sharing === 1 ? t("single") : t("sharingN", { n: a.sharing }),
                  rent: rupees(a.fromRent),
                  n: a.free,
                })}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ActionForm action={submitEnquiry.bind(null, propertyId)} submitLabel={t("enquireSend")} resetOnSuccess>
        <Field label={t("enquireName")}>
          <input name="name" className="input" required maxLength={80} autoComplete="name" />
        </Field>
        <Field label={t("enquirePhone")}>
          <input name="phone" type="tel" className="input" required maxLength={20} autoComplete="tel" />
        </Field>
        <fieldset className="space-y-2">
          <legend className="label">{t("wantLabel")}</legend>
          <label className="flex items-center gap-3 text-base">
            <input type="radio" name="want" value="CALLBACK" defaultChecked className="h-5 w-5" />
            {t("wantCallback")}
          </label>
          <label className="flex items-center gap-3 text-base">
            <input type="radio" name="want" value="INFO" className="h-5 w-5" />
            {t("wantInfo")}
          </label>
        </fieldset>
        <Field label={t("enquireLooking")} hint={t("enquireHint")}>
          <VoiceInput name="note" maxLength={500} />
        </Field>
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      </ActionForm>
    </Card>
  );
}
