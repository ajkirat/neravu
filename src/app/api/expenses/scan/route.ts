import { NextResponse } from "next/server";
import { currentOwner } from "@/lib/auth";
import { ScanError, extractReceipt, scanEnabled } from "@/lib/receipt-ai";
import { tooMany } from "@/lib/throttle";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64 = 3_500_000; // ~2.6 MB of image; the browser shrinks photos well below this

/** POST { image: base64, mediaType } -> the bill read into category, items and total. Owner only. */
export async function POST(req: Request) {
  const owner = await currentOwner();
  if (!owner) return NextResponse.json({ error: "login" }, { status: 401 });
  if (!scanEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (await tooMany(`scan:${owner.id}`, 30, 60 * 60 * 1000)) return NextResponse.json({ error: "rate" }, { status: 429 });

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

  try {
    return NextResponse.json(await extractReceipt(image, mediaType));
  } catch (e) {
    const code = e instanceof ScanError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "unavailable" ? 503 : 502 });
  }
}
