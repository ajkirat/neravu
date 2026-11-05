import { useSyncExternalStore } from "react";
import type { Complaint, ComplaintStatus, DB, Expense, Payment, Property, Room, Settings, Tenant } from "./types";
import { seed } from "./seed";
import { today, uid } from "./utils";

const KEY = "neravu:v1";
let db: DB = load();
const listeners = new Set<() => void>();

function load(): DB {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return seed();
}
function commit(next: DB) {
  db = next;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

export const useDB = () => useSyncExternalStore(cb => (listeners.add(cb), () => listeners.delete(cb)), () => db);

export const actions = {
  addProperty: (p: Omit<Property, "id">) => commit({ ...db, properties: [...db.properties, { ...p, id: uid() }] }),
  deleteProperty: (id: string) => commit({
    ...db, properties: db.properties.filter(p => p.id !== id), rooms: db.rooms.filter(r => r.propertyId !== id),
  }),
  addRoom: (r: Omit<Room, "id">) => commit({ ...db, rooms: [...db.rooms, { ...r, id: uid() }] }),
  deleteRoom: (id: string) => commit({ ...db, rooms: db.rooms.filter(r => r.id !== id) }),

  addTenant: (t: Omit<Tenant, "id" | "status">) => commit({ ...db, tenants: [...db.tenants, { ...t, id: uid(), status: "active" }] }),
  updateTenant: (id: string, patch: Partial<Tenant>) =>
    commit({ ...db, tenants: db.tenants.map(t => (t.id === id ? { ...t, ...patch } : t)) }),
  checkout: (id: string) =>
    commit({ ...db, tenants: db.tenants.map(t => (t.id === id ? { ...t, status: "vacated", vacatedDate: today() } : t)) }),

  generateInvoices: (month: string) => {
    const have = new Set(db.invoices.filter(i => i.month === month).map(i => i.tenantId));
    const due = `${month}-${String(db.settings.dueDay).padStart(2, "0")}`;
    const fresh = db.tenants.filter(t => t.status !== "vacated" && !have.has(t.id))
      .map(t => ({ id: uid(), tenantId: t.id, month, amount: t.rent, dueDate: due, payments: [] }));
    commit({ ...db, invoices: [...db.invoices, ...fresh] });
    return fresh.length;
  },
  recordPayment: (invoiceId: string, p: Payment) =>
    commit({ ...db, invoices: db.invoices.map(i => (i.id === invoiceId ? { ...i, payments: [...i.payments, p] } : i)) }),

  addExpense: (e: Omit<Expense, "id">) => commit({ ...db, expenses: [...db.expenses, { ...e, id: uid() }] }),
  deleteExpense: (id: string) => commit({ ...db, expenses: db.expenses.filter(e => e.id !== id) }),

  addComplaint: (c: Omit<Complaint, "id" | "status" | "createdAt">) =>
    commit({ ...db, complaints: [...db.complaints, { ...c, id: uid(), status: "open", createdAt: today() }] }),
  setComplaintStatus: (id: string, status: ComplaintStatus) =>
    commit({ ...db, complaints: db.complaints.map(c => (c.id === id ? { ...c, status } : c)) }),

  saveSettings: (s: Settings) => commit({ ...db, settings: s }),
  resetDemo: () => commit(seed()),
};
