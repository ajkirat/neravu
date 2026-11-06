import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { dhash, hamming, normalizeBill, vendorKey } from "./image-hash";

// A fake "bill": white page with dark text bars, as an SVG rendered to JPEG.
const bill = (shift = 0, lines = [40, 90, 140, 190, 240, 300]) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#fafafa"/>${lines
    .map((y, i) => `<rect x="${30 + shift}" y="${y}" width="${200 + i * 20}" height="18" fill="#222"/>`)
    .join("")}<rect x="250" y="520" width="120" height="30" fill="#000"/></svg>`)).jpeg({ quality: 90 }).toBuffer();

describe("bill fingerprints", () => {
  it("the same photo re-saved at another quality is near-identical", async () => {
    const a = await bill();
    const b = await sharp(a).jpeg({ quality: 40 }).toBuffer();
    expect(hamming(await dhash(a), await dhash(b))).toBeLessThanOrEqual(6);
  });
  it("a slightly brighter copy is still near-identical", async () => {
    const a = await bill();
    const b = await sharp(a).modulate({ brightness: 1.15 }).toBuffer();
    expect(hamming(await dhash(a), await dhash(b))).toBeLessThanOrEqual(6);
  });
  it("a different bill is far apart", async () => {
    const a = await bill();
    const c = await bill(0, [60, 200, 260, 330, 420, 480]);
    expect(hamming(await dhash(a), await dhash(c))).toBeGreaterThan(6);
  });
  it("normalising is deterministic, so exact copies share a sha256", async () => {
    const a = await bill();
    const n1 = await normalizeBill(a);
    const n2 = await normalizeBill(Buffer.from(a));
    expect(n1?.sha256).toBe(n2?.sha256);
    expect(n1?.phash).toHaveLength(16);
  });
  it("hamming and vendor keys", () => {
    expect(hamming("0000000000000000", "000000000000000f")).toBe(4);
    expect(vendorKey("Sri Ganesh Stores.")).toBe(vendorKey("SRI GANESH STORES"));
  });
});
