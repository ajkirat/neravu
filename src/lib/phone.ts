/** Mobile numbers are compared on their last 10 digits, so +91 98765 43210 and 09876543210 are the same person. */
export function normPhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}
