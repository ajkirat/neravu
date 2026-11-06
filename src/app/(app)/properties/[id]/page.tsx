import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";
import { ActionForm } from "@/components/action-form";
import { BulkRoomsForm } from "@/components/bulk-rooms-form";
import { FoldCard, Field, PageHeader } from "@/components/ui";
import { RoomCard } from "@/components/room-card";
import { roomBoard } from "@/lib/rooms";
import { roomFill } from "@/lib/room-status";
import {
  createRoom,
  deleteProperty,
  deleteRoom,
  updateProperty,
  updateRoom,
} from "@/app/actions/properties";

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { id } = await params;
  const show = (await searchParams).show;
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const property = await db.property.findFirst({ where: { id, ownerId: owner.id } });
  if (!property) notFound();
  await syncRentCharges(owner.id);
  const [rooms, balances] = await Promise.all([
    roomBoard(owner.id, id),
    tenantBalances(owner.id, { propertyId: id, status: { in: ["ACTIVE", "NOTICE"] } }),
  ]);
  const dues = new Map([...balances].map(([k, v]) => [k, v.outstanding]));
  const beds = rooms.flatMap((r) => r.beds);
  const filled = beds.filter((b) => b.filled).length;
  // Each room is in exactly one group, so every filter shows a different set of rooms.
  const byFill = { PARTLY: rooms.filter((r) => roomFill(r.beds) === "PARTLY"), EMPTY: rooms.filter((r) => roomFill(r.beds) === "EMPTY"), FULL: rooms.filter((r) => roomFill(r.beds) === "FULL") };
  const filter = show === "partly" ? "PARTLY" : show === "empty" ? "EMPTY" : show === "full" ? "FULL" : null;
  const shown = filter ? byFill[filter] : rooms;
  const potential = rooms.reduce((sum, r) => sum + r.rent * r.beds.length, 0);
  const owed = [...balances.values()].reduce((sum, b) => sum + b.outstanding, 0);
  const pct = beds.length ? Math.round((filled / beds.length) * 100) : 0;
  const chip = (on: boolean) => `rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap ${on ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`;
  const rawRooms = await db.room.findMany({ where: { propertyId: id }, select: { id: true, number: true, floor: true, sharing: true, rent: true } });
  const roomById = new Map(rawRooms.map((r) => [r.id, r]));

  return (
    <>
      <PageHeader
        back={{ href: "/properties", label: t("properties") }}
        title={property.name}
        subtitle={[property.address, property.city].filter(Boolean).join(", ") || undefined}
        actions={
          <>
            <Link href={`/tenants/new?property=${property.id}`} className="btn-primary">
              {t("addTenant")}
            </Link>
            <Link href={`/properties/${property.id}/vacancies`} className="btn-accent">
              {t("shareVacancies")}
            </Link>
            <Link href={`/properties/${property.id}/qr`} className="btn-secondary">
              {t("enquiryQr")}
            </Link>
            <Link href={`/properties/${property.id}/qr?for=join`} className="btn-secondary">
              {t("joinQrBtn")}
            </Link>
          </>
        }
      />

      {/* One glance: how many beds are filled, how many are empty. */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-2xl font-bold text-brand-900">{t("bedsFilledOf", { filled, total: beds.length })}</p>
          <p className="text-lg font-semibold text-marigold-700">{t("bedsEmptyN", { n: beds.length - filled })}</p>
        </div>
        <div className="mt-2 h-3 rounded-full bg-marigold-100">
          <div className="h-3 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded bg-brand-600" /> {t("legendFilled")}
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded border-2 border-dashed border-marigold-400" /> {t("legendEmpty")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <span>{t("roomsN", { n: rooms.length })}</span>
          <span>
            {t("fullHouseRent")}: <b>{rupees(potential)}</b>
          </span>
          <span className={owed ? "text-red-700" : ""}>
            {t("pendingDues")}: <b>{rupees(owed)}</b>
          </span>
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Link href={`/properties/${id}`} scroll={false} className={chip(!filter)}>
            {t("showAllRooms", { n: rooms.length })}
          </Link>
          <Link href={`/properties/${id}?show=partly`} scroll={false} className={chip(filter === "PARTLY")}>
            {t("showPartlyRooms", { n: byFill.PARTLY.length })}
          </Link>
          <Link href={`/properties/${id}?show=empty`} scroll={false} className={chip(filter === "EMPTY")}>
            {t("showEmptyRooms", { n: byFill.EMPTY.length })}
          </Link>
          <Link href={`/properties/${id}?show=full`} scroll={false} className={chip(filter === "FULL")}>
            {t("showFullRooms", { n: byFill.FULL.length })}
          </Link>
        </div>
      )}

      {rooms.length === 0 && <p className="mb-3 rounded-xl bg-brand-50 px-4 py-3 text-base text-brand-700">{t("noRoomsYet")}</p>}
      {rooms.length > 0 && shown.length === 0 && <p className="mb-3 rounded-xl bg-canvas px-4 py-3 text-base text-muted">{t("noRoomsInFilter")}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((room) => {
          const raw = roomById.get(room.id)!;
          return (
            <RoomCard
              key={room.id}
              room={room}
              t={t}
              lang={lang}
              dues={dues}
              footer={
                <details className="group relative">
                  <summary className="cursor-pointer list-none text-sm font-medium text-brand-600 underline">{t("edit")}</summary>
                  <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-white p-4 shadow-lg">
                    <ActionForm action={updateRoom.bind(null, room.id)} submitLabel={t("saveRoom")}>
                      <RoomFields room={raw} t={t} />
                    </ActionForm>
                    <div className="mt-3 border-t border-line pt-3">
                      <ActionForm
                        action={deleteRoom.bind(null, room.id)}
                        submitLabel={t("deleteRoom")}
                        submitClassName="btn-danger btn-sm"
                        confirm={t("deleteRoomConfirm", { n: room.number })}
                      />
                    </div>
                  </div>
                </details>
              }
            />
          );
        })}
        {/* Adding a room happens right next to the rooms: one tile, three fields. */}
        <details className="card group border-2 border-dashed border-brand-200 p-3 sm:p-4" open={rooms.length === 0}>
          <summary className="flex min-h-24 cursor-pointer list-none items-center justify-center text-lg font-bold text-brand-600">{t("addARoom")}</summary>
          <div className="mt-2">
            <ActionForm action={createRoom.bind(null, property.id)} submitLabel={t("addRoomBtn")} resetOnSuccess>
              <RoomFields t={t} />
            </ActionForm>
          </div>
        </details>
      </div>

      <div className="mt-6 space-y-3">
        <FoldCard title={t("addManyRooms")}>
          <BulkRoomsForm propertyId={property.id} existing={rooms.map((r) => r.number)} />
        </FoldCard>
        <FoldCard title={t("propDetails")}>
          <ActionForm action={updateProperty.bind(null, property.id)} submitLabel={t("save")}>
            <Field label={t("name")}>
              <input className="input" name="name" defaultValue={property.name} required />
            </Field>
            <Field label={t("address")}>
              <input className="input" name="address" defaultValue={property.address ?? ""} />
            </Field>
            <Field label={t("city")}>
              <input className="input" name="city" defaultValue={property.city ?? ""} />
            </Field>
          </ActionForm>
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm
              action={deleteProperty.bind(null, property.id)}
              submitLabel={t("deleteProperty")}
              submitClassName="btn-danger btn-sm"
              confirm={t("deletePropertyConfirm")}
            />
          </div>
        </FoldCard>
      </div>
    </>
  );
}

function RoomFields({
  room,
  t,
}: {
  room?: { number: string; floor: string | null; sharing: number; rent: number };
  t: TFn;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("roomNo")}>
          <input className="input" name="number" defaultValue={room?.number} placeholder="101" required />
        </Field>
        <Field label={t("floor")}>
          <input className="input" name="floor" defaultValue={room?.floor ?? ""} placeholder="1" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("bedsLabel")}>
          <select className="input" name="sharing" defaultValue={room?.sharing ?? 2}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? t("singleOpt") : t("nSharing", { n })}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("rentPerBed")}>
          <input
            className="input"
            name="rent"
            inputMode="numeric"
            defaultValue={room?.rent}
            placeholder="8000"
            required
          />
        </Field>
      </div>
    </>
  );
}
