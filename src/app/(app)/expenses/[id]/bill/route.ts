import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

/** The bill photo behind an expense. Owner only. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const r = await db.expenseReceipt.findFirst({ where: { expenseId: id, expense: { ownerId: owner.id } } });
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(r.data), {
    headers: { "Content-Type": r.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
