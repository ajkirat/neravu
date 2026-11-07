import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { fmtDate, rupees } from "./format";
import { makeT, type MsgKey } from "./i18n";
import { jpegsToPdf } from "./pdf";
import { cleanPitchInputs, computePitch, customPainText, isCustomPain, type PitchInputs } from "./pitch";

// The PDF is in English: the drawing library cannot join Kannada / Telugu / Hindi letters correctly.
const t = makeT("en");
const W = 1240; // A4 at 150 dpi
const H = 1754;
const C = { brand: "#0f6b62", dark: "#0b4a45", soft: "#e6f2ef", ink: "#12302d", muted: "#5d6e6a", line: "#dfe5e2", gold: "#e9a63a", goldSoft: "#fbf0dc" };

/** Keep text the PDF font can draw: plain quotes, and anything in an Indian script replaced by a note. */
function safe(s: string | null | undefined, fallback = ""): string {
  if (!s) return fallback;
  const out = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[ऀ-෿]+/g, "").replace(/\s{2,}/g, " ").trim();
  return out || "(written in their own language; see the app)";
}

export type PitchRecord = {
  prospectName: string;
  pgName: string | null;
  city: string | null;
  inputs: unknown;
  pains: string[];
  otherPains: string | null;
  createdAt: Date;
};

const Row = ({ label, how, value }: { label: string; how: string; value: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${C.line}`, padding: "16px 0" }}>
    <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
      <div style={{ display: "flex", fontSize: 28, color: C.ink }}>{label}</div>
      <div style={{ display: "flex", fontSize: 20, color: C.muted, marginTop: 2 }}>{how}</div>
    </div>
    <div style={{ display: "flex", fontSize: 30, color: C.ink }}>{value}</div>
  </div>
);

function page1(p: PitchRecord, by: { name: string; phone: string | null }) {
  const i: PitchInputs = cleanPitchInputs((p.inputs ?? {}) as Record<string, unknown>);
  const r = computePitch(i);
  const who = safe(p.pgName) || safe(p.prospectName);
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "white", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", background: C.brand, color: "white", padding: "56px 80px" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: "#bfe0db" }}>NERAVU · SAVINGS FOR YOUR PG</div>
        <div style={{ display: "flex", fontSize: 60, marginTop: 10 }}>{who}</div>
        <div style={{ display: "flex", fontSize: 26, marginTop: 8, color: "#d7ece9" }}>
          {[safe(p.prospectName), safe(p.city), fmtDate(p.createdAt, "en")].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div style={{ display: "flex", padding: "44px 80px 0", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: C.soft, borderRadius: 24, padding: "28px 32px" }}>
          <div style={{ display: "flex", fontSize: 24, color: C.muted }}>Every month</div>
          <div style={{ display: "flex", fontSize: 68, color: C.brand }}>{rupees(r.perMonth)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: C.goldSoft, borderRadius: 24, padding: "28px 32px" }}>
          <div style={{ display: "flex", fontSize: 24, color: C.muted }}>Every year</div>
          <div style={{ display: "flex", fontSize: 68, color: "#8a5a0c" }}>{rupees(r.perYear)}</div>
        </div>
      </div>
      <div style={{ display: "flex", padding: "20px 80px 0", fontSize: 26, color: C.ink, gap: 40 }}>
        <div style={{ display: "flex" }}>{`Time saved: ${r.hours} hours a month (worth ${rupees(r.timeValue)})`}</div>
        <div style={{ display: "flex" }}>{`Money recovered: ${rupees(r.money)} a month`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "28px 80px 0" }}>
        <div style={{ display: "flex", fontSize: 30, color: C.ink, marginBottom: 6 }}>How it is worked out</div>
        {r.lines.map((l) => (
          <Row key={l.key} label={t(`line_${l.key}` as MsgKey)} how={safe(t(`how_${l.key}` as MsgKey))} value={l.hours ? `${l.hours} h` : rupees(l.rupees)} />
        ))}
      </div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", padding: "0 80px 48px", fontSize: 22, color: C.muted }}>
        <div style={{ display: "flex" }}>
          {`Based on your numbers: ${i.beds} beds, ${rupees(i.rent)} rent, ${i.occupancy}% filled, ${i.chaseHours} h chasing rent, ${i.bills} bills, ${i.rooms} rooms for electricity, ${i.leavers} tenants leaving a month, your hour = ${rupees(i.hourValue)}.`}
        </div>
        <div style={{ display: "flex", marginTop: 10 }}>{`Prepared by ${safe(by.name)}${by.phone ? ` · ${by.phone}` : ""}`}</div>
      </div>
    </div>
  );
}

function page2(p: PitchRecord, by: { name: string; phone: string | null }) {
  const points = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ t: safe(t(`pitchP${n}t` as MsgKey)), b: safe(t(`pitchP${n}b` as MsgKey)) }));
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "white", fontFamily: "sans-serif", padding: "64px 80px" }}>
      <div style={{ display: "flex", fontSize: 40, color: C.ink }}>What you told us</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 20 }}>
        {(p.pains.length ? p.pains : ["none"]).map((k) => (
          <div key={k} style={{ display: "flex", fontSize: 24, padding: "10px 20px", borderRadius: 999, background: C.goldSoft, color: "#8a5a0c" }}>
            {k === "none" ? "Nothing ticked" : isCustomPain(k) ? safe(customPainText(k)) : safe(t(`pain_${k}` as MsgKey))}
          </div>
        ))}
      </div>
      {p.otherPains && <div style={{ display: "flex", fontSize: 24, color: C.ink, marginTop: 18 }}>{`Also: ${safe(p.otherPains)}`}</div>}

      <div style={{ display: "flex", fontSize: 40, color: C.ink, marginTop: 48 }}>What Neravu does</div>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: 16, gap: 18 }}>
        {points.map((x) => (
          <div key={x.t} style={{ display: "flex", flexDirection: "column", width: 525, background: C.soft, borderRadius: 20, padding: "20px 24px" }}>
            <div style={{ display: "flex", fontSize: 26, color: C.brand }}>{x.t}</div>
            <div style={{ display: "flex", fontSize: 21, color: C.ink, marginTop: 6 }}>{x.b}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", background: C.brand, color: "white", borderRadius: 24, padding: "32px 40px" }}>
        <div style={{ display: "flex", fontSize: 34 }}>Try it free with one PG for a month.</div>
        <div style={{ display: "flex", fontSize: 26, color: "#d7ece9", marginTop: 8 }}>{`We set it up with you in 30 minutes. Call or WhatsApp ${safe(by.name)}${by.phone ? ` on ${by.phone}` : ""}.`}</div>
      </div>
    </div>
  );
}

/** The pitch as a 2-page A4 PDF. */
export async function pitchPdf(p: PitchRecord, by: { name: string; phone: string | null }): Promise<Buffer> {
  const pages = [];
  for (const el of [page1(p, by), page2(p, by)]) {
    const png = Buffer.from(await new ImageResponse(el, { width: W, height: H }).arrayBuffer());
    pages.push({ jpeg: await sharp(png).jpeg({ quality: 88 }).toBuffer(), width: W, height: H });
  }
  return jpegsToPdf(pages, `Neravu savings - ${safe(p.pgName) || safe(p.prospectName)}`);
}
