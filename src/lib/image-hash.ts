import { createHash } from "node:crypto";

/** Bits that differ between two 64-bit hex hashes. */
export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    let x = parseInt(a.slice(i, i + 4), 16) ^ parseInt(b.slice(i, i + 4), 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}

/** Near-identical photos: re-sent, re-compressed, slightly cropped or brightened. */
export const SIMILAR_BITS = 6;

/**
 * Shrink a bill photo for storage (max 1600px JPEG) and fingerprint it: sha256 of the stored bytes catches
 * exact copies, a 64-bit difference hash catches the same photo saved or sent again.
 */
export async function normalizeBill(input: Buffer): Promise<{ data: Buffer; mime: string; sha256: string; phash: string } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
    return { data, mime: "image/jpeg", sha256: createHash("sha256").update(data).digest("hex"), phash: await dhash(data) };
  } catch {
    return null;
  }
}

/** Difference hash: 9x8 grey thumbnail, one bit per "is this pixel brighter than its right neighbour". */
export async function dhash(input: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default;
  const px = await sharp(input).rotate().grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let hex = "";
  for (let row = 0; row < 8; row++) {
    let nibbleBits = 0;
    let bits = 0;
    for (let col = 0; col < 8; col++) {
      bits = (bits << 1) | (px[row * 9 + col] > px[row * 9 + col + 1] ? 1 : 0);
      nibbleBits++;
      if (nibbleBits === 4) {
        hex += bits.toString(16);
        bits = 0;
        nibbleBits = 0;
      }
    }
  }
  return hex;
}

/** "Sri Ganesh Stores." and "SRI GANESH STORES" are the same shop. */
export const vendorKey = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/[^a-z0-9ఀ-೿ಀ-೿]/g, "");
