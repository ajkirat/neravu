/**
 * A minimal PDF writer: one JPEG picture per A4 page, scaled to fill the page width. Enough for
 * reports we draw as images (fonts and layout are already in the picture), with no PDF library.
 */
export type PdfPage = { jpeg: Buffer; width: number; height: number };

const A4_W = 595.28;
const A4_H = 841.89;

export function jpegsToPdf(pages: PdfPage[], title = "Report"): Buffer {
  const parts: Buffer[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (b: Buffer | string) => {
    const buf = typeof b === "string" ? Buffer.from(b, "binary") : b;
    parts.push(buf);
    size += buf.length;
  };
  const obj = (n: number, body: (Buffer | string)[]) => {
    offsets[n] = size;
    push(`${n} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  };
  const safeTitle = title.replace(/[^\x20-\x7e]/g, "").replace(/[()\\]/g, "");

  push("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  // 1 catalog, 2 pages, 3 info, then per page: page, contents, image.
  const pageIds = pages.map((_, i) => 4 + i * 3);
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`]);
  obj(3, [`<< /Title (${safeTitle}) /Producer (Neravu) >>`]);
  pages.forEach((p, i) => {
    const pageId = pageIds[i];
    const scale = Math.min(A4_W / p.width, A4_H / p.height);
    const w = (p.width * scale).toFixed(2);
    const h = (p.height * scale).toFixed(2);
    const y = (A4_H - p.height * scale).toFixed(2); // top of the page
    const content = `q ${w} 0 0 ${h} 0 ${y} cm /Im0 Do Q`;
    obj(pageId, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im0 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`]);
    obj(pageId + 1, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
    obj(pageId + 2, [
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      p.jpeg,
      "\nendstream",
    ]);
  });
  const count = 4 + pages.length * 3;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(parts);
}
