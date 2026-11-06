import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";

/** A photo a tenant attached to a complaint. Owner and caretakers (they fix things). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { owner } = await requireActor();
  const c = await db.complaint.findFirst({ where: { id, ownerId: owner.id }, select: { photo: true, photoMime: true } });
  if (!c?.photo || !c.photoMime) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(c.photo), {
    headers: { "Content-Type": c.photoMime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
