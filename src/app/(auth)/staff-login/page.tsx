import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { staffLogin } from "@/app/actions/staff";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Caretaker sign in" };

export default async function StaffLoginPage() {
  const { t } = await getT();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">{t("staffLoginTitle")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t("staffLoginSub")}</p>
      <ActionForm action={staffLogin} submitLabel={t("staffLoginBtn")} submitClassName="btn-primary w-full">
        <Field label={t("mobile")}>
          <input className="input" name="phone" type="tel" inputMode="numeric" autoComplete="username" required />
        </Field>
        <Field label={t("password")}>
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t("ownerLoginLink")}
        </Link>
      </p>
    </>
  );
}
