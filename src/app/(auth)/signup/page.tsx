import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { signup } from "@/app/actions/auth";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const { t } = await getT();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">{t("createOwnerTitle")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t("signupSub")}</p>
      <ActionForm action={signup} submitLabel={t("createAccount")} submitClassName="btn-primary w-full">
        <Field label={t("yourName")}>
          <input className="input" name="name" autoComplete="name" required />
        </Field>
        <Field label={t("email")}>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t("mobileOptional")}>
          <input className="input" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label={t("password")} hint={t("passwordHint")}>
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t("login")}
        </Link>
      </p>
    </>
  );
}
