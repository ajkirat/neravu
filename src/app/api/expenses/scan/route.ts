import { NextResponse } from "next/server";
import { currentActor } from "@/lib/auth";
import { findDuplicate } from "@/lib/duplicates";
import { normalizeBill } from "@/lib/image-hash";
import { billAmount } from "@/lib/wa-inbound";
import { parseDateInput } from "@/lib/dates";
import { ScanError, extractReceipt, scanEnabled } from "@/lib/receipt-ai";
import { tooMany } from "@/lib/throttle";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64 = 3_500_000; // ~2.6 MB of image; the browser shrinks photos well below this

/**
 * POST { image: base64, mediaType } -> { scanned, receipt?, duplicate? }. Checks whether this bill was already
 * added (same photo, near-identical photo, or same shop + amount + date), and reads it when bill reading is on.
 * Owner or caretaker; nothing is saved here.
 */
export async function POST(req: Request) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "login" }, { status: 401 });
  const owner = actor.owner;
  if (await tooMany(`scan:${owner.id}`, 40, 60 * 60 * 1000)) return NextResponse.json({ error: "rate" }, { status: 429 });

  let body: { image?: unknown; mediaType?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  const { image, mediaType } = body;
  if (typeof image !== "string" || typeof mediaType !== "string" || !TYPES.includes(mediaType) || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  if (image.length > MAX_BASE64) return NextResponse.json({ error: "big" }, { status: 413 });

  const norm = await normalizeBill(Buffer.from(image, "base64"));
  const toInfo = (d: Awaited<ReturnType<typeof findDuplicate>>) =>
    d && { expenseId: d.expenseId, date: d.spentOn.toISOString().slice(0, 10), amount: d.amount, vendor: d.vendor, reason: d.reason };
  if (!scanEnabled()) {
    const dup = norm ? await findDuplicate(owner.id, { sha256: norm.sha256, phash: norm.phash }) : null;
    return NextResponse.json({ scanned: false, duplicate: toInfo(dup) });
  }
  try {
    const receipt = await extractReceipt(image, mediaType);
    const dup = await findDuplicate(owner.id, {
      sha256: norm?.sha256,
      phash: norm?.phash,
      amount: receipt.isReceipt ? billAmount(receipt) : null,
      vendor: receipt.vendor,
      spentOn: receipt.date ? parseDateInput(receipt.date) : null,
    });
    return NextResponse.json({ scanned: true, receipt, duplicate: toInfo(dup) });
  } catch (e) {
    const code = e instanceof ScanError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "unavailable" ? 503 : 502 });
  }
}
