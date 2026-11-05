import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { db } from "./db";

const COOKIE = "neravu_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a long random string");
    }
    return new TextEncoder().encode("neravu-dev-only-secret-do-not-use");
  }
  return new TextEncoder().encode(s);
}

/** Sign in. For a caretaker pass their id too: the session then acts for the owner with limited rights. */
export async function startSession(ownerId: string, staffId?: string) {
  const token = await new SignJWT(staffId ? { st: staffId } : {})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(ownerId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

async function readSession(): Promise<{ ownerId: string; staffId: string | null; iat: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { ownerId: payload.sub, staffId: typeof payload.st === "string" ? payload.st : null, iat: payload.iat ?? 0 };
  } catch {
    return null;
  }
}

const OWNER_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  businessName: true,
  upiId: true,
  language: true,
  emailVerifiedAt: true,
  passwordChangedAt: true,
  paymentMode: true,
  razorpayKeyId: true,
  razorpayEnabled: true,
  autoReminders: true,
  remindBefore: true,
  remindOverdueEvery: true,
} as const;

export type Role = "OWNER" | "STAFF";

/**
 * Who is signed in right now: the owner, or a caretaker acting for the owner. Checked against the
 * database on every request, so switching a caretaker off or resetting a password takes effect at once.
 */
export const currentActor = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const owner = await db.owner.findUnique({ where: { id: session.ownerId }, select: OWNER_FIELDS });
  if (!owner) return null;
  if (!session.staffId) {
    // A password reset signs out every session issued before it.
    if (owner.passwordChangedAt && Math.floor(owner.passwordChangedAt.getTime() / 1000) > session.iat) return null;
    return { owner, role: "OWNER" as Role, staff: null };
  }
  const staff = await db.staff.findFirst({
    where: { id: session.staffId, ownerId: owner.id, active: true },
    select: { id: true, name: true, passwordChangedAt: true },
  });
  if (!staff) return null;
  if (staff.passwordChangedAt && Math.floor(staff.passwordChangedAt.getTime() / 1000) > session.iat) return null;
  return { owner, role: "STAFF" as Role, staff: { id: staff.id, name: staff.name } };
});

/**
 * The signed-in OWNER, or null. A caretaker session returns null here on purpose: everything that was
 * written for the owner stays owner-only unless it is deliberately opened up with requireActor().
 */
export const currentOwner = cache(async () => {
  const a = await currentActor();
  return a && a.role === "OWNER" ? a.owner : null;
});

/** The signed-in owner. Signed out goes to /login; a caretaker is sent back to the dashboard. */
export async function requireOwner() {
  const a = await currentActor();
  if (!a) redirect("/login");
  if (a.role !== "OWNER") redirect("/dashboard?denied=1");
  return a.owner;
}

/** For the few pages and actions caretakers may use: returns the owner's data plus who is acting. */
export async function requireActor() {
  const a = await currentActor();
  if (!a) redirect("/login");
  return a;
}
