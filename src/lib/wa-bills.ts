import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { asLang, makeT, type Lang } from "./i18n";
import { categoryText, fmtDate, rupees } from "./format";
import { today, parseDateInput } from "./dates";
import { phoneKey } from "./join";
import { extractReceipt, scanEnabled } from "./receipt-ai";
import { parseReceipt, type ReceiptData } from "./receipt";
import { billAmount, parseButton, replyIntent, type Inbound } from "./wa-inbound";
import { fetchMedia, sendButtons, sendText } from "./whatsapp";

const DAILY_LIMIT = 60; // bill photos per PG per day, to cap reading costs
const KEEP_DAYS = 7;

type Sender = { ownerId: string; staffId: string | null; name: string; lang: Lang; pg: string };

/** Who sent this? A caretaker (phone is unique) or an owner whose profile phone matches. */
async function findSender(from: string): Promise<Sender | "unknown" | "ambiguous"> {
  const key = phoneKey(from);
  if (key.length < 10) return "unknown";
  const staff = await db.staff.findUnique({
    where: { phone: key },
    include: { owner: { select: { id: true, language: true, businessName: true, name: true } } },
  });
  if (staff?.active) {
    return { ownerId: staff.ownerId, staffId: staff.id, name: staff.name, lang: asLang(staff.owner.language), pg: staff.owner.businessName ?? staff.owner.name };
  }
  const owners = (
    await db.owner.findMany({
      where: { phone: { contains: key.slice(-4) } },
      select: { id: true, name: true, phone: true, language: true, businessName: true },
    })
  ).filter((o) => o.phone && phoneKey(o.phone) === key);
  if (owners.length > 1) return "ambiguous";
  if (owners.length === 0) return "unknown";
  const o = owners[0];
  return { ownerId: o.id, staffId: null, name: o.name, lang: asLang(o.language), pg: o.businessName ?? o.name };
}

/** Make the photo small enough to store and read: max 1600px, JPEG. */
async function shrink(bytes: Buffer): Promise<{ data: Buffer; mime: string } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
    return { data, mime: "image/jpeg" };
  } catch {
    return null;
  }
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return;
    throw e;
  }
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400_000);
  await Promise.all([
    db.waInbound.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    db.pendingExpense.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  const sender = await findSender(m.from);
  if (sender === "unknown" || sender === "ambiguous") {
    if (m.kind !== "other") await sendText(m.from, makeT("en")(sender === "unknown" ? "waUnknown" : "waAmbiguous"));
    return;
  }
  const t = makeT(sender.lang);

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
  if (!scanEnabled()) return void (await sendText(m.from, t("waBillOff")));
  const since = new Date(Date.now() - 86400_000);
  if ((await db.pendingExpense.count({ where: { ownerId: sender.ownerId, createdAt: { gte: since } } })) >= DAILY_LIMIT) {
    return void (await sendText(m.from, t("waBillLimit")));
  }
  const media = m.mediaId ? await fetchMedia(m.mediaId) : null;
  if (!media || !media.mime.startsWith("image/")) return void (await sendText(m.from, media ? t("waBillPhotoOnly") : t("waBillFailed")));
  const img = await shrink(media.bytes);
  const bytes = img ? new Uint8Array(img.data) : null;
  if (!img) return void (await sendText(m.from, t("waBillFailed")));

  let data: ReceiptData;
  try {
    data = await extractReceipt(img.data.toString("base64"), img.mime);
  } catch {
    return void (await sendText(m.from, t("waBillFailed")));
  }
  if (!data.isReceipt || billAmount(data) <= 0) return void (await sendText(m.from, t("waBillNotBill")));

  const pending = await db.pendingExpense.create({
    data: {
      ownerId: sender.ownerId,
      staffId: sender.staffId,
      senderName: sender.name,
      waFrom: m.from,
      data: data as unknown as Prisma.InputJsonValue,
      mime: img.mime,
      image: bytes!,
    },
  });
  const res = await sendButtons(m.from, summary(t, data, sender.lang), [
    { id: `exp_yes_${pending.id}`, title: t("waYes") },
    { id: `exp_no_${pending.id}`, title: t("waNo") },
  ]);
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
        category: r.category,
        amount,
        spentOn: (r.date && parseDateInput(r.date)) || today(),
        vendor: r.vendor,
        source: "WHATSAPP",
        addedByName: pending.senderName,
        billTotal: r.total && r.total > 0 ? r.total : null,
        items: r.items.length ? { create: r.items.map((i) => ({ name: i.name, quantity: i.quantity, amount: i.amount })) } : undefined,
        receipt: pending.image.length ? { create: { mime: pending.mime, data: pending.image } } : undefined,
      },
    });
    await tx.pendingExpense.update({ where: { id: pending.id }, data: { expenseId: exp.id, image: new Uint8Array(0) } });
    return exp.id;
  });
  if (!expenseId) return void (await sendText(from, t("waBillAlready")));
  await sendText(from, t("waBillAdded", { amt: rupees(amount), cat: categoryText(t, r.category) }));
}
