import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { submitJoin } from "@/app/actions/join";
import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { LANGS } from "@/lib/i18n";
import { ID_TYPES } from "@/lib/format";

export const metadata = { title: "Join this PG", robots: { index: false, follow: false } };

export default async function JoinPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const { t, lang } = await getT();
  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { name: true, address: true, city: true, owner: { select: { businessName: true } } },
  });
  if (!property) notFound();
  const title = property.owner.businessName ?? property.name;
  return (
    <Card>
      <h1 className="text-lg font-semibold text-brand-900">{t("joinTitle")}</h1>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted">
        {[property.name !== title ? property.name : null, property.address, property.city].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-2 mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{t("joinSub")}</p>
      <ActionForm action={submitJoin.bind(null, propertyId)} submitLabel={t("joinSend")} resetOnSuccess>
        <Field label={t("fullName")}>
          <input name="name" className="input" required maxLength={80} autoComplete="name" />
        </Field>
        <Field label={t("mobile")}>
          <input name="phone" type="tel" inputMode="numeric" className="input" required maxLength={20} autoComplete="tel" placeholder="98xxxxxxxx" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("idProof")}>
            <select name="idType" className="input" defaultValue="Aadhaar">
              {ID_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label={t("idNumber")}>
            <input name="idNumber" className="input" required maxLength={40} />
          </Field>
        </div>
        <Field label={t("occupation")}>
          <input name="occupation" className="input" maxLength={80} />
        </Field>
        <Field label={t("email")}>
          <input name="email" type="email" className="input" maxLength={120} autoComplete="email" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("emergencyName")}>
            <input name="emergencyName" className="input" maxLength={80} />
          </Field>
          <Field label={t("emergencyPhone")}>
            <input name="emergencyPhone" type="tel" inputMode="numeric" className="input" maxLength={20} />
          </Field>
        </div>
        <Field label={t("tenantLanguage")}>
          <select name="language" className="input" defaultValue={lang}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="confirm" value="yes" className="mt-1 h-5 w-5" required />
          <span>{t("joinConfirm")}</span>
        </label>
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      </ActionForm>
    </Card>
  );
}
