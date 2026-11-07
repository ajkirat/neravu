import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

/** A tenant's ID proof photo. Owner only: caretakers never see ID documents. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  const { id } = await params;
  const t = await db.tenant.findFirst({ where: { id, ownerId: owner.id }, select: { idPhoto: true, idPhotoMime: true } });
  if (!t?.idPhoto || !t.idPhotoMime) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(t.idPhoto), {
    headers: { "Content-Type": t.idPhotoMime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
