import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { asLang, makeT, type Lang } from "./i18n";
import { canonicalCategory, categoryText, fmtDate, rupees } from "./format";
import { today, parseDateInput } from "./dates";
import { phoneKey } from "./join";
import { extractReceipt, scanEnabled } from "./receipt-ai";
import { parseReceipt, type ReceiptData } from "./receipt";
import { billAmount, parseButton, replyIntent, type Inbound } from "./wa-inbound";
import { fetchMedia, sendButtons, sendText } from "./whatsapp";
import { findDuplicate } from "./duplicates";
import { SIMILAR_BITS, hamming, normalizeBill } from "./image-hash";

const DAILY_LIMIT = 60; // bill photos per PG per day, to cap reading costs
const KEEP_DAYS = 7;

/** Append a step to this message's trace (shown in the WhatsApp check). Best effort: never breaks the flow. */
async function step(id: string, text: string) {
  try {
    const row = await db.waInbound.findUnique({ where: { id }, select: { trace: true } });
    const next = `${row?.trace ? row.trace + " > " : ""}${text}`.slice(-900);
    await db.waInbound.update({ where: { id }, data: { trace: next } });
  } catch {
    /* ignore */
  }
}

type Sender = { ownerId: string; staffId: string | null; name: string; lang: Lang; pg: string };

/**
 * Who sent this? The owner whose sign-in mobile it is, else an active caretaker. The owner comes first:
 * while testing, one number can be both, and bills from the owner's phone should say "owner".
 */
async function findSender(from: string): Promise<Sender | "unknown" | "ambiguous"> {
  const key = phoneKey(from);
  if (key.length < 10) return "unknown";
  const owner = await db.owner.findUnique({ where: { phoneKey: key }, select: { id: true, name: true, language: true, businessName: true } });
  if (owner) return { ownerId: owner.id, staffId: null, name: owner.name, lang: asLang(owner.language), pg: owner.businessName ?? owner.name };
  const staff = await db.staff.findUnique({
    where: { phone: key },
    include: { owner: { select: { id: true, language: true, businessName: true, name: true } } },
  });
  if (staff?.active) {
    return { ownerId: staff.ownerId, staffId: staff.id, name: staff.name, lang: asLang(staff.owner.language), pg: staff.owner.businessName ?? staff.owner.name };
  }
  // Owners from before sign-in by mobile, whose number could not be made their sign-in.
  const owners = (
    await db.owner.findMany({
      where: { phoneKey: null, phone: { contains: key.slice(-4) } },
      select: { id: true, name: true, phone: true, language: true, businessName: true },
    })
  ).filter((o) => o.phone && phoneKey(o.phone) === key);
  if (owners.length > 1) return "ambiguous";
  if (owners.length === 0) return "unknown";
  const o = owners[0];
  return { ownerId: o.id, staffId: null, name: o.name, lang: asLang(o.language), pg: o.businessName ?? o.name };
}

function summary(t: ReturnType<typeof makeT>, r: ReceiptData, lang: Lang) {
  const date = r.date ? parseDateInput(r.date) : null;
  return t("waBillAsk", {
    amt: rupees(billAmount(r)),
    cat: categoryText(t, r.category),
    vendor: r.vendor ? ` · ${r.vendor}` : "",
    date: fmtDate(date ?? today(), lang),
  });
}

