import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { pitchPdf } from "@/lib/pitch-report";

/** The pitch as a PDF, to send to the PG owner on WhatsApp. Owner only. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  const { id } = await params;
  const p = await db.pitch.findFirst({ where: { id, ownerId: owner.id } });
  if (!p) return new Response("Not found", { status: 404 });
  const pdf = await pitchPdf(p, { name: owner.name, phone: owner.phone });
  const name = `Neravu-${(p.pgName ?? p.prospectName).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "savings"}.pdf`;
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
