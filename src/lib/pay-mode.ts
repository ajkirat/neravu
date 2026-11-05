export type PayMode = "NONE" | "UPI" | "RAZORPAY";
export const PAY_MODES: PayMode[] = ["NONE", "UPI", "RAZORPAY"];

/** Can tenants be given an online pay link, given how this owner chose to be paid? */
export function payLinksOn(o: { paymentMode: string; upiId: string | null; razorpayEnabled: boolean }): boolean {
  return (o.paymentMode === "UPI" && !!o.upiId) || (o.paymentMode === "RAZORPAY" && o.razorpayEnabled);
}
