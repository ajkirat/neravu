import "server-only";
import { ImageResponse } from "next/og";
import { db } from "./db";
import { summarizeLedger } from "./billing";
import { fmtDate, methodText, rupees } from "./format";
import { makeT } from "./i18n";
import { today } from "./dates";

// The picture is in English on purpose: the image renderer cannot join Kannada / Telugu letters
// correctly. The WhatsApp message under the picture stays in the tenant's own language.
const t = makeT("en");
const W = 800;

/** Height that fits the rows: long values wrap onto a second line. */
function heightFor(d: Data): number {
  const rows = d.rows.reduce((h, [, v]) => h + (v.length > 32 ? 108 : 72), 0);
  return 40 + 190 + (d.address ? 30 : 0) + 210 + rows + 130 + 90 + 40;
}

type Data = {
  no: string;
  pg: string;
  address: string | null;
  amount: string;
  rows: [string, string][];
  balance: { text: string; due: boolean };
  issuedBy: string;
};

/** What goes on the receipt picture. null if the payment is not a received payment of this owner. */
export async function receiptImageData(paymentId: number, ownerId?: string): Promise<Data | null> {
  const p = await db.payment.findFirst({
    where: { id: paymentId, amount: { gt: 0 }, ...(ownerId ? { tenant: { ownerId } } : {}) },
    include: {
      tenant: {
        select: {
          name: true,
          phone: true,
          property: { select: { name: true, address: true } },
          bed: { select: { label: true, room: { select: { number: true } } } },
          owner: { select: { name: true, businessName: true } },
          charges: { select: { amount: true, dueDate: true } },
          payments: { select: { amount: true } },
        },
      },
    },
  });
  if (!p) return null;
  const tn = p.tenant;
  const s = summarizeLedger(tn.charges, tn.payments, today());
  const rows: [string, string][] = [
    [t("receivedFrom"), tn.name],
    [t("mobile"), tn.phone],
    [t("stay"), `${tn.property.name}${tn.bed ? `, Room ${tn.bed.room.number} Bed ${tn.bed.label}` : ""}`],
    [t("date"), fmtDate(p.paidOn, "en")],
    [t("mode"), methodText(t, p.method)],
  ];
  if (p.reference) rows.push([t("reference"), p.reference]);
  return {
    no: String(p.id).padStart(5, "0"),
    pg: tn.owner.businessName ?? tn.property.name,
    address: tn.property.address,
    amount: rupees(p.amount),
    rows,
    balance: s.outstanding > 0 ? { text: t("rcptStillDue", { amt: rupees(s.outstanding) }), due: true } : { text: t("rcptAllClear"), due: false },
    issuedBy: t("issuedBy", { name: tn.owner.name }),
  };
}

const C = { brand: "#0f5c55", brandDark: "#0b4a45", light: "#e8f3f1", ink: "#12302d", muted: "#5f6f6c", line: "#e3e8e6", red: "#b42318", gold: "#f0b14d" };

/** The receipt as a PNG picture, 800 wide; as tall as its rows need. */
export async function renderReceiptPng(d: Data): Promise<Buffer> {
  const H = heightFor(d);
  const img = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "#f6f5f1", padding: 40, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "white", borderRadius: 28, overflow: "hidden", border: `2px solid ${C.line}` }}>
          <div style={{ display: "flex", flexDirection: "column", background: C.brand, color: "white", padding: "36px 44px" }}>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#bfe0db" }}>RENT RECEIPT</div>
            <div style={{ display: "flex", fontSize: 44, marginTop: 8 }}>{d.pg}</div>
            {d.address && <div style={{ display: "flex", fontSize: 22, marginTop: 6, color: "#d7ece9" }}>{d.address}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "36px 44px", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 24, color: C.muted }}>{`No. ${d.no}`}</div>
              <div style={{ display: "flex", fontSize: 72, color: C.ink }}>{d.amount}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              {/* Drawn, not a ✓ character: the built-in font has no tick and would fetch one from the internet. */}
              <div style={{ display: "flex", alignItems: "center", background: C.brand, color: "white", borderRadius: 999, padding: "6px 18px 6px 10px", fontSize: 22, letterSpacing: 2 }}>
                <div style={{ display: "flex", width: 22, height: 22, borderRadius: 999, background: C.gold, marginRight: 10 }} />
                PAID
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
              {d.rows.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${C.line}`, padding: "18px 0", fontSize: 26, lineHeight: 1.4 }}>
                  <div style={{ display: "flex", color: C.muted }}>{k}</div>
                  <div style={{ display: "flex", color: C.ink, maxWidth: 470, textAlign: "right", justifyContent: "flex-end" }}>{v}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 22,
                padding: "20px 24px",
                borderRadius: 16,
                fontSize: 28,
                background: d.balance.due ? "#fdecea" : C.light,
                color: d.balance.due ? C.red : C.brand,
              }}
            >
              {d.balance.text}
            </div>
            <div style={{ display: "flex", flex: 1, minHeight: 24 }} />
            <div style={{ display: "flex", fontSize: 20, color: C.muted }}>{d.issuedBy}</div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
  return Buffer.from(await img.arrayBuffer());
}
