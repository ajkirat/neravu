// Demo data for pilots and the seed script: two PGs, tenants with a mix of paid / late / on notice,
// expenses, a caretaker, leads, a complaint and someone waiting to join. Only ever touches one owner.
import type { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";
import { duePeriods } from "./billing";
import { addDays, today } from "./dates";
import { bedLabels, fmtPeriod } from "./format";

export const DEMO_STAFF_PHONE = "9000012345";
export const DEMO_STAFF_PASSWORD = "ramesh123";

/** Remove everything this owner has entered, keeping the account itself (so the person stays logged in). */
export async function clearOwnerData(db: PrismaClient, ownerId: string) {
  const where = { ownerId };
  await db.pendingExpense.deleteMany({ where });
  await db.paymentClaim.deleteMany({ where });
  await db.bankCredit.deleteMany({ where });
  await db.tenantRequest.deleteMany({ where });
  await db.joinRequest.deleteMany({ where });
  await db.lead.deleteMany({ where });
  await db.complaint.deleteMany({ where });
  await db.reminderLog.deleteMany({ where });
  await db.electricityBill.deleteMany({ where });
  await db.expense.deleteMany({ where });
  await db.tenant.deleteMany({ where });
  await db.property.deleteMany({ where });
  await db.staff.deleteMany({ where });
}

/** Fill an (empty) owner account with realistic demo data. */
export async function fillDemo(db: PrismaClient, ownerId: string) {
  const owner = { id: ownerId };
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
    ["Water tanker", 2500, "Tanker water"],
    ["Diesel (generator)", 2200, "Generator diesel, 25 L"],
    ["Cooking gas", 1900, "2 commercial cylinders"],
    ["Vegetables & fruits", 6500, "Weekly vegetables"],
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

  // A caretaker, with some cash he collected and has not handed over yet.
  await db.staff.deleteMany({ where: { phone: DEMO_STAFF_PHONE } });
  const staff = await db.staff.create({
    data: { ownerId, name: "Ramesh", phone: DEMO_STAFF_PHONE, passwordHash: await bcrypt.hash(DEMO_STAFF_PASSWORD, 10) },
  });
  const someone = await db.tenant.findFirst({ where: { ownerId, status: "ACTIVE" }, orderBy: { name: "asc" } });
  if (someone) {
    await db.payment.create({
      data: { tenantId: someone.id, amount: 1500, paidOn: now, method: "CASH", note: "Part payment", recordedByStaffId: staff.id, recordedByName: staff.name },
    });
  }
  // A UPI ID so My PG links show the Pay button, and one tenant who says they paid (Option A).
  await db.owner.update({ where: { id: ownerId }, data: { upiId: "lakshmi.demo@okhdfc", paymentMode: "UPI", payConfirm: "OWNER" } });
  const late = await db.tenant.findFirst({ where: { ownerId, name: "Sneha Patil" } });
  if (late) {
    await db.tenant.update({ where: { id: late.id }, data: { payCode: 7, payClaimedAt: now } });
    await db.paymentClaim.create({ data: { ownerId, tenantId: late.id, amount: 8500, paise: 7, utr: "412398765432" } });
  }
  // Enquiries from the QR code, a complaint and a new joiner waiting for approval.
  const firstProperty = propertyIds[0];
  await db.lead.createMany({
    data: [
      { ownerId, propertyId: firstProperty, name: "Suresh Gowda", phone: "9811122233", note: "Single room from next month", source: "QR", want: "CALLBACK" },
      { ownerId, propertyId: firstProperty, name: "Kiran Rao", phone: "9811122234", note: "2-sharing, near office", source: "QR", want: "INFO", status: "CONTACTED" },
    ],
  });
  if (someone) {
    await db.complaint.create({ data: { ownerId, tenantId: someone.id, propertyId: someone.propertyId, title: "Geyser not heating", details: "Bathroom on 2nd floor" } });
  }
  await db.joinRequest.create({
    data: {
      ownerId,
      propertyId: firstProperty,
      name: "Manoj Kumar",
      phone: "9811122235",
      idType: "Aadhaar",
      idNumber: "XXXX XXXX 7788",
      occupation: "Student",
      permanentAddress: "Main Road, Tumakuru",
      emergencyName: "Father",
      emergencyPhone: "9811100000",
    },
  });
}
