import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { vacantBeds } from "@/lib/beds";
import { toDateInput, today } from "@/lib/dates";
import { ID_TYPES, PAYMENT_METHODS, methodText } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { LANGS } from "@/lib/i18n";
import { ActionForm } from "@/components/action-form";
import { BedPicker } from "@/components/bed-picker";
import { Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { createTenant } from "@/app/actions/tenants";

export const metadata = { title: "Add tenant" };

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ bed?: string; property?: string }>;
}) {
  const { bed, property } = await searchParams;
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const beds = await vacantBeds(owner.id);
  const defaultBed = bed ?? beds.find((b) => b.propertyId === property)?.id;

  return (
    <>
      <PageHeader
        back={{ href: "/tenants", label: t("tenantsTitle") }}
        title={t("addATenant")}
        subtitle={t("onboardSub")}
      />
      {beds.length === 0 ? (
        <EmptyState
          title={t("noVacantTitle")}
          body={t("noVacantBody")}
          action={
            <Link href="/properties" className="btn-primary">
              {t("goToProperties")}
            </Link>
          }
        />
      ) : (
        <ActionForm action={createTenant} submitLabel={t("addTenant")} className="space-y-6">
          <Card title={t("tenantDetails")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fullName")}>
                <input className="input" name="name" required />
              </Field>
              <Field label={t("mobile")}>
                <input className="input" name="phone" type="tel" placeholder="98xxxxxxxx" required />
              </Field>
              <Field label={t("email")}>
                <input className="input" name="email" type="email" />
              </Field>
              <Field label={t("occupation")}>
                <input className="input" name="occupation" />
              </Field>
              <Field label={t("idProof")}>
                <select className="input" name="idType" defaultValue="Aadhaar">
                  {ID_TYPES.map((idt) => (
                    <option key={idt}>{idt}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("idNumber")}>
                <input className="input" name="idNumber" />
              </Field>
              <Field label={t("emergencyName")}>
                <input className="input" name="emergencyName" />
              </Field>
              <Field label={t("emergencyPhone")}>
                <input className="input" name="emergencyPhone" type="tel" />
              </Field>
              <Field label={t("tenantLanguage")} hint={t("tenantLanguageHint")}>
                <select className="input" name="language" defaultValue={lang}>
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>
          <Card title={t("stayAndRent")}>
            <div className="space-y-4">
              <BedPicker beds={beds} defaultBed={defaultBed} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t("moveInDate")}>
                  <input
                    className="input"
                    type="date"
                    name="moveInDate"
                    defaultValue={toDateInput(today())}
                    required
                  />
                </Field>
                <Field label={t("rentDueDayShort")} hint={t("rentDueDayHint")}>
                  <input className="input" name="rentDueDay" inputMode="numeric" placeholder="e.g. 5" />
                </Field>
                <Field label={t("depositRs")}>
                  <input className="input" name="deposit" inputMode="numeric" placeholder="0" />
                </Field>
              </div>
              <div className="grid gap-4 rounded-xl bg-canvas p-4 sm:grid-cols-2">
                <Field
                  label={t("collectedToday")}
                  hint={t("collectedTodayHint")}
                >
                  <input className="input" name="paidNow" inputMode="numeric" placeholder="0" />
                </Field>
                <Field label={t("paidVia")}>
                  <select className="input" name="method" defaultValue="UPI">
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {methodText(t, m)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={t("notes")}>
                <textarea className="input" name="notes" rows={2} />
              </Field>
            </div>
          </Card>
        </ActionForm>
      )}
    </>
  );
}
