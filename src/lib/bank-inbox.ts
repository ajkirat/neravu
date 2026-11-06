import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { matchCredit, readCreditAlert, readGmailForwarding } from "./bank-alert";
import { checkEmail, isGenuineBankEmail, isGoogleEmail } from "./bank-email";
import { closePendingClaims } from "./claims";
import { today } from "./dates";
import { sendPaymentReceipt } from "./payment-receipt";

export type InboxResult =
  | "no-owner" | "off" | "forwarding-saved" | "not-genuine" | "not-a-credit" | "other-account" | "duplicate" | "matched" | "unmatched";

const extraDomains = () => (process.env.BANK_EMAIL_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);

/** The owner whose inbox this address is: the address contains their secret inbox code. */
export async function ownerForAddress(to: string) {
  const code = /([a-z0-9]{20,40})@/i.exec(to.trim().toLowerCase())?.[1];
  if (!code) return null;
  return db.owner.findUnique({ where: { bankInbox: code }, select: { id: true, payConfirm: true, bankLast4: true } });
}

/** One forwarded email. Records a payment only for a genuine, matched bank credit to the owner's account. */
export async function handleBankEmail(raw: string, to: string): Promise<{ result: InboxResult; paymentId?: number }> {
  const owner = await ownerForAddress(to);
  if (!owner) return { result: "no-owner" };
  return handleBankEmailFor(owner, raw);
}

/**
 * Same checks for an email the owner uploaded themselves (a .eml downloaded from Gmail). The bank's
 * signature survives the download, so this is exactly as strict as automatic forwarding.
 */
export async function handleBankEmailFor(
  owner: { id: string; payConfirm: string; bankLast4: string | null },
  raw: string,
): Promise<{ result: InboxResult; paymentId?: number }> {
  const mail = await checkEmail(raw);

  const forwarding = readGmailForwarding(mail.subject, mail.text);
  if (forwarding && isGoogleEmail(mail)) {
    await db.owner.update({ where: { id: owner.id }, data: { bankForwardNote: forwarding.slice(0, 500) } });
    return { result: "forwarding-saved" };
  }
  if (owner.payConfirm !== "BANK") return { result: "off" };
  if (!isGenuineBankEmail(mail, extraDomains())) return { result: "not-genuine" };
  const alert = readCreditAlert(`${mail.subject} ${mail.text}`);
  if (!alert) return { result: "not-a-credit" };
  // Alerts for an account other than the one the owner gave are not rent.
  if (owner.bankLast4 && alert.last4 && alert.last4 !== owner.bankLast4) return { result: "other-account" };

  let credit;
  try {
    credit = await db.bankCredit.create({
      data: { ownerId: owner.id, amountPaise: alert.amountPaise, utr: alert.utr, payer: alert.payer, bank: mail.signedBy, status: "UNMATCHED", msgHash: mail.hash },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { result: "duplicate" };
    throw e;
  }

  // Auto-record only when the account is confirmed (last 4 digits match) and exactly one tenant has this paise tag.
  const accountOk = !!owner.bankLast4 && alert.last4 === owner.bankLast4;
  const tenants = await db.tenant.findMany({ where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } }, select: { id: true, payCode: true } });
  const tenant = accountOk ? matchCredit(alert.amountPaise, tenants) : null;
  if (!tenant) return { result: "unmatched" };
  const paymentId = await recordBankCredit(credit.id, tenant.id, "bank email");
  return paymentId ? { result: "matched", paymentId } : { result: "duplicate" };
}

/** Turn a bank credit into a payment for a tenant (automatically, or when the owner picks the tenant). */
export async function recordBankCredit(creditId: string, tenantId: string, by: string): Promise<number | null> {
  const c = await db.bankCredit.findUnique({ where: { id: creditId } });
  if (!c || c.status !== "UNMATCHED") return null;
  const rupees = Math.floor(c.amountPaise / 100);
  let paymentId: number;
  try {
    const p = await db.payment.create({
      data: {
        tenantId,
        amount: rupees,
        paidOn: today(c.createdAt),
        method: "UPI",
        reference: c.utr,
        note: `Confirmed by ${c.bank ?? "bank"} alert`,
        // One payment per bank transaction, even if the alert arrives twice.
        externalId: `bank:${c.utr ?? c.msgHash}`,
      },
    });
    paymentId = p.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      await db.bankCredit.update({ where: { id: c.id }, data: { status: "IGNORED" } });
      return null;
    }
    throw e;
  }
  await db.bankCredit.update({ where: { id: c.id }, data: { status: "MATCHED", tenantId, paymentId } });
  await closePendingClaims(tenantId, paymentId, by);
  await sendPaymentReceipt(paymentId);
  return paymentId;
}
