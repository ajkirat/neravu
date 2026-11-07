import type { MsgKey } from "./i18n";

export type NavItem = { href: string; key: MsgKey; icon: string };

const I = {
  home: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  building: "M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01",
  people: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M16 3.13a3.5 3.5 0 010 6.75",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  card: "M3 7h18v12H3zM3 11h18M7 15h3",
  rupee: "M7 5h10M7 9.5h10M7 5h2.5c3.5 0 5.5 1.7 5.5 4.5S13 14 9.5 14H7l7 6",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4",
  help: "M9 9a3 3 0 115 2c-1 1-2 1.5-2 3M12 18h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
};

/** Main sections, shown in the desktop sidebar. */
export const NAV: NavItem[] = [
  { href: "/dashboard", key: "navDashboard", icon: I.home },
  { href: "/properties", key: "navProperties", icon: I.building },
  { href: "/tenants", key: "navTenants", icon: I.people },
  { href: "/payments", key: "navPayments", icon: I.card },
  { href: "/expenses", key: "navExpenses", icon: I.rupee },
  { href: "/electricity", key: "navElectricity", icon: I.bolt },
  { href: "/leads", key: "navLeads", icon: I.phone },
  { href: "/complaints", key: "navComplaints", icon: I.flag },
  { href: "/reports", key: "navReports", icon: I.chart },
  { href: "/staff", key: "navStaff", icon: I.people },
];

/** The four things owners do daily, plus More, on the phone bottom bar. */
export const BOTTOM: NavItem[] = [
  NAV[0],
  NAV[2],
  NAV[3],
  NAV[4],
  { href: "/more", key: "navMore", icon: I.grid },
];

/** Everything, as big tiles on the More screen. */
export const MORE: NavItem[] = [
  ...NAV,
  { href: "/announce", key: "navAnnounce", icon: I.bell },
  { href: "/cashbook", key: "navCashbook", icon: I.rupee },
  { href: "/upkeep", key: "navUpkeep", icon: I.flag },
  { href: "/reminders", key: "navReminders", icon: I.bell },
  { href: "/auto-reminders", key: "navAuto", icon: I.bell },
  { href: "/export", key: "navExport", icon: I.download },
  { href: "/settings", key: "navSettings", icon: I.sliders },
  { href: "/help", key: "navHelp", icon: I.help },
];

export const navIcon = (href: string): string => MORE.find((n) => n.href === href)?.icon ?? I.grid;
const pick = (hrefs: string[]) => hrefs.map((h) => MORE.find((n) => n.href === h)!).filter(Boolean);

/** What a caretaker sees in the sidebar, on the phone bottom bar, and on the More screen. */
export const STAFF_NAV: NavItem[] = pick(["/dashboard", "/tenants", "/payments", "/expenses", "/complaints", "/leads"]);
export const STAFF_BOTTOM: NavItem[] = [...pick(["/dashboard", "/tenants", "/payments", "/expenses"]), { href: "/more", key: "navMore", icon: I.grid }];
export const STAFF_MORE: NavItem[] = pick(["/dashboard", "/tenants", "/payments", "/expenses", "/complaints", "/leads", "/announce", "/upkeep", "/reminders", "/help"]);
