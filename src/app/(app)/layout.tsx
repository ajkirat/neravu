import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { BottomNav, SideNav } from "@/components/nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { requireActor } from "@/lib/auth";
import { BOTTOM, NAV, STAFF_BOTTOM, STAFF_NAV } from "@/lib/nav-items";
import { emailEnabled } from "@/lib/email";
import { VerifyBanner } from "@/components/verify-banner";
import { getT } from "@/lib/i18n/server";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { owner, role, staff } = await requireActor();
  const isOwner = role === "OWNER";
  const { t } = await getT();
  const large = (await cookies()).get("neravu_text")?.value === "lg";
  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col bg-brand-700 p-4 lg:flex">
        <Link href="/dashboard" className="mb-8 px-2 pt-1">
          <Logo light />
        </Link>
        <SideNav items={isOwner ? NAV : STAFF_NAV} />
        <div className="mt-auto space-y-3">
          <LanguageSwitcher className="w-full justify-between" />
          <div className="rounded-xl bg-brand-900/40 p-3">
            <p className="truncate text-sm font-medium text-white">{isOwner ? owner.name : staff?.name}</p>
            <p className="truncate text-xs text-brand-200">{isOwner ? (owner.phone ?? owner.email) : `${t("roleStaff")} · ${owner.businessName ?? owner.name}`}</p>
            <div className="mt-2 flex items-center gap-3">
              {isOwner && (
                <Link href="/settings" className="text-xs font-medium text-brand-100 hover:underline">
                  {t("navSettings")}
                </Link>
              )}
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
        {isOwner && !owner.phoneKey && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-marigold-400 bg-marigold-100 px-4 py-3 text-sm text-brand-900">
            <span>{t("needMobileBanner")}</span>
            <Link href="/settings" className="btn-primary">
              {t("needMobileBtn")}
            </Link>
          </div>
        )}
        {isOwner && emailEnabled() && owner.email && !owner.emailVerifiedAt && <VerifyBanner email={owner.email} />}
        {children}
      </main>
      <BottomNav items={isOwner ? BOTTOM : STAFF_BOTTOM} />
    </div>
  );
}
