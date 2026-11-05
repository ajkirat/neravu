import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { toCsv, type Cell } from "@/lib/csv";
import { parseElectricityDescription } from "@/lib/electricity";

const stamp = () => new Date().toISOString().slice(0, 10);
const csv = (name: string, body: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="neravu-${name}-${stamp()}.csv"`,
      "Cache-Control": "no-store",
    },
  });

/** Plain-English line for a charge, whatever language the app is in. */
function chargeText(c: { type: string; period: string | null; description: string }): string {
  const e = parseElectricityDescription(c.description);
  if (e) return `Electricity ${e.period}, room ${e.room} (${e.days}/${e.total} days)`;
  if (c.type === "RENT" && c.period) return `Rent ${c.period}`;
  return c.description;
}

/** Owner-only downloads of the owner's own records. Nothing here ever includes passwords or payment keys. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const owner = await requireOwner();
  const { kind } = await params;
  const where = { ownerId: owner.id };

  switch (kind) {
    case "tenants": {
      const rows = await db.tenant.findMany({
        where,
        include: { property: true, bed: { include: { room: true } } },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      });
      return csv(
        "tenants",
        toCsv(
          ["Name", "Phone", "Email", "Property", "Room", "Bed", "Status", "Move-in", "Notice given", "Move-out", "Monthly rent", "Rent due day", "Deposit", "ID type", "ID number", "Emergency contact", "Emergency phone", "Occupation", "Notes"],
          rows.map((t): Cell[] => [t.name, t.phone, t.email, t.property.name, t.bed?.room.number, t.bed?.label, t.status, t.moveInDate, t.noticeDate, t.moveOutDate, t.monthlyRent, t.rentDueDay, t.deposit, t.idType, t.idNumber, t.emergencyName, t.emergencyPhone, t.occupation, t.notes]),
        ),
      );
    }
    case "payments": {
      const rows = await db.payment.findMany({ where: { tenant: where }, include: { tenant: { include: { property: true } } }, orderBy: [{ paidOn: "desc" }, { id: "desc" }] });
      return csv(
        "payments",
        toCsv(
          ["Receipt no", "Date", "Tenant", "Property", "Amount", "Method", "Reference", "Note", "Recorded by"],
          rows.map((p): Cell[] => [String(p.id).padStart(5, "0"), p.paidOn, p.tenant.name, p.tenant.property.name, p.amount, p.amount < 0 ? "REFUND" : p.method, p.reference, p.note, p.recordedByName]),
        ),
      );
    }
    case "charges": {
      const rows = await db.charge.findMany({ where: { tenant: where }, include: { tenant: { include: { property: true } } }, orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }] });
      return csv(
        "rent-and-charges",
        toCsv(["Due date", "Tenant", "Property", "Type", "Description", "Amount"], rows.map((c): Cell[] => [c.dueDate, c.tenant.name, c.tenant.property.name, c.type, chargeText(c), c.amount])),
      );
    }
    case "expenses": {
      const rows = await db.expense.findMany({ where, include: { property: true, items: { orderBy: { id: "asc" } } }, orderBy: { spentOn: "desc" } });
      return csv(
        "expenses",
        toCsv(
          ["Date", "Property", "Category", "Shop", "Amount", "Note", "Items", "Source"],
          rows.map((e): Cell[] => [e.spentOn, e.property?.name ?? "General", e.category, e.vendor, e.amount, e.note, e.items.map((i) => `${i.name}${i.quantity !== 1 ? ` x${i.quantity}` : ""} = ${i.amount}`).join("; "), e.source]),
        ),
      );
    }
    case "rooms": {
      const rows = await db.room.findMany({ where: { property: where }, include: { property: true, beds: true } });
      rows.sort((a, b) => a.property.name.localeCompare(b.property.name) || a.number.localeCompare(b.number, undefined, { numeric: true }));
      return csv("rooms", toCsv(["Property", "Room", "Floor", "Beds", "Rent per bed"], rows.map((r): Cell[] => [r.property.name, r.number, r.floor, r.beds.length, r.rent])));
    }
    case "leads": {
      const rows = await db.lead.findMany({ where, include: { property: true }, orderBy: { createdAt: "desc" } });
      return csv("leads", toCsv(["Date", "Name", "Phone", "Property", "Source", "Status", "Follow up", "Note"], rows.map((l): Cell[] => [l.createdAt, l.name, l.phone, l.property?.name, l.source, l.status, l.followUpOn, l.note])));
    }
    case "complaints": {
      const rows = await db.complaint.findMany({ where, include: { tenant: true, property: true }, orderBy: { createdAt: "desc" } });
      return csv("complaints", toCsv(["Date", "Tenant", "Property", "Problem", "Details", "Status"], rows.map((c): Cell[] => [c.createdAt, c.tenant?.name, c.property?.name, c.title, c.details, c.status])));
    }
    case "backup": {
      const [properties, rooms, tenants, charges, payments, expenses, leads, complaints, bills, staff] = await Promise.all([
        db.property.findMany({ where }),
        db.room.findMany({ where: { property: where }, include: { beds: true } }),
        db.tenant.findMany({ where, omit: { payToken: true } }),
        db.charge.findMany({ where: { tenant: where } }),
        db.payment.findMany({ where: { tenant: where } }),
        db.expense.findMany({ where, include: { items: true } }),
        db.lead.findMany({ where }),
        db.complaint.findMany({ where }),
        db.electricityBill.findMany({ where }),
        db.staff.findMany({ where, select: { id: true, name: true, phone: true, active: true, createdAt: true } }),
      ]);
      const body = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          note: "Neravu backup. Passwords, payment keys and private links are not included.",
          owner: { name: owner.name, email: owner.email, businessName: owner.businessName },
          properties, rooms, tenants, charges, payments, expenses, leads, complaints, electricityBills: bills, caretakers: staff,
        },
        null,
        2,
      );
      return new Response(body, {
        headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="neravu-backup-${stamp()}.json"`, "Cache-Control": "no-store" },
      });
    }
    default:
      return new Response("Not found", { status: 404 });
  }
}
