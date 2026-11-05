"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/properties", label: "Properties", icon: "M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01" },
  { href: "/tenants", label: "Tenants", icon: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M16 3.13a3.5 3.5 0 010 6.75" },
  { href: "/leads", label: "Leads", icon: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" },
  { href: "/payments", label: "Payments", icon: "M3 7h18v12H3zM3 11h18M7 15h3" },
  { href: "/expenses", label: "Expenses", icon: "M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6" },
  { href: "/reports", label: "Reports", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  return (
    <nav className="space-y-1">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(n.href)
              ? "bg-brand-600 text-white"
              : "text-brand-100 hover:bg-brand-600/50 hover:text-white"
          }`}
        >
          <Icon d={n.icon} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t border-line bg-white lg:hidden">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
            isActive(n.href) ? "text-brand-600" : "text-muted"
          }`}
        >
          <Icon d={n.icon} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
