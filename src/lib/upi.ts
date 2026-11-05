/** UPI helpers. Money moves directly to the owner's UPI ID; Neravu never touches it. */

export function isValidUpiId(v: string): boolean {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(v);
}

/** `upi://pay` deep link understood by GPay, PhonePe, Paytm, BHIM and others. */
export function upiLink(opts: { upiId: string; name: string; amount: number; note: string }): string {
  const q = [
    ["pa", opts.upiId],
    ["pn", opts.name],
    ["am", String(opts.amount)],
    ["cu", "INR"],
    ["tn", opts.note],
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `upi://pay?${q}`;
}
