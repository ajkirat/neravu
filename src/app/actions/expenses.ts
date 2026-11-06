"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActor, requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { EXPENSE_CATEGORIES } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { MAX_ITEMS, sumItems } from "@/lib/receipt";
import type { FormState } from "@/components/action-form";
import { findDuplicate, type DuplicateReason } from "@/lib/duplicates";
import { normalizeBill } from "@/lib/image-hash";

/** What the person sees when a bill looks already added. */
export type DupInfo = { expenseId: string; date: string; amount: number; vendor: string | null; reason: DuplicateReason };
export type ExpenseState = (FormState & { duplicate?: DupInfo }) | undefined;

const MAX_PHOTO_BASE64 = 3_500_000;

const itemsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(120),
      quantity: z.number().positive().max(100000),
      amount: z.number().int().min(-10_000_000).max(10_000_000),
    }),
  )
  .max(MAX_ITEMS);

export async function createExpense(_: ExpenseState, fd: FormData): Promise<ExpenseState> {
  const { t: tr } = await getT();
  // Caretakers may add bills too; they only ever see their own, and cannot delete.
  const { owner, staff } = await requireActor();
  const { t } = await getT();

  // Optional line items (typed in, or read from a bill photo). When present the amount is their sum.
  let items: z.infer<typeof itemsSchema> = [];
  const rawItems = str(fd, "items");
  if (rawItems) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawItems);
    } catch {
      return { error: t("errItems") };
    }
    const ok = itemsSchema.safeParse(parsed);
    if (!ok.success) return { error: t("errItems") };
    items = ok.data;
  }

  const amount = items.length ? sumItems(items) : int(fd, "amount");
  if (!amount || amount <= 0) return { error: t("errAmount") };
  const category = str(fd, "category");
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return { error: t("errCategory") };
  const propertyId = optStr(fd, "propertyId");
  if (propertyId && !(await db.property.findFirst({ where: { id: propertyId, ownerId: owner.id } }))) {
    return { error: tr("errPropertyNotFound") };
  }
  const billTotal = int(fd, "billTotal");
  const spentOn = parseDateInput(str(fd, "spentOn")) ?? today();
  const vendor = optStr(fd, "vendor")?.slice(0, 120) ?? null;

  // The bill photo, if one was attached: stored with the expense and fingerprinted.
  let photo: Awaited<ReturnType<typeof normalizeBill>> = null;
  const rawPhoto = str(fd, "photo");
  if (rawPhoto) {
    if (rawPhoto.length > MAX_PHOTO_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(rawPhoto)) return { error: t("scanBadImage") };
    photo = await normalizeBill(Buffer.from(rawPhoto, "base64"));
    if (!photo) return { error: t("scanBadImage") };
  }
  // Strict duplicate check; the person may still save anyway, and the expense is then labelled.
  const dup = await findDuplicate(owner.id, { sha256: photo?.sha256, phash: photo?.phash, amount, vendor, spentOn });
  if (dup && str(fd, "confirmDuplicate") !== "1") {
    return {
      error: t("dupTitle"),
      duplicate: { expenseId: dup.expenseId, date: dup.spentOn.toISOString().slice(0, 10), amount: dup.amount, vendor: dup.vendor, reason: dup.reason },
      at: Date.now(),
    };
  }
  await db.expense.create({
    data: {
      ownerId: owner.id,
      propertyId,
      category,
      amount,
      spentOn,
      note: optStr(fd, "note")?.slice(0, 500) ?? null,
      vendor,
      source: items.length && str(fd, "source") === "SCAN" ? "SCAN" : "MANUAL",
      billTotal: billTotal && billTotal > 0 ? billTotal : null,
      addedByName: staff?.name ?? null,
      addedByStaffId: staff?.id ?? null,
      mayBeDuplicate: !!dup,
      duplicateOfId: dup?.expenseId ?? null,
      receipt: photo ? { create: { mime: photo.mime, data: Uint8Array.from(photo.data), sha256: photo.sha256, phash: photo.phash } } : undefined,
      items: items.length ? { create: items.map((i) => ({ name: i.name, quantity: i.quantity, amount: i.amount })) } : undefined,
    },
  });
  revalidatePath("/", "layout");
  return { ok: t("expenseAdded"), at: Date.now() };
}

export async function deleteExpense(id: string, _: FormState): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const e = await db.expense.findFirst({ where: { id, ownerId: owner.id } });
  if (!e) return { error: tr("errExpenseNotFound") };
  await db.expense.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: tr("deletedOk"), at: Date.now() };
}

/** The owner checked: this one is not a duplicate. Removes the label. */
export async function clearDuplicate(id: string): Promise<void> {
  const owner = await requireOwner();
  await db.expense.updateMany({ where: { id, ownerId: owner.id }, data: { mayBeDuplicate: false, duplicateOfId: null } });
  revalidatePath("/", "layout");
}

/** Delete from the expense's own page, then go back to that month's list. */
export async function deleteExpenseAndBack(id: string, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const e = await db.expense.findFirst({ where: { id, ownerId: owner.id }, select: { spentOn: true } });
  if (e) await db.expense.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect(`/expenses${e ? `?month=${e.spentOn.toISOString().slice(0, 7)}` : ""}`);
}
