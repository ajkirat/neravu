import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { login } from "@/app/actions/auth";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const { t } = await getT();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">{t("welcomeBack")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t("loginSub")}</p>
      <ActionForm action={login} submitLabel={t("login")} submitClassName="btn-primary w-full">
        <Field label={t("email")}>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t("password")}>
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm text-muted">
        {t("newHere")}{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          {t("createOwner")}
        </Link>
      </p>
    </>
  );
}
