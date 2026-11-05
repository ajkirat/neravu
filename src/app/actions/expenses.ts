"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import type { FormState } from "@/components/action-form";

export async function createExpense(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) return { error: "Enter the amount spent." };
  const category = str(fd, "category");
  if (!category) return { error: "Pick a category." };
  const propertyId = optStr(fd, "propertyId");
  if (propertyId && !(await db.property.findFirst({ where: { id: propertyId, ownerId: owner.id } }))) {
    return { error: "Property not found." };
  }
  await db.expense.create({
    data: {
      ownerId: owner.id,
      propertyId,
      category,
      amount,
      spentOn: parseDateInput(str(fd, "spentOn")) ?? today(),
      note: optStr(fd, "note"),
    },
  });
  revalidatePath("/", "layout");
  return { ok: "Expense added.", at: Date.now() };
}

export async function deleteExpense(id: string, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const e = await db.expense.findFirst({ where: { id, ownerId: owner.id } });
  if (!e) return { error: "Expense not found." };
  await db.expense.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: "Deleted.", at: Date.now() };
}
