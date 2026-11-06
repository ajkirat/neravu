/**
 * Demo data: one owner with two PGs, tenants, payments and expenses.
 * Log in with mobile 9876500000, name Lakshmi, password demo1234
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
  const phoneKey = "9876500000";
  const owner = existing
    ? await db.owner.update({ where: { id: existing.id }, data: { phone: existing.phone ?? phoneKey, phoneKey: existing.phoneKey ?? phoneKey } })
    : await db.owner.create({
        data: { name: "Lakshmi Rao", email, phone: phoneKey, phoneKey, passwordHash: await bcrypt.hash("demo1234", 10) },
      });
  await clearOwnerData(db, owner.id);
  await fillDemo(db, owner.id);
  console.log("Seeded demo data. Log in with mobile 9876500000, name Lakshmi, password demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
