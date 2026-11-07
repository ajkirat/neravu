import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  // Small pool: on Vercel every serverless instance opens its own connections.
  const adapter = new PrismaPg({ connectionString, max: 3 });
  // Photos and videos stay out of every query unless it asks for them (select), so lists and exports
  // never pull megabytes of images they do not show.
  return new PrismaClient({
    adapter,
    omit: { tenant: { idPhoto: true }, joinRequest: { idPhoto: true }, complaint: { photo: true, video: true } },
  });
}

/**
 * The database client, created the first time something actually uses it. A build that never
 * touches the database (for example a preview build) therefore does not need DATABASE_URL, while a
 * real request without it still fails with a clear message.
 */
export const db = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
