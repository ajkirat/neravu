"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { roomFill, roomsToOffer } from "@/lib/room-status";

export type PickRoom = {
  id: string;
  number: string;
  sharing: number;
  rent: number;
  propertyId: string;
  propertyName: string;
  beds: { id: string; label: string; filled: boolean; who: string | null }[];
};

/**
 * Choose a bed by tapping it on the room cards. "Fill rooms that already have someone" (on by default)
 * shows only rooms where somebody already stays, so fewer rooms are in use. Sets `bedId` (and the rent).
 */
export function BedBoard({ rooms, defaultBed, withRent = true }: { rooms: PickRoom[]; defaultBed?: string; withRent?: boolean }) {
  const t = useT();
  const initialRoom = rooms.find((r) => r.beds.some((b) => b.id === defaultBed));
  const [partlyFirst, setPartlyFirst] = useState(!initialRoom || roomFill(initialRoom.beds) === "PARTLY");
  const [bedId, setBedId] = useState(initialRoom ? defaultBed! : "");
  const [rent, setRent] = useState(initialRoom ? String(initialRoom.rent) : "");
  const properties = [...new Map(rooms.map((r) => [r.propertyId, r.propertyName])).entries()];
  const [prop, setProp] = useState(initialRoom?.propertyId ?? properties[0]?.[0] ?? "");

  const { rooms: offered, fellBack } = useMemo(() => roomsToOffer(rooms.filter((r) => r.propertyId === prop), partlyFirst), [rooms, prop, partlyFirst]);
  const chosen = rooms.flatMap((r) => r.beds.map((b) => ({ r, b }))).find((x) => x.b.id === bedId);
  const chip = (on: boolean) => `rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap ${on ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`;

  return (
    <div className="space-y-3">
      {properties.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {properties.map(([id, name]) => (
            <button key={id} type="button" className={chip(prop === id)} onClick={() => setProp(id)}>
              {name}
            </button>
          ))}
        </div>
      )}
      <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={partlyFirst} onChange={(e) => setPartlyFirst(e.target.checked)} />
        <span>
          <span className="block font-semibold text-brand-900">{t("partlyFirstLabel")}</span>
          <span className="block text-sm text-muted">{t("partlyFirstHint")}</span>
        </span>
      </label>
      {fellBack && <p className="text-sm text-marigold-700">{t("partlyNone")}</p>}
      <p className="text-sm font-semibold text-brand-900">{chosen ? t("bedChosen", { r: chosen.r.number, b: chosen.b.label }) : t("pickBed")}</p>
      {offered.length === 0 ? (
        <p className="text-sm text-muted">{t("noVacantBeds")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {offered.map((room) => {
            const fill = roomFill(room.beds);
            return (
              <div key={room.id} className={`card border-2 p-3 ${fill === "PARTLY" ? "border-marigold-400" : "border-dashed border-line"}`} data-room={room.number}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-base font-bold text-brand-900">{t("roomN", { n: room.number })}</p>
                  <p className="text-xs text-muted">
                    {room.sharing === 1 ? t("single") : t("sharingN", { n: room.sharing })} · ₹{room.rent.toLocaleString("en-IN")}
                    {t("perBed")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {room.beds.map((b) =>
                    b.filled ? (
                      <div key={b.id} className="flex min-h-16 flex-col items-center justify-center rounded-xl bg-brand-600 p-2 text-center text-white" aria-disabled="true">
                        <span className="text-xs text-brand-100">{t("bedN", { l: b.label })} · 🧑</span>
                        <span className="w-full truncate text-sm font-bold">{b.who}</span>
                      </div>
                    ) : (
                      <button
                        key={b.id}
                        type="button"
                        data-bed-id={b.id}
                        onClick={() => {
                          setBedId(b.id);
                          setRent(String(room.rent));
                        }}
                        className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 p-2 text-center ${
                          bedId === b.id ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500" : "border-dashed border-marigold-400 bg-white hover:bg-marigold-100"
                        }`}
                        aria-pressed={bedId === b.id}
                      >
                        <span className="text-xs font-semibold text-muted">{t("bedN", { l: b.label })}</span>
                        <span className="text-base font-bold text-marigold-700">{bedId === b.id ? "✓" : t("bedEmpty")}</span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* The form reads these. "required" on a hidden field does not stop submit, so the server also checks. */}
      <input type="hidden" name="bedId" value={bedId} />
      {withRent && (
        <label className="block sm:max-w-xs">
          <span className="label">{t("monthlyRentRs")}</span>
          <input className="input" name="monthlyRent" inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} required />
        </label>
      )}
    </div>
  );
}
