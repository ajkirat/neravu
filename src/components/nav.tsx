"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM, NAV } from "@/lib/nav-items";
import { useT } from "@/lib/i18n/client";

export function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(href + "/");
}

export function SideNav() {
  const isActive = useActive();
  const t = useT();
  return (
    <nav className="space-y-1">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(n.href) ? "bg-brand-600 text-white" : "text-brand-100 hover:bg-brand-600/50 hover:text-white"
          }`}
        >
          <Icon d={n.icon} />
          {t(n.key)}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  const t = useT();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white lg:hidden">
      {BOTTOM.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] leading-tight font-medium ${
            isActive(n.href) ? "text-brand-600" : "text-muted"
          }`}
        >
          <Icon d={n.icon} className="h-6 w-6" />
          <span className="max-w-full truncate">{t(n.key)}</span>
        </Link>
      ))}
    </nav>
  );
}
