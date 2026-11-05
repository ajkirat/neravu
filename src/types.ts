export type ID = string;

export interface Property { id: ID; name: string; address: string; city: string }
export interface Room { id: ID; propertyId: ID; name: string; floor: number; capacity: number; rent: number; deposit: number }

export type TenantStatus = "active" | "notice" | "vacated";
export type KycStatus = "pending" | "verified";
export interface Settlement { date: string; deposit: number; dues: number; damages: number; other: number; note: string; refund: number }
export interface Tenant {
  id: ID; name: string; phone: string; email: string;
  propertyId: ID; roomId: ID; rent: number; deposit: number;
  joinDate: string; vacatedDate?: string; status: TenantStatus;
  settlement?: Settlement; kyc: KycStatus; idType: string; idNumber: string; emergencyContact: string;
}

export type PayMode = "UPI" | "Cash" | "Bank Transfer" | "Card";
export interface Payment { date: string; amount: number; mode: PayMode }
export interface Invoice { id: ID; tenantId: ID; month: string; amount: number; dueDate: string; payments: Payment[] }

export const EXPENSE_CATEGORIES = ["Electricity", "Water", "Maintenance", "Food / Kitchen", "Salaries", "Internet", "Rent / Lease", "Other"] as const;
export interface Expense { id: ID; propertyId: ID; category: string; amount: number; date: string; note: string }

export type ComplaintStatus = "open" | "in_progress" | "resolved";
export interface Complaint { id: ID; tenantId: ID; propertyId: ID; title: string; category: string; description: string; status: ComplaintStatus; createdAt: string }

export type LeadStatus = "new" | "contacted" | "visit" | "won" | "lost";
export interface Lead { id: ID; name: string; phone: string; propertyId?: ID; source: "qr" | "manual"; note: string; status: LeadStatus; followUp?: string; createdAt: string }

export interface Settings { pgName: string; ownerName: string; ownerPhone: string; dueDay: number; reminderTemplate: string }

export interface DB {
  properties: Property[]; rooms: Room[]; tenants: Tenant[]; invoices: Invoice[];
  expenses: Expense[]; complaints: Complaint[]; leads: Lead[]; settings: Settings;
}
