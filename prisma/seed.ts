/**
 * Demo data: one owner with two PGs, tenants, payments and expenses.
 * Log in with demo@neravu.app / demo1234
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { duePeriods } from "../src/lib/billing";
import { addDays, today } from "../src/lib/dates";
import { bedLabels, fmtPeriod } from "../src/lib/format";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

async function main() {
  const email = "demo@neravu.app";
  await db.owner.deleteMany({ where: { email } });
  const owner = await db.owner.create({
    data: {
      name: "Lakshmi Rao",
      email,
      phone: "9876500000",
      passwordHash: await bcrypt.hash("demo1234", 10),
    },
  });

  const props = [
    {
      name: "Banyan Nest Men's PG",
      address: "14th Cross, HSR Layout",
      city: "Bengaluru",
      rooms: [
        ["101", "1", 2, 9000],
        ["102", "1", 3, 7500],
        ["201", "2", 1, 13000],
        ["202", "2", 2, 9000],
      ],
    },
    {
      name: "Marigold Women's Hostel",
      address: "Near Metro, Kothrud",
      city: "Pune",
      rooms: [
        ["A1", "G", 2, 8500],
        ["A2", "G", 2, 8500],
        ["B1", "1", 3, 7000],
      ],
    },
  ] as const;

  const beds: { id: string; propertyId: string; rent: number }[] = [];
  for (const p of props) {
    const property = await db.property.create({
      data: { ownerId: owner.id, name: p.name, address: p.address, city: p.city },
    });
    for (const [number, floor, sharing, rent] of p.rooms) {
      const room = await db.room.create({
        data: {
          propertyId: property.id,
          number,
          floor,
          sharing,
          rent,
          beds: { create: bedLabels(sharing).map((label) => ({ label })) },
        },
        include: { beds: true },
      });
      for (const b of room.beds) beds.push({ id: b.id, propertyId: property.id, rent });
    }
  }

  const now = today();
  const people: [string, string, number, "paid" | "partial" | "late" | "notice"][] = [
    ["Arjun Mehta", "9845011122", 150, "paid"],
    ["Rohit Kulkarni", "9845011123", 95, "partial"],
    ["Imran Sheikh", "9845011124", 70, "late"],
    ["Karthik Iyer", "9845011125", 200, "paid"],
    ["Vikram Singh", "9845011126", 40, "paid"],
    ["Nikhil Joshi", "9845011127", 120, "notice"],
    ["Ananya Deshpande", "9822011128", 180, "paid"],
    ["Sneha Patil", "9822011129", 60, "late"],
    ["Priya Nair", "9822011130", 130, "paid"],
    ["Fatima Khan", "9822011131", 25, "partial"],
  ];
  // Fill beds in a mixed order so each property has some vacancies.
  const order = [0, 1, 2, 4, 5, 7, 8, 9, 10, 12];
  for (let i = 0; i < people.length; i++) {
    const [name, phone, daysAgo, pattern] = people[i];
    const bed = beds[order[i]];
    const moveIn = addDays(now, -daysAgo);
    const dueDay = Math.min(moveIn.getUTCDate(), 28);
    const deposit = bed.rent * 2;
    const tenant = await db.tenant.create({
      data: {
        ownerId: owner.id,
        propertyId: bed.propertyId,
        bedId: bed.id,
        name,
        phone,
        occupation: i % 2 ? "Software engineer" : "Student",
        idType: "Aadhaar",
        idNumber: `XXXX XXXX ${String(4000 + i * 37)}`,
        emergencyName: "Parent",
        emergencyPhone: "9000000000",
        monthlyRent: bed.rent,
        deposit,
        rentDueDay: dueDay,
        moveInDate: moveIn,
        status: pattern === "notice" ? "NOTICE" : "ACTIVE",
        noticeDate: pattern === "notice" ? addDays(now, -5) : null,
        moveOutDate: pattern === "notice" ? addDays(now, 25) : null,
      },
    });
    await db.charge.create({
      data: { tenantId: tenant.id, type: "DEPOSIT", description: "Security deposit", amount: deposit, dueDate: moveIn },
    });
    const periods = duePeriods({ moveIn, dueDay, asOf: now });
    await db.charge.createMany({
      data: periods.map((p) => ({
        tenantId: tenant.id,
        type: "RENT",
        period: p.period,
        description: `Rent for ${fmtPeriod(p.period)}`,
        amount: bed.rent,
        dueDate: p.dueDate,
      })),
    });
    // Deposit + first month at move-in.
    await db.payment.create({
      data: { tenantId: tenant.id, amount: deposit + bed.rent, paidOn: moveIn, method: "UPI", reference: `UPI${100200 + i}` },
    });
    const later = periods.slice(1);
    const payCount =
      pattern === "late" ? Math.max(0, later.length - 2) : pattern === "partial" ? later.length - 1 : later.length;
    for (let k = 0; k < payCount; k++) {
      await db.payment.create({
        data: {
          tenantId: tenant.id,
          amount: bed.rent,
          paidOn: addDays(later[k].dueDate, k % 3),
          method: k % 4 === 3 ? "CASH" : "UPI",
          reference: k % 4 === 3 ? null : `UPI${300400 + i * 10 + k}`,
        },
      });
    }
    if (pattern === "partial" && later.length) {
      await db.payment.create({
        data: { tenantId: tenant.id, amount: Math.round(bed.rent / 2), paidOn: later.at(-1)!.dueDate, method: "UPI" },
      });
    }
  }

  const propertyIds = [...new Set(beds.map((b) => b.propertyId))];
  const expenseTemplates: [string, number, string][] = [
    ["Groceries", 18000, "Monthly groceries"],
    ["Staff salary", 24000, "Cook and housekeeping"],
    ["Electricity", 9500, "BESCOM / MSEDCL bill"],
    ["Internet", 1800, "Broadband"],
    ["Water", 2500, "Tanker water"],
  ];
  for (let m = 0; m < 4; m++) {
    for (const [pi, pid] of propertyIds.entries()) {
      for (const [ti, [category, amount, note]] of expenseTemplates.entries()) {
        await db.expense.create({
          data: {
            ownerId: owner.id,
            propertyId: pid,
            category,
            amount: Math.round(amount * (pi ? 0.7 : 1) * (0.9 + ((m + ti) % 3) * 0.08)),
            spentOn: addDays(now, -m * 30 - ti * 3 - 1),
            note,
          },
        });
      }
    }
  }
  console.log("Seeded demo data. Log in with demo@neravu.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
