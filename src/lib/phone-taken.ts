import "server-only";
import { db } from "./db";
import { TESTING_PHASE } from "./testing";

/**
 * Is this mobile (last 10 digits) already someone's sign-in? Owners and caretakers share one login
 * page, so a number normally belongs to only one person. During testing (TESTING_PHASE) only the same
 * role is checked: a number can be one owner and one caretaker, and the login tells them apart by name
 * and password. Pass the owner or caretaker being edited to skip them.
 */
export async function phoneTaken(key: string, skip: { ownerId?: string; staffId?: string } = {}, role: "owner" | "staff" = "owner"): Promise<boolean> {
  const [owner, staff] = await Promise.all([
    db.owner.findUnique({ where: { phoneKey: key }, select: { id: true } }),
    db.staff.findUnique({ where: { phone: key }, select: { id: true } }),
  ]);
  const ownerClash = !!owner && owner.id !== skip.ownerId;
  const staffClash = !!staff && staff.id !== skip.staffId;
  if (TESTING_PHASE) return role === "owner" ? ownerClash : staffClash;
  return ownerClash || staffClash;
}
