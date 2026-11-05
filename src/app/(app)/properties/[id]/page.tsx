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
import { Badge, FoldCard, Card, EmptyState, Field, PageHeader, Stat } from "@/components/ui";
import {
  createRoom,
  deleteProperty,
  deleteRoom,
  updateProperty,
  updateRoom,
} from "@/app/actions/properties";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const { t } = await getT();
  const property = await db.property.findFirst({
    where: { id, ownerId: owner.id },
    include: {
      rooms: {
        include: {
          beds: {
            orderBy: { label: "asc" },
            include: {
              tenants: {
                where: { status: { in: ["ACTIVE", "NOTICE"] } },
                select: { id: true, name: true, status: true },
              },
            },
          },
        },
      },
    },
  });
  if (!property) notFound();
  await syncRentCharges(owner.id);
  const balances = await tenantBalances(owner.id, {
    propertyId: id,
    status: { in: ["ACTIVE", "NOTICE"] },
  });

  const rooms = [...property.rooms].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  const beds = rooms.flatMap((r) => r.beds);
  const occupied = beds.filter((b) => b.tenants.length).length;
  const potential = rooms.reduce((s, r) => s + r.rent * r.beds.length, 0);
  const dues = [...balances.values()].reduce((s, b) => s + b.outstanding, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/properties", label: t("properties") }}
        title={property.name}
        subtitle={[property.address, property.city].filter(Boolean).join(", ") || undefined}
        actions={
          <>
            <Link href={`/properties/${property.id}/qr`} className="btn-secondary">
              {t("enquiryQr")}
            </Link>
            <Link href={`/tenants/new?property=${property.id}`} className="btn-primary">
              {t("addTenant")}
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("bedsLabel")} value={beds.length} hint={t("roomsN", { n: rooms.length })} />
        <Stat label={t("occupied")} value={occupied} hint={t("vacantN", { n: beds.length - occupied })} tone="good" />
        <Stat label={t("fullHouseRent")} value={rupees(potential)} hint={t("perMonth")} />
        <Stat label={t("pendingDues")} value={rupees(dues)} tone={dues ? "warn" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {rooms.length === 0 && (
            <EmptyState
              title={t("noRooms")}
              body={t("noRoomsBody")}
            />
          )}
          {rooms.map((room) => (
            <div key={room.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-brand-900">{t("roomN", { n: room.number })}</h3>
                  <p className="text-xs text-muted">
                    {room.floor ? `${t("floorN", { n: room.floor })} · ` : ""}
                    {room.sharing === 1 ? t("single") : t("sharingN", { n: room.sharing })} · {rupees(room.rent)}
                    {t("perBed")}
                  </p>
                </div>
                <details className="group relative">
                  <summary className="btn-secondary btn-sm cursor-pointer list-none">{t("edit")}</summary>
                  <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-white p-4 shadow-lg">
                    <ActionForm action={updateRoom.bind(null, room.id)} submitLabel={t("saveRoom")}>
                      <RoomFields room={room} t={t} />
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
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {room.beds.map((bed) => {
                  const tn = bed.tenants[0];
                  if (!tn) {
                    return (
                      <Link
                        key={bed.id}
                        href={`/tenants/new?bed=${bed.id}`}
                        className="flex items-center justify-between rounded-lg border border-dashed border-brand-200 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
                      >
                        <span>
                          <span className="font-semibold">{t("bedN", { l: bed.label })}</span> · {t("vacant")}
                        </span>
                        <span className="text-xs font-medium">{t("plusAddTenant")}</span>
                      </Link>
                    );
                  }
                  const bal = balances.get(tn.id);
                  return (
                    <Link
                      key={bed.id}
                      href={`/tenants/${tn.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm hover:bg-brand-50"
                    >
                      <span className="truncate">
                        <span className="font-semibold">{t("bedN", { l: bed.label })}</span> · {tn.name}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {tn.status === "NOTICE" && <Badge tone="amber">{t("noticeBadge")}</Badge>}
                        {bal && bal.outstanding > 0 && (
                          <Badge tone="red">{t("dueAmt", { amt: rupees(bal.outstanding) })}</Badge>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <FoldCard title={t("bulkOpen")} open={rooms.length === 0}>
            <BulkRoomsForm propertyId={property.id} existing={rooms.map((r) => r.number)} />
          </FoldCard>
          <FoldCard title={t("addRoom")}>
            <ActionForm action={createRoom.bind(null, property.id)} submitLabel={t("addRoomBtn")} resetOnSuccess>
              <RoomFields t={t} />
            </ActionForm>
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
