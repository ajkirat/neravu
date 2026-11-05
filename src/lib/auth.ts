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

export async function startSession(ownerId: string) {
  const token = await new SignJWT({})
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

async function sessionOwnerId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** The signed-in owner, or null. Cached per request. */
export const currentOwner = cache(async () => {
  const id = await sessionOwnerId();
  if (!id) return null;
  return db.owner.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, businessName: true, upiId: true, language: true },
  });
});

/** The signed-in owner; redirects to /login when signed out. */
export async function requireOwner() {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  return owner;
}
