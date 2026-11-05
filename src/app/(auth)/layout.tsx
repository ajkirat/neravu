import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentOwner } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await currentOwner()) redirect("/dashboard");
  const { t } = await getT();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-700 p-10 text-white lg:flex">
        <Link href="/">
          <Logo light />
        </Link>
        <div>
          <p className="text-3xl leading-tight font-bold">
            {t("heroLine1")}
            <br />
            {t("heroLine2")} <span className="text-marigold-400">{t("heroSorted")}</span>
          </p>
          <p className="mt-4 max-w-sm text-brand-100">
            {t("heroBody")}
          </p>
        </div>
        <p className="text-xs text-brand-200">{t("heroFoot")}</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-end">
            <LanguageSwitcher />
          </div>
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
