import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { appOrigin } from "@/lib/url";
import { saveSettings } from "@/app/actions/settings";
import { ActionForm } from "@/components/action-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PaymentSettingsForm } from "@/components/payment-settings-form";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { Card, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const owner = await requireOwner();
  const { t } = await getT();
  const large = (await cookies()).get("neravu_text")?.value === "lg";
  const full = await db.owner.findUnique({ where: { id: owner.id }, select: { upiId: true } });
  const mode = (["NONE", "UPI", "RAZORPAY"].includes(owner.paymentMode) ? owner.paymentMode : "UPI") as "NONE" | "UPI" | "RAZORPAY";
  return (
    <>
      <PageHeader title={t("settingsTitle")} subtitle={t("settingsSub")} />
      <div className="max-w-xl space-y-6">
        <Card title={t("appLanguage")}>
          <p className="mb-3 text-sm text-muted">{t("appLanguageHint")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <TextSizeToggle large={large} />
          </div>
        </Card>
        <Card>
          <ActionForm action={saveSettings} submitLabel={t("saveSettings")}>
            <Field label={t("yourName")}>
              <input name="name" className="input" required defaultValue={owner.name} />
            </Field>
            <Field label={t("mobileNumber")}>
              <input name="phone" type="tel" className="input" defaultValue={owner.phone ?? ""} />
            </Field>
            <Field label={t("businessName")} hint={t("businessNameHint")}>
              <input name="businessName" className="input" defaultValue={owner.businessName ?? ""} />
            </Field>
            <Field label={t("houseRulesLabel")} hint={t("houseRulesHint")}>
              <textarea name="houseRules" className="input" rows={4} maxLength={800} defaultValue={owner.houseRules ?? ""} />
            </Field>
          </ActionForm>
        </Card>
        <Card title={t("payHowTitle")}>
          <PaymentSettingsForm
            initialMode={mode}
            upiId={full?.upiId ?? ""}
            razorpayKeyId={owner.razorpayKeyId ?? ""}
            razorpayEnabled={owner.razorpayEnabled}
            webhookUrl={`${await appOrigin()}/api/webhooks/razorpay/${owner.id}`}
          />
        </Card>
      </div>
    </>
  );
}
