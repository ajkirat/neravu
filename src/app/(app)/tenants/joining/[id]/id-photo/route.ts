import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

/** The ID proof photo someone sent with their Join form. Owner only. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  const { id } = await params;
  const r = await db.joinRequest.findFirst({ where: { id, ownerId: owner.id }, select: { idPhoto: true, idPhotoMime: true } });
  if (!r?.idPhoto || !r.idPhotoMime) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(r.idPhoto), {
    headers: { "Content-Type": r.idPhotoMime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
