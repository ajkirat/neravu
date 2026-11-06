import { requireOwner } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { registerRows } from "@/lib/register";

export async function GET(req: Request) {
  const owner = await requireOwner();
  const u = new URL(req.url);
  const rows = await registerRows(owner.id, { all: u.searchParams.get("all") === "1", propertyId: u.searchParams.get("property") ?? undefined });
  const csv = toCsv(
    ["No", "Name", "Mobile", "ID type", "ID number", "Home address", "Occupation", "Property", "Room", "Bed", "Moved in", "Moved out", "Emergency contact", "Emergency phone"],
    rows.map((r, i) => [
      i + 1,
      r.name,
      r.phone,
      r.idType,
      r.idNumber,
      r.permanentAddress,
      r.occupation,
      r.property.name,
      r.bed?.room.number,
      r.bed?.label,
      r.moveInDate,
      r.moveOutDate,
      r.emergencyName,
      r.emergencyPhone,
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tenant-register-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
