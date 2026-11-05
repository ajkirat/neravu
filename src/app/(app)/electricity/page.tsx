import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { monthRange, periodKey, today } from "@/lib/dates";
import { stayDays } from "@/lib/electricity";
import { getT } from "@/lib/i18n/server";
import { ElectricityApplyAll } from "@/components/electricity-apply-all";
import { ElectricityRow } from "@/components/electricity-row";
import { MonthPicker } from "@/components/month-picker";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Electricity" };

export default async function ElectricityPage({ searchParams }: { searchParams: Promise<{ month?: string; property?: string }> }) {
  const sp = await searchParams;
  const owner = await requireOwner();
  const { t } = await getT();
  const month = sp.month && monthRange(sp.month) ? sp.month : periodKey(today());
  const properties = await db.property.findMany({ where: { ownerId: owner.id }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const property = properties.find((p) => p.id === sp.property) ?? properties[0];

  const rooms = property
    ? (await db.room.findMany({ where: { propertyId: property.id }, select: { id: true, number: true } })).sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true }),
      )
    : [];
  const roomIds = rooms.map((r) => r.id);
  const [bills, history, tenants] = roomIds.length
    ? await Promise.all([
        db.electricityBill.findMany({ where: { ownerId: owner.id, period: month, roomId: { in: roomIds } } }),
        db.electricityBill.findMany({ where: { ownerId: owner.id, period: { lt: month }, roomId: { in: roomIds } }, orderBy: { period: "desc" } }),
        db.tenant.findMany({
          where: { ownerId: owner.id, bed: { roomId: { in: roomIds } } },
          select: { id: true, name: true, moveInDate: true, moveOutDate: true, bed: { select: { roomId: true } } },
        }),
      ])
    : [[], [], []];

  const billOf = new Map(bills.map((b) => [b.roomId, b]));
  const lastOf = new Map<string, (typeof history)[number]>();
  for (const h of history) if (!lastOf.has(h.roomId)) lastOf.set(h.roomId, h);
  const peopleOf = (roomId: string) =>
    tenants
      .filter((x) => x.bed?.roomId === roomId)
      .map((x) => ({ id: x.id, name: x.name, days: stayDays({ id: x.id, moveIn: x.moveInDate, moveOut: x.moveOutDate }, month) }))
      .filter((p) => p.days > 0);

  const saved = bills.length;
  const applied = bills.filter((b) => b.appliedAt).length;

  return (
    <>
      <PageHeader title={t("elecTitle")} subtitle={t("elecSub")} actions={<MonthPicker base={`/electricity${property ? `?property=${property.id}` : ""}`} month={month} />} />
      {properties.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {properties.map((p) => (
            <Link key={p.id} href={`/electricity?month=${month}&property=${p.id}`} className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-line ${p.id === property?.id ? "bg-brand-600 text-white" : "bg-white text-muted"}`}>
              {p.name}
            </Link>
          ))}
        </div>
      )}
      {!property || rooms.length === 0 ? (
        <EmptyState title={t("elecEmpty")} />
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <p className="text-sm text-muted">{t("elecSummary", { saved, rooms: rooms.length, applied })}</p>
            <ElectricityApplyAll propertyId={property.id} period={month} pending={saved - applied} />
            <p className="text-xs text-muted">{t("elecNote")}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {rooms.map((r) => {
              const b = billOf.get(r.id);
              const last = lastOf.get(r.id);
              return (
                <ElectricityRow
                  key={`${r.id}-${month}`}
                  room={r}
                  period={month}
                  bill={b ? { id: b.id, prev: b.prevReading, curr: b.currReading, rate: b.rate, amount: b.amount, applied: !!b.appliedAt } : null}
                  suggest={{ prev: last?.currReading ?? null, rate: last?.rate ?? null }}
                  people={peopleOf(r.id)}
                />
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
