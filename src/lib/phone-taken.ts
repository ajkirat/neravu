import "server-only";
import { db } from "./db";

/**
 * Is this mobile (last 10 digits) already someone's sign-in? Owners and caretakers share one login
 * page, so a number may belong to only one person. Pass the owner or caretaker being edited to skip them.
 */
export async function phoneTaken(key: string, skip: { ownerId?: string; staffId?: string } = {}): Promise<boolean> {
  const [owner, staff] = await Promise.all([
    db.owner.findUnique({ where: { phoneKey: key }, select: { id: true } }),
    db.staff.findUnique({ where: { phone: key }, select: { id: true } }),
  ]);
  return (!!owner && owner.id !== skip.ownerId) || (!!staff && staff.id !== skip.staffId);
}
