import Link from "next/link";
import { Logo } from "@/components/logo";
import { BottomNav, SideNav } from "@/components/nav";
import { requireOwner } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col bg-brand-700 p-4 lg:flex">
        <Link href="/dashboard" className="mb-8 px-2 pt-1">
          <Logo light />
        </Link>
        <SideNav />
        <div className="mt-auto rounded-xl bg-brand-900/40 p-3">
          <p className="truncate text-sm font-medium text-white">{owner.name}</p>
          <p className="truncate text-xs text-brand-200">{owner.email}</p>
          <div className="mt-2 flex items-center gap-3">
            <Link href="/settings" className="text-xs font-medium text-brand-100 hover:underline">
              Settings
            </Link>
            <form action={logout}>
              <button className="text-xs font-medium text-marigold-400 hover:underline">Log out</button>
            </form>
          </div>
        </div>
      </aside>
      <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-sm font-medium text-muted">
            Settings
          </Link>
          <form action={logout}>
            <button className="text-sm font-medium text-muted">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
