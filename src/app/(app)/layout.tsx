import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { BottomNav, SideNav } from "@/components/nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  const { t } = await getT();
  const large = (await cookies()).get("neravu_text")?.value === "lg";
  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col bg-brand-700 p-4 lg:flex">
        <Link href="/dashboard" className="mb-8 px-2 pt-1">
          <Logo light />
        </Link>
        <SideNav />
        <div className="mt-auto space-y-3">
          <LanguageSwitcher className="w-full justify-between" />
          <div className="rounded-xl bg-brand-900/40 p-3">
            <p className="truncate text-sm font-medium text-white">{owner.name}</p>
            <p className="truncate text-xs text-brand-200">{owner.email}</p>
            <div className="mt-2 flex items-center gap-3">
              <Link href="/settings" className="text-xs font-medium text-brand-100 hover:underline">
                {t("navSettings")}
              </Link>
              <Link href="/help" className="text-xs font-medium text-brand-100 hover:underline">
                {t("navHelp")}
              </Link>
              <form action={logout}>
                <button className="text-xs font-medium text-marigold-400 hover:underline">{t("logout")}</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <header className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-white/90 px-3 py-2.5 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12">
        <div className="no-print mb-4 hidden justify-end lg:flex">
          <TextSizeToggle large={large} />
        </div>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
