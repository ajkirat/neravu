"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { EXPENSE_CATEGORIES } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { MAX_ITEMS, sumItems } from "@/lib/receipt";
import type { FormState } from "@/components/action-form";

const itemsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(120),
      quantity: z.number().positive().max(100000),
      amount: z.number().int().min(-10_000_000).max(10_000_000),
    }),
  )
  .max(MAX_ITEMS);

export async function createExpense(_: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
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
  await db.expense.create({
    data: {
      ownerId: owner.id,
      propertyId,
      category,
      amount,
      spentOn: parseDateInput(str(fd, "spentOn")) ?? today(),
      note: optStr(fd, "note")?.slice(0, 500) ?? null,
      vendor: optStr(fd, "vendor")?.slice(0, 120) ?? null,
      source: items.length && str(fd, "source") === "SCAN" ? "SCAN" : "MANUAL",
      billTotal: billTotal && billTotal > 0 ? billTotal : null,
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
