import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useDB } from "./store";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Rent from "./pages/Rent";
import Expenses from "./pages/Expenses";
import Complaints from "./pages/Complaints";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";

const nav = [
  ["/", "Dashboard", "▦"], ["/properties", "Properties & Rooms", "⌂"], ["/tenants", "Tenants", "☺"],
  ["/rent", "Rent & Payments", "₹"], ["/expenses", "Expenses", "✎"], ["/complaints", "Complaints", "⚑"],
  ["/reports", "Reports", "▤"], ["/settings", "Settings", "⚙"],
] as const;

export default function App() {
  const { settings } = useDB();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 py-4 text-xl font-bold text-brand-600">Neravu
          <span className="block text-xs font-normal text-slate-500">{settings.pgName}</span></div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {nav.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>
              <span className="w-4 text-center">{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/rent" element={<Rent />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
