export const LEAD_STATUSES = ["NEW", "CONTACTED", "VISIT", "VISITED", "WON", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leadStatusLabel: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  VISIT: "Visit scheduled",
  VISITED: "Visited",
  WON: "Won",
  LOST: "Lost",
};

export const isOpenLead = (status: string) => status !== "WON" && status !== "LOST";

/** An open lead whose follow-up date is today or earlier. */
export function followUpDue(lead: { status: string; followUpOn: Date | null }, asOf: Date): boolean {
  return isOpenLead(lead.status) && !!lead.followUpOn && lead.followUpOn <= asOf;
}

export type EnquiryInput = { name: string; phone: string; note: string };

/** Validate and normalise a public enquiry. Returns an error message or the clean values. */
export function cleanEnquiry(input: EnquiryInput): { error: string } | { value: EnquiryInput } {
  const name = input.name.trim().slice(0, 80);
  const phone = input.phone.trim();
  const note = input.note.trim().slice(0, 500);
  if (!name) return { error: "Please enter your name." };
  const digits = phone.replace(/\D/g, "");
  if (!/^[0-9+\-\s()]{7,20}$/.test(phone) || digits.length < 7 || digits.length > 15) {
    return { error: "Please enter a valid phone number." };
  }
  return { value: { name, phone, note } };
}
