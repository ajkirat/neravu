"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { optStr, str } from "@/lib/forms";
import { isValidUpiId } from "@/lib/upi";
import type { FormState } from "@/components/action-form";

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const name = str(fd, "name");
  if (!name) return { error: "Enter your name." };
  const upiId = optStr(fd, "upiId");
  if (upiId && !isValidUpiId(upiId)) return { error: "UPI ID should look like name@bank." };
  await db.owner.update({
    where: { id: owner.id },
    data: { name, phone: optStr(fd, "phone"), businessName: optStr(fd, "businessName"), upiId },
  });
  revalidatePath("/", "layout");
  return { ok: "Settings saved.", at: Date.now() };
}
