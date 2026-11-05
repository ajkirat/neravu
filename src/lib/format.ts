const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function rupees(n: number): string {
  return inr.format(n);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function fmtDate(d: Date | null | undefined): string {
  return d ? dateFmt.format(d) : "—";
}

const monthFmt = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function fmtPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return monthFmt.format(new Date(Date.UTC(y, m - 1, 1)));
}

export const PAYMENT_METHODS = ["UPI", "CASH", "BANK", "CARD", "OTHER"] as const;
export const CHARGE_TYPES = ["ELECTRICITY", "MAINTENANCE", "OTHER"] as const;
export const EXPENSE_CATEGORIES = [
  "Electricity",
  "Water",
  "Groceries",
  "Staff salary",
  "Maintenance",
  "Internet",
  "Rent / lease",
  "Cleaning",
  "Other",
] as const;
export const ID_TYPES = ["Aadhaar", "PAN", "Passport", "Driving licence", "Voter ID", "Other"];

export const chargeLabel: Record<string, string> = {
  RENT: "Rent",
  DEPOSIT: "Security deposit",
  ELECTRICITY: "Electricity",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

export const methodLabel: Record<string, string> = {
  UPI: "UPI",
  CASH: "Cash",
  BANK: "Bank transfer",
  CARD: "Card",
  OTHER: "Other",
  REFUND: "Refund",
};

/** Digits-only Indian mobile number for wa.me links (adds 91 for 10-digit numbers). */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function bedLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

/** WhatsApp click-to-chat link with a polite, pre-filled rent reminder. */
export function reminderLink(opts: {
  phone: string;
  tenantName: string;
  amount: number;
  propertyName: string;
  since?: Date | null;
}): string {
  const first = opts.tenantName.split(" ")[0];
  const since = opts.since ? ` (pending since ${fmtDate(opts.since)})` : "";
  const text =
    `Hi ${first}, this is a gentle reminder from ${opts.propertyName}. ` +
    `Your pending amount is ${rupees(opts.amount)}${since}. ` +
    `Please pay at the earliest and share the payment reference. Thank you!`;
  return `https://wa.me/${whatsappNumber(opts.phone)}?text=${encodeURIComponent(text)}`;
}
