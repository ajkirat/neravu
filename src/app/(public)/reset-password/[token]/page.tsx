import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { resetPassword } from "@/app/actions/account";
import { peekToken } from "@/lib/auth-tokens";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getT();
  if (!(await peekToken(token, "RESET"))) {
    return (
      <Card>
        <p className="text-sm text-red-700">{t("resetBadLink")}</p>
        <Link href="/forgot-password" className="btn-primary mt-4 w-full justify-center">
          {t("resetAskNew")}
        </Link>
      </Card>
    );
  }
  return (
    <Card>
      <h1 className="mb-4 text-lg font-semibold text-brand-900">{t("resetTitle")}</h1>
      <ActionForm action={resetPassword.bind(null, token)} submitLabel={t("resetSave")} submitClassName="btn-primary w-full">
        <Field label={t("resetNewPw")} hint={t("passwordHint")}>
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label={t("resetConfirm")}>
          <input className="input" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </ActionForm>
    </Card>
  );
}
