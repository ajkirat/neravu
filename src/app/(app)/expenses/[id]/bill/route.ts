import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";

/** The bill photo behind an expense. The owner sees all; a caretaker only the bills they added. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { owner, role, staff } = await requireActor();
  const r = await db.expenseReceipt.findFirst({
    where: { expenseId: id, expense: { ownerId: owner.id, ...(role === "OWNER" ? {} : { addedByStaffId: staff?.id ?? "-" }) } },
    select: { data: true, mime: true },
  });
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(r.data), {
    headers: { "Content-Type": r.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
