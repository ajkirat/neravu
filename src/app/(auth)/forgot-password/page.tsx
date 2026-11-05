import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { requestPasswordReset } from "@/app/actions/account";
import { emailEnabled } from "@/lib/email";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  const { t } = await getT();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">{t("forgotTitle")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t("forgotSub")}</p>
      {!emailEnabled() && (
        <p role="alert" className="mb-4 rounded-lg bg-marigold-100 px-3 py-2 text-sm text-marigold-700">
          {t("forgotNoEmail")}
        </p>
      )}
      <ActionForm action={requestPasswordReset} submitLabel={t("forgotSend")} submitClassName="btn-primary w-full">
        <Field label={t("email")}>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}
