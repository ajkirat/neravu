import "server-only";

/** Accounts allowed to wipe and refill themselves with demo data. Never a real owner's account. */
export function isDemoOwner(email: string): boolean {
  const list = (process.env.DEMO_OWNER_EMAILS ?? "demo@neravu.app").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