/** Handle one incoming WhatsApp message. Never throws: problems become a polite reply. */
export async function handleInbound(m: Inbound): Promise<void> {
  // A webhook can be delivered more than once: handle each message id only once.
  try {
    await db.waInbound.create({ data: { id: m.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      console.log(`WhatsApp inbound: ${m.kind} already handled, skipped`);
      return;
    }
    throw e;
  }
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400_000);
  await Promise.all([
    db.waInbound.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    db.pendingExpense.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  await step(m.id, m.kind);
  const sender = await findSender(m.from);
  console.log(`WhatsApp inbound: ${m.kind} from ...${m.from.slice(-4)} -> ${typeof sender === "string" ? sender : "known sender"}`);
  if (sender === "unknown" || sender === "ambiguous") {
    await step(m.id, `sender ${sender}`);
    if (m.kind !== "other") await sendText(m.from, makeT("en")(sender === "unknown" ? "waUnknown" : "waAmbiguous"));
    return;
  }
  const t = makeT(sender.lang);
  await step(m.id, "known sender");

  if (m.kind === "image") return onPhoto(m, sender, t);
  if (m.kind === "document") {
    if (m.mime?.startsWith("image/")) return onPhoto(m, sender, t);
    await sendText(m.from, t("waBillPhotoOnly"));
    return;
  }
  const button = parseButton(m.buttonId);
  const answer = button?.answer ?? replyIntent(m.text);
  if (answer) return onAnswer(m.from, sender, t, answer, button?.pendingId);
  await sendText(m.from, t("waBillHelp", { name: sender.name.split(" ")[0], pg: sender.pg }));
}

async function onPhoto(m: Inbound, sender: Sender, t: ReturnType<typeof makeT>) {
  await step(m.id, "photo");
  if (!scanEnabled()) {
    console.error("WhatsApp bill: ANTHROPIC_API_KEY is not set");
    return void (await sendText(m.from, t("waBillOff")));
  }
  const since = new Date(Date.now() - 86400_000);
  if ((await db.pendingExpense.count({ where: { ownerId: sender.ownerId, createdAt: { gte: since } } })) >= DAILY_LIMIT) {
    return void (await sendText(m.from, t("waBillLimit")));
  }
  const media = m.mediaId ? await fetchMedia(m.mediaId) : null;
  await step(m.id, media ? `downloaded ${Math.round(media.bytes.length / 1024)}KB` : "DOWNLOAD FAILED");
  if (!media) console.error("WhatsApp bill: could not download the photo");
  if (!media || !media.mime.startsWith("image/")) return void (await sendText(m.from, media ? t("waBillPhotoOnly") : t("waBillFailed")));
  const img = await normalizeBill(media.bytes);
  await step(m.id, img ? "resized" : "RESIZE FAILED");
  const bytes = img ? new Uint8Array(img.data) : null;
  if (!img) return void (await sendText(m.from, t("waBillFailed")));

  let data: ReceiptData;
  try {
    data = await extractReceipt(img.data.toString("base64"), img.mime);
  } catch (e) {
    await step(m.id, `READ FAILED (${(e as Error).message})`);
    console.error("WhatsApp bill: reading failed:", (e as Error).message);
    return void (await sendText(m.from, t("waBillFailed")));
  }
  await step(m.id, data.isReceipt ? `read ${billAmount(data)}` : "read: not a bill");
  if (!data.isReceipt || billAmount(data) <= 0) return void (await sendText(m.from, t("waBillNotBill")));

  // Strict duplicate check: against saved expenses, and against a copy of this photo still waiting for Yes/No.
  const spentOn = data.date ? parseDateInput(data.date) : null;
  let dup = await findDuplicate(sender.ownerId, { sha256: img.sha256, phash: img.phash, amount: billAmount(data), vendor: data.vendor, spentOn });
  if (!dup) {
    const waiting = await db.pendingExpense.findMany({
      where: { ownerId: sender.ownerId, status: "PENDING", createdAt: { gte: new Date(Date.now() - 86400_000) } },
      select: { data: true, createdAt: true },
    });
    const twin = waiting.find((w) => {
      const d = w.data as { sha256?: string; phash?: string };
      return d.sha256 === img.sha256 || (d.phash && hamming(d.phash, img.phash) <= SIMILAR_BITS);
    });
    if (twin) dup = { expenseId: "", spentOn: spentOn ?? today(), amount: billAmount(data), vendor: data.vendor, reason: "SAME_PHOTO" };
  }
  const pending = await db.pendingExpense.create({
    data: {
      ownerId: sender.ownerId,
      staffId: sender.staffId,
      senderName: sender.name,
      waFrom: m.from,
      data: { ...data, sha256: img.sha256, phash: img.phash, dup: dup ? { expenseId: dup.expenseId, reason: dup.reason } : null } as unknown as Prisma.InputJsonValue,
      mime: img.mime,
      image: bytes!,
    },
  });
  const ask = dup
    ? `${summary(t, data, sender.lang)}\n\n${t("waDupAsk", { date: fmtDate(dup.spentOn, sender.lang), amt: rupees(dup.amount), vendor: dup.vendor ? ` · ${dup.vendor}` : "", why: t(`dup_${dup.reason}`) })}`
    : summary(t, data, sender.lang);
  const res = await sendButtons(m.from, ask, [
    { id: `exp_yes_${pending.id}`, title: dup ? t("waAddAnyway") : t("waYes") },
    { id: `exp_no_${pending.id}`, title: t("waNo") },
  ]);
  await step(m.id, res.ok ? "asked OK" : `ASK FAILED (${res.detail.slice(0, 160)})`);
  if (!res.ok) console.error("WhatsApp bill: could not ask", res.detail);
}

async function onAnswer(from: string, sender: Sender, t: ReturnType<typeof makeT>, answer: "yes" | "no", pendingId?: string) {
  const pending = pendingId
    ? await db.pendingExpense.findFirst({ where: { id: pendingId, waFrom: from, ownerId: sender.ownerId } })
    : await db.pendingExpense.findFirst({ where: { waFrom: from, ownerId: sender.ownerId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  if (!pending) return void (await sendText(from, t("waBillNoPending")));
  if (pending.status !== "PENDING") return void (await sendText(from, t("waBillAlready")));

  if (answer === "no") {
    const done = await db.pendingExpense.updateMany({ where: { id: pending.id, status: "PENDING" }, data: { status: "CANCELLED", image: new Uint8Array(0) } });
    return void (await sendText(from, t(done.count ? "waBillCancelled" : "waBillAlready")));
  }

  // Re-check what we stored, the same way as a fresh reading.
  const extra = pending.data as unknown as { sha256?: string; phash?: string; dup?: { expenseId: string } | null };
  const r = parseReceipt(
    (() => {
      const d = pending.data as unknown as ReceiptData;
      return { is_receipt: d.isReceipt, vendor: d.vendor, date: d.date, category: d.category, items: d.items, total: d.total };
    })(),
  );
  const amount = billAmount(r);
  const properties = await db.property.findMany({ where: { ownerId: sender.ownerId }, select: { id: true }, take: 2 });

  const expenseId = await db.$transaction(async (tx) => {
    // Claim it first so a double tap cannot add the bill twice.
    const claimed = await tx.pendingExpense.updateMany({ where: { id: pending.id, status: "PENDING" }, data: { status: "ADDED" } });
    if (!claimed.count) return null;
    const exp = await tx.expense.create({
      data: {
        ownerId: sender.ownerId,
        propertyId: properties.length === 1 ? properties[0].id : null,
        category: canonicalCategory(r.category),
        amount,
        spentOn: (r.date && parseDateInput(r.date)) || today(),
        vendor: r.vendor,
        source: "WHATSAPP",
        addedByName: pending.senderName,
        addedByStaffId: pending.staffId,
        billTotal: r.total && r.total > 0 ? r.total : null,
        items: r.items.length ? { create: r.items.map((i) => ({ name: i.name, quantity: i.quantity, amount: i.amount })) } : undefined,
        mayBeDuplicate: !!extra.dup,
        duplicateOfId: extra.dup?.expenseId || null,
        receipt: pending.image.length ? { create: { mime: pending.mime, data: pending.image, sha256: extra.sha256 ?? null, phash: extra.phash ?? null } } : undefined,
      },
    });
    await tx.pendingExpense.update({ where: { id: pending.id }, data: { expenseId: exp.id, image: new Uint8Array(0) } });
    return exp.id;
  });
  if (!expenseId) return void (await sendText(from, t("waBillAlready")));
  await sendText(from, t("waBillAdded", { amt: rupees(amount), cat: categoryText(t, r.category), when: fmtDate((r.date && parseDateInput(r.date)) || today(), sender.lang) }));
}
