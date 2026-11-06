import { requireActor } from "@/lib/auth";
import { receiptImageData, renderReceiptPng } from "@/lib/receipt-image";

/** The receipt picture, for the owner or a caretaker to see or share by hand. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { owner } = await requireActor();
  const { id } = await params;
  const d = await receiptImageData(Number(id) || -1, owner.id);
  if (!d) return new Response("Not found", { status: 404 });
  const png = await renderReceiptPng(d);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="receipt-${d.no}.png"` },
  });
}
