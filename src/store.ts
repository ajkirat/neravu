import { useSyncExternalStore } from "react";
import type { Complaint, ComplaintStatus, DB, Expense, Lead, Payment, Property, Room, Settings, Settlement, Tenant } from "./types";
import { seed } from "./seed";
import { api } from "./api";
import { today, uid } from "./utils";

type Coll = Exclude<keyof DB, "settings">;
type Op = { t: "put"; c: string; id: string; data: unknown } | { t: "del"; c: string; id: string } | { t: "clear" };

export const defaultSettings = (ownerName = ""): Settings => ({
  pgName: "My PG", ownerName, ownerPhone: "", dueDay: 5,
  reminderTemplate: "Hi {name}, your rent of {amount} for {month} is due. Please pay at the earliest. – {pg}",
});
const empty = (): DB => ({ properties: [], rooms: [], tenants: [], invoices: [], expenses: [], complaints: [], leads: [], settings: defaultSettings() });

let db: DB = empty();
let ready = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
const subscribe = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));

export const useDB = () => useSyncExternalStore(subscribe, () => db);
export const useReady = () => useSyncExternalStore(subscribe, () => ready);

export async function loadData() {
  const d = await api<Record<string, any[]>>("/api/data");
  db = { ...empty(), ...d, settings: d.settings?.[0] ?? defaultSettings() } as DB;
  ready = true; notify();
}
export function clearData() { db = empty(); ready = false; notify(); }

// Optimistic update; server writes are serialized, and any failure re-syncs from the server.
let chain: Promise<unknown> = Promise.resolve();
function commit(next: DB, ops: Op[]) {
  db = next; notify();
  chain = chain.then(() => api("/api/mutate", { ops })).catch(() => loadData().catch(() => {}));
}

/** Re-sync from the server (e.g. leads submitted via QR) once local writes have flushed. */
export const refresh = () => chain.then(() => loadData()).catch(() => {});

const put = (c: Coll, o: { id: string }): Op => ({ t: "put", c, id: o.id, data: o });
const del = (c: Coll, id: string): Op => ({ t: "del", c, id });

export const actions = {
  addProperty(p: Omit<Property, "id">) {
    const o = { ...p, id: uid() };
    commit({ ...db, properties: [...db.properties, o] }, [put("properties", o)]);
  },
  deleteProperty(id: string) {
    const rooms = db.rooms.filter(r => r.propertyId === id);
    commit({ ...db, properties: db.properties.filter(p => p.id !== id), rooms: db.rooms.filter(r => r.propertyId !== id) },
      [del("properties", id), ...rooms.map(r => del("rooms", r.id))]);
  },
  addRoom(r: Omit<Room, "id">) {
    const o = { ...r, id: uid() };
    commit({ ...db, rooms: [...db.rooms, o] }, [put("rooms", o)]);
  },
  deleteRoom: (id: string) => commit({ ...db, rooms: db.rooms.filter(r => r.id !== id) }, [del("rooms", id)]),

  addTenant(t: Omit<Tenant, "id" | "status">) {
    const o: Tenant = { ...t, id: uid(), status: "active" };
    commit({ ...db, tenants: [...db.tenants, o] }, [put("tenants", o)]);
  },
  updateTenant(id: string, patch: Partial<Tenant>) {
    const o = { ...db.tenants.find(t => t.id === id)!, ...patch };
    commit({ ...db, tenants: db.tenants.map(t => (t.id === id ? o : t)) }, [put("tenants", o)]);
  },
  checkout(id: string, settlement?: Settlement) { actions.updateTenant(id, { status: "vacated", vacatedDate: today(), settlement }); },

  addLead(l: Omit<Lead, "id" | "createdAt" | "status" | "source">) {
    const o: Lead = { ...l, id: uid(), createdAt: today(), status: "new", source: "manual" };
    commit({ ...db, leads: [...db.leads, o] }, [put("leads", o)]);
  },
  updateLead(id: string, patch: Partial<Lead>) {
    const o = { ...db.leads.find(l => l.id === id)!, ...patch };
    commit({ ...db, leads: db.leads.map(l => (l.id === id ? o : l)) }, [put("leads", o)]);
  },
  deleteLead: (id: string) => commit({ ...db, leads: db.leads.filter(l => l.id !== id) }, [del("leads", id)]),

  generateInvoices(month: string) {
    const have = new Set(db.invoices.filter(i => i.month === month).map(i => i.tenantId));
    const due = `${month}-${String(db.settings.dueDay).padStart(2, "0")}`;
    const fresh = db.tenants.filter(t => t.status !== "vacated" && !have.has(t.id))
      .map(t => ({ id: uid(), tenantId: t.id, month, amount: t.rent, dueDate: due, payments: [] as Payment[] }));
    if (fresh.length) commit({ ...db, invoices: [...db.invoices, ...fresh] }, fresh.map(i => put("invoices", i)));
    return fresh.length;
  },
  recordPayment(invoiceId: string, p: Payment) {
    const inv = db.invoices.find(i => i.id === invoiceId)!;
    const o = { ...inv, payments: [...inv.payments, p] };
    commit({ ...db, invoices: db.invoices.map(i => (i.id === invoiceId ? o : i)) }, [put("invoices", o)]);
  },

  addExpense(e: Omit<Expense, "id">) {
    const o = { ...e, id: uid() };
    commit({ ...db, expenses: [...db.expenses, o] }, [put("expenses", o)]);
  },
  deleteExpense: (id: string) => commit({ ...db, expenses: db.expenses.filter(e => e.id !== id) }, [del("expenses", id)]),

  addComplaint(c: Omit<Complaint, "id" | "status" | "createdAt">) {
    const o: Complaint = { ...c, id: uid(), status: "open", createdAt: today() };
    commit({ ...db, complaints: [...db.complaints, o] }, [put("complaints", o)]);
  },
  setComplaintStatus(id: string, status: ComplaintStatus) {
    const o = { ...db.complaints.find(c => c.id === id)!, status };
    commit({ ...db, complaints: db.complaints.map(c => (c.id === id ? o : c)) }, [put("complaints", o)]);
  },

  saveSettings: (s: Settings) => commit({ ...db, settings: s }, [{ t: "put", c: "settings", id: "main", data: s }]),

  loadDemo() {
    const d = seed();
    const ops: Op[] = [{ t: "clear" }];
    (["properties", "rooms", "tenants", "invoices", "expenses", "complaints", "leads"] as Coll[]).forEach(c =>
      (d[c] as { id: string }[]).forEach(o => ops.push(put(c, o))));
    ops.push({ t: "put", c: "settings", id: "main", data: d.settings });
    commit(d, ops);
  },
  clearAll() { commit(empty(), [{ t: "clear" }]); },
};
