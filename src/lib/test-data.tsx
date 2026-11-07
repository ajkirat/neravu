import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { ImageResponse } from "next/og";
import { db } from "./db";
import { duePeriods } from "./billing";
import { addDays, today } from "./dates";
import { bedLabels, fmtPeriod } from "./format";
import { normalizeBill } from "./image-hash";
import { electricityDescription } from "./electricity";

/**
 * Sample data for trying every part of Neravu on a real account, while we are testing. It all lives in
 * one extra PG with this name, so "Remove test data" deletes exactly what was added and nothing else.
 */
export const TEST_PG_NAME = "Test PG (sample data)";
export const TEST_STAFF_NAME = "Test Caretaker";
export const TEST_STAFF_PASSWORD = "test1234";

const monthKey = (d: Date) => d.toISOString().slice(0, 7);

/** A simple shop bill picture, so expense thumbnails and the magnifier have something to show. */
async function billPhoto(shop: string, lines: [string, number][]): Promise<{ data: Buffer; mime: string; sha256: string; phash: string } | null> {
  const total = lines.reduce((s, [, a]) => s + a, 0);
  const img = new ImageResponse(
    (
      <div style={{ width: 600, height: 800, display: "flex", flexDirection: "column", background: "#fbf8ef", padding: 40, fontSize: 26, color: "#222", fontFamily: "monospace" }}>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 32 }}>{shop}</div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 20, marginTop: 6, color: "#666" }}>TEST BILL - SAMPLE DATA</div>
        <div style={{ display: "flex", borderTop: "2px dashed #999", marginTop: 24 }} />
        {lines.map(([n, a]) => (
          <div key={n} style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <div style={{ display: "flex" }}>{n}</div>
            <div style={{ display: "flex" }}>{a.toFixed(2)}</div>
          </div>
        ))}
        <div style={{ display: "flex", borderTop: "2px dashed #999", marginTop: 24 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 30 }}>
          <div style={{ display: "flex" }}>TOTAL</div>
          <div style={{ display: "flex" }}>{total.toFixed(2)}</div>
        </div>
      </div>
    ),
    { width: 600, height: 800 },
  );
  return normalizeBill(Buffer.from(await img.arrayBuffer()));
}

/** A free 10-digit number for the test caretaker (90000xxxxx), never one already in use. */
async function freeStaffPhone(ownerId: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const n = parseInt(createHash("sha256").update(`${ownerId}:${i}`).digest("hex").slice(0, 8), 16) % 100000;
    const phone = `90000${String(n).padStart(5, "0")}`;
    if (!(await db.staff.findUnique({ where: { phone }, select: { id: true } }))) return phone;
  }
  return `9${String(Date.now()).slice(-9)}`;
}

export async function hasTestData(ownerId: string): Promise<boolean> {
  return !!(await db.property.findFirst({ where: { ownerId, name: TEST_PG_NAME }, select: { id: true } }));
}

/** Delete everything "Add test data" created for this owner. Real data is never touched. */
export async function removeTestData(ownerId: string): Promise<void> {
  const props = await db.property.findMany({ where: { ownerId, name: TEST_PG_NAME }, select: { id: true } });
  const propertyIds = props.map((p) => p.id);
  const tenantIds = (await db.tenant.findMany({ where: { ownerId, propertyId: { in: propertyIds } }, select: { id: true } })).map((t) => t.id);
  await db.bankCredit.deleteMany({ where: { ownerId, OR: [{ tenantId: { in: tenantIds } }, { payer: { startsWith: "TEST " } }] } });
  await db.reminderLog.deleteMany({ where: { ownerId, tenantId: { in: tenantIds } } });
  await db.expense.deleteMany({ where: { ownerId, propertyId: { in: propertyIds } } });
  await db.lead.deleteMany({ where: { ownerId, propertyId: { in: propertyIds } } });
  await db.complaint.deleteMany({ where: { ownerId, propertyId: { in: propertyIds } } });
  await db.recurringJob.deleteMany({ where: { ownerId, propertyId: { in: propertyIds } } });
  await db.checklist.deleteMany({ where: { ownerId, propertyId: { in: propertyIds } } });
  await db.asset.deleteMany({ where: { ownerId, propertyId: { in: propertyIds } } });
  // Rooms, beds, electricity bills, tenants with their dues, payments, claims and requests, and joiners go with the PG.
  await db.property.deleteMany({ where: { id: { in: propertyIds } } });
  await db.staff.deleteMany({ where: { ownerId, name: TEST_STAFF_NAME } });
}

