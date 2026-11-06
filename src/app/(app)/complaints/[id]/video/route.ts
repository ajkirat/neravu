import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";

/**
 * A video a tenant attached to a complaint. Owner and caretakers. Answers byte-range requests: iPhones
 * only play a video when the server can send it in parts.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { owner } = await requireActor();
  const c = await db.complaint.findFirst({ where: { id, ownerId: owner.id }, select: { video: true, videoMime: true } });
  if (!c?.video || !c.videoMime) return new Response("Not found", { status: 404 });
  const all = new Uint8Array(c.video);
  const base = { "Content-Type": c.videoMime, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (!m || (!m[1] && !m[2])) return new Response(all, { headers: { ...base, "Content-Length": String(all.length) } });
  let start = m[1] ? Number(m[1]) : Math.max(0, all.length - Number(m[2]));
  let end = m[1] && m[2] ? Number(m[2]) : all.length - 1;
  end = Math.min(end, all.length - 1);
  start = Math.min(start, end);
  return new Response(all.subarray(start, end + 1), {
    status: 206,
    headers: { ...base, "Content-Range": `bytes ${start}-${end}/${all.length}`, "Content-Length": String(end - start + 1) },
  });
}
