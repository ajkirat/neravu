import type { Invoice, Tenant } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const today = () => new Date().toISOString().slice(0, 10);
export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
export const monthLabel = (m: string) =>
  new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split("-").map(Number);
  return monthKey(new Date(Date.UTC(y, mo - 1 + delta, 1)));
};

export const paidAmount = (i: Invoice) => i.payments.reduce((s, p) => s + p.amount, 0);
export const dueAmount = (i: Invoice) => i.amount - paidAmount(i);
export type InvoiceState = "paid" | "partial" | "overdue" | "pending";
export const invoiceState = (i: Invoice): InvoiceState => {
  if (dueAmount(i) <= 0) return "paid";
  if (i.dueDate < today()) return "overdue";
  return paidAmount(i) > 0 ? "partial" : "pending";
};

export const whatsappLink = (t: Tenant, text: string) =>
  `https://wa.me/${t.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(text)}`;

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
}
