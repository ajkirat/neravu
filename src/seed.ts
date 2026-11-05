import type { DB } from "./types";
import { monthKey, shiftMonth } from "./utils";

export function seed(): DB {
  const m = monthKey(), p = shiftMonth(m, -1);
  const d = (mo: string, day: number) => `${mo}-${String(day).padStart(2, "0")}`;
  const names: [string, string, string, number][] = [
    ["Rohan Mehta", "9876543210", "r1", 0], ["Aman Verma", "9876543211", "r1", 0],
    ["Karan Singh", "9876543212", "r2", 0], ["Priya Nair", "9876543213", "r3", 1],
    ["Sneha Iyer", "9876543214", "r3", 1], ["Divya Rao", "9876543215", "r4", 1],
  ];
  const rents: Record<string, number> = { r1: 7000, r2: 9000, r3: 8000, r4: 12000 };
  const tenants = names.map(([name, phone, roomId], i) => ({
    id: `t${i + 1}`, name, phone, email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    propertyId: roomId === "r1" || roomId === "r2" ? "p1" : "p2", roomId,
    rent: rents[roomId], deposit: rents[roomId] * 2, joinDate: d(shiftMonth(m, -3), 5),
    status: "active" as const, kyc: i % 3 === 0 ? ("pending" as const) : ("verified" as const),
    idType: "Aadhaar", idNumber: "XXXX-XXXX-" + (1000 + i), emergencyContact: "98000000" + (10 + i),
  }));
  const invoices = tenants.flatMap((t, i) => [
    { id: `ip${i}`, tenantId: t.id, month: p, amount: t.rent, dueDate: d(p, 5), payments: [{ date: d(p, 4), amount: t.rent, mode: "UPI" as const }] },
    { id: `ic${i}`, tenantId: t.id, month: m, amount: t.rent, dueDate: d(m, 5), payments: i < 3 ? [{ date: d(m, 2), amount: t.rent, mode: "UPI" as const }] : [] },
  ]);
  return {
    settings: { pgName: "Sunrise PG", ownerName: "Owner", ownerPhone: "", dueDay: 5,
      reminderTemplate: "Hi {name}, your rent of {amount} for {month} is due. Please pay at the earliest. – {pg}" },
    properties: [
      { id: "p1", name: "Sunrise PG – Boys", address: "12, 4th Cross, Koramangala", city: "Bengaluru" },
      { id: "p2", name: "Sunrise PG – Girls", address: "8, HSR Layout Sector 2", city: "Bengaluru" },
    ],
    rooms: [
      { id: "r1", propertyId: "p1", name: "101", floor: 1, capacity: 3, rent: 7000, deposit: 14000 },
      { id: "r2", propertyId: "p1", name: "102", floor: 1, capacity: 2, rent: 9000, deposit: 18000 },
      { id: "r3", propertyId: "p2", name: "201", floor: 2, capacity: 3, rent: 8000, deposit: 16000 },
      { id: "r4", propertyId: "p2", name: "202", floor: 2, capacity: 1, rent: 12000, deposit: 24000 },
    ],
    tenants, invoices,
    expenses: [
      { id: "e1", propertyId: "p1", category: "Electricity", amount: 6400, date: d(m, 3), note: "BESCOM bill" },
      { id: "e2", propertyId: "p2", category: "Food / Kitchen", amount: 18000, date: d(m, 2), note: "Groceries" },
      { id: "e3", propertyId: "p1", category: "Maintenance", amount: 2500, date: d(p, 20), note: "Plumbing" },
    ],
    complaints: [
      { id: "c1", tenantId: "t4", propertyId: "p2", title: "Wi-Fi not working", category: "Internet", description: "No connectivity since morning", status: "open", createdAt: d(m, 1) },
    ],
  };
}
