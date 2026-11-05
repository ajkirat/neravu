import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";

function cell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const owner = await requireOwner();
  await syncRentCharges(owner.id);
  const balances = await tenantBalances(owner.id);
  const tenants = await db.tenant.findMany({
    where: { ownerId: owner.id },
    include: { property: true, bed: { include: { room: true } } },
    orderBy: { name: "asc" },
  });
  const lines = [["Tenant", "Phone", "Property", "Room", "Bed", "Status", "Outstanding", "Pending since", "Days overdue"]];
  for (const t of tenants) {
    const b = balances.get(t.id);
    if (!b || b.outstanding <= 0) continue;
    lines.push([
      t.name,
      t.phone,
      t.property.name,
      t.bed?.room.number ?? "",
      t.bed?.label ?? "",
      t.status,
      String(b.outstanding),
      b.oldestUnpaid ? toDateInput(b.oldestUnpaid) : "",
      String(b.overdueDays),
    ]);
  }
  const body = lines.map((l) => l.map(cell).join(",")).join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="neravu-dues.csv"`,
    },
  });
}