/**
 * Add one sample PG with a bit of everything: full, partly filled and empty rooms; tenants who paid,
 * owe, said "I've paid", gave notice or moved out; electricity split; caretaker cash; expenses with
 * bill photos; complaints, enquiries, a joiner, regular jobs and reminder history. One tenant uses the
 * owner's own mobile, so receipts and reminders for that tenant come to the owner's WhatsApp.
 */
export async function addTestData(ownerId: string): Promise<{ staffPhone: string }> {
  await removeTestData(ownerId);
  const owner = await db.owner.findUniqueOrThrow({ where: { id: ownerId }, select: { phone: true, language: true } });
  const now = today();

  const property = await db.property.create({ data: { ownerId, name: TEST_PG_NAME, address: "1st Main, Test Layout", city: "Bengaluru" } });
  const roomDefs: [string, string, number, number][] = [
    ["T1", "1", 2, 8000], // will be full
    ["T2", "1", 3, 6500], // partly filled
    ["T3", "2", 3, 7000], // partly filled
    ["T4", "2", 1, 12000], // empty
  ];
  const rooms: { id: string; number: string; rent: number; beds: string[] }[] = [];
  for (const [number, floor, sharing, rent] of roomDefs) {
    const r = await db.room.create({
      data: { propertyId: property.id, number, floor, sharing, rent, beds: { create: bedLabels(sharing).map((label) => ({ label })) } },
      include: { beds: true },
    });
    rooms.push({ id: r.id, number, rent, beds: r.beds.map((b) => b.id) });
  }

  const staffPhone = await freeStaffPhone(ownerId);
  const staff = await db.staff.create({
    data: { ownerId, name: TEST_STAFF_NAME, phone: staffPhone, passwordHash: await bcrypt.hash(TEST_STAFF_PASSWORD, 10) },
  });

  type Kind = "paid" | "late" | "partial" | "notice" | "asksNotice" | "movedOut";
  const people: { name: string; phone: string; days: number; kind: Kind; room: number; bed: number }[] = [
    { name: "Test Tenant (you)", phone: owner.phone ?? "9876500001", days: 100, kind: "paid", room: 0, bed: 0 },
    { name: "Ravi Test", phone: "9876500002", days: 130, kind: "late", room: 0, bed: 1 },
    { name: "Sunil Test", phone: "9876500003", days: 75, kind: "partial", room: 1, bed: 0 },
    { name: "Deepak Test", phone: "9876500004", days: 160, kind: "notice", room: 2, bed: 0 },
    { name: "Arun Test", phone: "9876500005", days: 45, kind: "asksNotice", room: 2, bed: 1 },
    { name: "Mohan Test", phone: "9876500006", days: 220, kind: "movedOut", room: -1, bed: -1 },
  ];
  const ids: Record<Kind, string> = {} as Record<Kind, string>;
  for (const [i, p] of people.entries()) {
    const room = p.room >= 0 ? rooms[p.room] : rooms[3];
    const moveIn = addDays(now, -p.days);
    const dueDay = Math.min(moveIn.getUTCDate(), 28);
    const deposit = room.rent * 2;
    const movedOutOn = p.kind === "movedOut" ? addDays(now, -20) : null;
    const tenant = await db.tenant.create({
      data: {
        ownerId,
        propertyId: property.id,
        bedId: p.room >= 0 ? room.beds[p.bed] : null,
        name: p.name,
        phone: p.phone,
        language: p.kind === "paid" ? owner.language : null,
        occupation: i % 2 ? "Software engineer" : "Student",
        idType: "Aadhaar",
        idNumber: `XXXX XXXX ${9100 + i}`,
        permanentAddress: "Test Street, Mysuru",
        emergencyName: "Parent",
        emergencyPhone: "9000000000",
        monthlyRent: room.rent,
        deposit,
        rentDueDay: dueDay,
        moveInDate: moveIn,
        status: p.kind === "notice" ? "NOTICE" : p.kind === "movedOut" ? "MOVED_OUT" : "ACTIVE",
        noticeDate: p.kind === "notice" ? addDays(now, -10) : p.kind === "movedOut" ? addDays(now, -50) : null,
        moveOutDate: p.kind === "notice" ? addDays(now, 20) : movedOutOn,
        notes: "Sample data for testing",
      },
    });
    ids[p.kind] = tenant.id;
    await db.charge.create({ data: { tenantId: tenant.id, type: "DEPOSIT", description: "Security deposit", amount: deposit, dueDate: moveIn } });
    const periods = duePeriods({ moveIn, dueDay, asOf: movedOutOn ?? now });
    await db.charge.createMany({
      data: periods.map((pd) => ({ tenantId: tenant.id, type: "RENT", period: pd.period, description: `Rent for ${fmtPeriod(pd.period)}`, amount: room.rent, dueDate: pd.dueDate })),
    });
    await db.payment.create({ data: { tenantId: tenant.id, amount: deposit + room.rent, paidOn: moveIn, method: "UPI", reference: `TESTUPI${1000 + i}` } });
    const later = periods.slice(1);
    const payCount = p.kind === "late" ? Math.max(0, later.length - 2) : p.kind === "partial" ? Math.max(0, later.length - 1) : later.length;
    for (let k = 0; k < payCount; k++) {
      const last = k === payCount - 1;
      await db.payment.create({
        data: {
          tenantId: tenant.id,
          amount: room.rent,
          paidOn: addDays(later[k].dueDate, k % 3),
          method: k % 3 === 2 ? "CASH" : "UPI",
          reference: k % 3 === 2 ? null : `TESTUPI${2000 + i * 10 + k}`,
          // Show both receipt states on the statements.
          receiptStatus: last ? (p.kind === "late" ? "This tenant's number is not on the test number's allowed list (Meta → WhatsApp → API Setup → To)." : "SENT") : null,
          receiptAt: last ? addDays(later[k].dueDate, k % 3) : null,
        },
      });
    }
    if (p.kind === "partial" && later.length) {
      // Half paid in cash to the caretaker, not yet handed over to the owner.
      await db.payment.create({
        data: { tenantId: tenant.id, amount: Math.round(room.rent / 2), paidOn: now, method: "CASH", note: "Part payment", recordedByStaffId: staff.id, recordedByName: staff.name },
      });
    }
    if (p.kind === "movedOut") {
      await db.payment.create({ data: { tenantId: tenant.id, amount: -Math.round(deposit / 2), paidOn: addDays(now, -18), method: "REFUND", reference: "UPI", note: "Deposit refund (move-out settlement)" } });
    }
  }

  // Electricity: last month's bill for room T1, split between its two tenants.
  const lastMonth = monthKey(addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -1));
  const bill = await db.electricityBill.create({
    data: { ownerId, roomId: rooms[0].id, period: lastMonth, prevReading: 1200, currReading: 1340, rate: 9, amount: 1260, appliedAt: addDays(now, -5) },
  });
  for (const tid of [ids.paid, ids.late]) {
    await db.charge.create({
      data: { tenantId: tid, type: "ELECTRICITY", period: lastMonth, description: electricityDescription(lastMonth, "T1", 30, 1260), amount: 630, dueDate: addDays(now, -5), billId: bill.id },
    });
  }

  // "I've paid" from the partly-paid tenant (waiting for the owner's OK), and a bank alert nobody matched yet.
  await db.tenant.update({ where: { id: ids.partial }, data: { payCode: 42, payClaimedAt: now } });
  await db.paymentClaim.create({ data: { ownerId, tenantId: ids.partial, amount: 3250, paise: 42, utr: "TEST41239876" } });
  await db.bankCredit.create({
    data: { ownerId, amountPaise: 700000, utr: "TEST55511122", payer: "TEST UNKNOWN PAYER", bank: "HDFC", status: "UNMATCHED", msgHash: `test-${randomBytes(8).toString("hex")}` },
  });
  // A tenant asked to leave from their My PG link.
  await db.tenantRequest.create({ data: { ownerId, tenantId: ids.asksNotice, kind: "NOTICE", date: addDays(now, 30), note: "Moving to another city" } });

  // Complaints in each state.
  await db.complaint.createMany({
    data: [
      { ownerId, propertyId: property.id, tenantId: ids.partial, title: "Fan not working in T2", details: "Makes noise and stops", source: "TENANT" },
      { ownerId, propertyId: property.id, tenantId: ids.paid, title: "Water leakage in bathroom", status: "IN_PROGRESS" },
      { ownerId, propertyId: property.id, title: "Wi-Fi slow on 2nd floor", status: "RESOLVED" },
    ],
  });
  // Enquiries and someone waiting to join.
  await db.lead.createMany({
    data: [
      { ownerId, propertyId: property.id, name: "Kiran Test", phone: "9811100001", note: "Single room from next month", source: "QR", want: "CALLBACK", followUpOn: now },
      { ownerId, propertyId: property.id, name: "Naveen Test", phone: "9811100002", note: "Wants to see 3-sharing", source: "MANUAL", want: "INFO", status: "VISIT", followUpOn: addDays(now, 2) },
      { ownerId, propertyId: property.id, name: "Ajay Test", phone: "9811100003", note: "Found a cheaper place", status: "LOST" },
    ],
  });
  await db.joinRequest.create({
    data: { ownerId, propertyId: property.id, name: "Manoj Test", phone: "9811100004", idType: "Aadhaar", idNumber: "XXXX XXXX 7788", occupation: "Student", permanentAddress: "Main Road, Tumakuru", emergencyName: "Father", emergencyPhone: "9811100000" },
  });

  // Regular jobs: one due today, one overdue, one coming up.
  await db.recurringJob.createMany({
    data: [
      { ownerId, propertyId: property.id, title: "Water tank cleaning (test)", category: "WATER", everyDays: 90, nextDue: now, vendorName: "Clean Tanks Co", vendorPhone: "9811100010", cost: 1500 },
      { ownerId, propertyId: property.id, title: "RO filter service (test)", category: "WATER", everyDays: 120, nextDue: addDays(now, -3), vendorName: "Aqua Care", vendorPhone: "9811100011", cost: 900 },
      { ownerId, propertyId: property.id, title: "Pest control (test)", category: "PEST", everyDays: 60, nextDue: addDays(now, 3), remindDays: 3, vendorName: "Bug Busters", vendorPhone: "9811100012", cost: 2500 },
      { ownerId, propertyId: property.id, title: "AC service (test)", category: "APPLIANCE", everyDays: 90, nextDue: addDays(now, 25), remindDays: 7, cost: 1800 },
    ],
  });
  // A daily housekeeping list, half done today, and equipment with a warranty and an AMC running out.
  await db.checklist.create({
    data: {
      ownerId,
      propertyId: property.id,
      title: "Daily housekeeping (test)",
      frequency: "DAILY",
      items: ["Bathrooms cleaned", "Common area swept and mopped", "Garbage taken out", "Drinking water filled", "Main gate locked at night"],
      runs: { create: [{ period: now, doneItems: ["Bathrooms cleaned", "Garbage taken out"], byName: TEST_STAFF_NAME }, { period: addDays(now, -1), doneItems: ["Bathrooms cleaned", "Common area swept and mopped", "Garbage taken out", "Drinking water filled", "Main gate locked at night"], byName: TEST_STAFF_NAME }] },
    },
  });
  await db.asset.createMany({
    data: [
      { ownerId, propertyId: property.id, name: "Kent RO (test)", kind: "RO", location: "Ground floor dining", boughtOn: addDays(now, -340), warrantyUntil: addDays(now, 25), vendorName: "Aqua Care", vendorPhone: "9811100011" },
      { ownerId, propertyId: property.id, name: "Fire extinguishers (test)", kind: "EXTINGUISHER", location: "Every floor", amcUntil: addDays(now, -3) },
      { ownerId, propertyId: property.id, name: "Geyser T1 (test)", kind: "GEYSER", location: "Room T1 bathroom", warrantyUntil: addDays(now, 400) },
    ],
  });

  // Expenses: this month and last, across categories; one with item lines and a photo, one from the
  // caretaker on WhatsApp, one marked "may be a duplicate".
  const groceryLines: [string, number][] = [["Rice 25 kg", 1450], ["Toor dal 5 kg", 650], ["Sunflower oil 5 L", 820], ["Sugar 5 kg", 230]];
  const groceryPhoto = await billPhoto("SRI LAKSHMI PROVISIONS", groceryLines);
  const grocery = await db.expense.create({
    data: {
      ownerId,
      propertyId: property.id,
      category: "Groceries",
      amount: 3150,
      spentOn: addDays(now, -2),
      vendor: "Sri Lakshmi Provisions",
      source: "SCAN",
      billTotal: 3150,
      items: { create: groceryLines.map(([name, amount]) => ({ name, amount })) },
      receipt: groceryPhoto ? { create: { mime: groceryPhoto.mime, data: new Uint8Array(groceryPhoto.data), sha256: groceryPhoto.sha256, phash: groceryPhoto.phash } } : undefined,
    },
  });
  const dieselPhoto = await billPhoto("HP PETROL BUNK", [["Diesel 25 L", 2275]]);
  await db.expense.create({
    data: {
      ownerId,
      propertyId: property.id,
      category: "Diesel (generator)",
      amount: 2275,
      spentOn: addDays(now, -1),
      vendor: "HP Petrol Bunk",
      note: "Generator ran 6 hours (power cut)",
      source: "WHATSAPP",
      addedByName: staff.name,
      addedByStaffId: staff.id,
      receipt: dieselPhoto ? { create: { mime: dieselPhoto.mime, data: new Uint8Array(dieselPhoto.data), sha256: dieselPhoto.sha256, phash: dieselPhoto.phash } } : undefined,
    },
  });
  await db.expense.create({
    data: { ownerId, propertyId: property.id, category: "Groceries", amount: 3150, spentOn: addDays(now, -2), vendor: "Sri Lakshmi Provisions", note: "Entered twice by mistake?", mayBeDuplicate: true, duplicateOfId: grocery.id },
  });
  const simple: [string, number, string, number][] = [
    ["Electricity", 6400, "BESCOM bill", 4],
    ["Cooking gas", 1900, "2 commercial cylinders", 6],
    ["Water", 1800, "Water tanker 6000 L", 8],
    ["Daily fresh", 2400, "Vegetables for 3 days, 20 L milk", 3],
    ["Food from outside", 450, "Lunch for plumber and helper", 5],
    ["Staff salary", 15000, "Cook's salary", 10],
    ["Repairs & maintenance", 1200, "Plumber fixed tap in T2", 9],
    ["Cleaning & housekeeping", 650, "Phenyl, brooms, soap", 12],
    ["Internet & TV", 999, "Wi-Fi monthly recharge", 14],
    ["Rent / lease", 45000, "Building rent", 15],
    ["Furniture & bedding", 5400, "2 mattresses", 20],
    ["Other", 300, "Xerox and register book", 7],
  ];
  for (const back of [0, 30]) {
    for (const [category, amount, note, d] of simple) {
      await db.expense.create({ data: { ownerId, propertyId: property.id, category, amount: back ? Math.round(amount * 0.93) : amount, spentOn: addDays(now, -d - back), note } });
    }
  }

  // Reminder history: one went out, one failed.
  await db.reminderLog.createMany({
    data: [
      { ownerId, tenantId: ids.paid, kind: "DUE_SOON", status: "SENT", amount: 8000, sentAt: addDays(now, -2) },
      { ownerId, tenantId: ids.late, kind: "OVERDUE", status: "FAILED", amount: 16000, detail: "#131030 Recipient phone number not in allowed list", sentAt: addDays(now, -1) },
    ],
  });
  return { staffPhone };
}
