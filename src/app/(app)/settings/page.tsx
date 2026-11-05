import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { saveSettings } from "@/app/actions/settings";
import { ActionForm } from "@/components/action-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { Card, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const owner = await requireOwner();
  const { t } = await getT();
  const large = (await cookies()).get("neravu_text")?.value === "lg";
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
            <Field label={t("upiIdLabel")} hint={t("upiIdHint")}>
              <input name="upiId" className="input" defaultValue={owner.upiId ?? ""} placeholder="name@bank" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
