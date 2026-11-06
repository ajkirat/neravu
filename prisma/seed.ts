/**
 * Demo data: one owner with two PGs, tenants, payments and expenses.
 * Log in with demo@neravu.app / demo1234
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { clearOwnerData, fillDemo } from "../src/lib/demo-seed";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = "demo@neravu.app";
  const existing = await db.owner.findUnique({ where: { email } });
  const owner =
    existing ??
    (await db.owner.create({
      data: { name: "Lakshmi Rao", email, phone: "9876500000", passwordHash: await bcrypt.hash("demo1234", 10) },
    }));
  await clearOwnerData(db, owner.id);
  await fillDemo(db, owner.id);
  console.log("Seeded demo data. Log in with demo@neravu.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
