import Link from "next/link";
import type { ReactNode } from "react";
import { fmtDate, rupees } from "@/lib/format";
import type { Lang, TFn } from "@/lib/i18n";
import { roomFill } from "@/lib/room-status";
import type { BoardRoom } from "@/lib/rooms";

const tone = {
  FULL: { card: "border-brand-200", chip: "bg-brand-600 text-white" },
  PARTLY: { card: "border-marigold-400", chip: "bg-marigold-400 text-brand-900" },
  EMPTY: { card: "border-line border-dashed", chip: "bg-brand-50 text-brand-700" },
} as const;

/**
 * One room, one card. Every bed is a box: a filled box shows who sleeps there, an empty box says
 * "Empty" and adds a tenant when tapped. The coloured label says at a glance how full the room is.
 */
export function RoomCard({ room, t, lang, dues, footer }: { room: BoardRoom; t: TFn; lang: Lang; dues?: Map<string, number>; footer?: ReactNode }) {
  const fill = roomFill(room.beds);
  const free = room.beds.filter((b) => !b.filled).length;
  const chip = fill === "FULL" ? t("roomFull") : fill === "PARTLY" ? t("bedsFreeN", { n: free }) : t("roomAllFree", { n: free });
  return (
    <section className={`card border-2 p-3 sm:p-4 ${tone[fill].card}`} data-room={room.number} data-fill={fill}>
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-brand-900">{t("roomN", { n: room.number })}</h3>
          <p className="text-xs text-muted">
            {room.floor ? `${t("floorN", { n: room.floor })} · ` : ""}
            {room.sharing === 1 ? t("single") : t("sharingN", { n: room.sharing })} · {rupees(room.rent)}
            {t("perBed")}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${tone[fill].chip}`}>{chip}</span>
      </header>
      <div className="grid grid-cols-2 gap-2">
        {room.beds.map((bed) => {
          if (!bed.tenant) {
            return (
              <Link
                key={bed.id}
                href={`/tenants/new?bed=${bed.id}`}
                className="flex min-h-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-marigold-400 bg-white p-2 text-center hover:bg-marigold-100"
                data-bed="empty"
              >
                <span className="text-xs font-semibold text-muted">{t("bedN", { l: bed.label })}</span>
                <span className="text-base font-bold text-marigold-700">{t("bedEmpty")}</span>
                <span className="text-xs font-medium text-brand-600">{t("plusAddTenant")}</span>
              </Link>
            );
          }
          const due = dues?.get(bed.tenant.id) ?? 0;
          const leaving = bed.tenant.status === "NOTICE";
          return (
            <Link
              key={bed.id}
              href={`/tenants/${bed.tenant.id}`}
              className={`flex min-h-20 flex-col items-center justify-center rounded-xl p-2 text-center text-white hover:opacity-90 ${leaving ? "bg-brand-500" : "bg-brand-600"}`}
              data-bed="filled"
            >
              <span className="text-xs font-semibold text-brand-100">
                {t("bedN", { l: bed.label })} · 🧑
              </span>
              <span className="w-full truncate text-base font-bold">{bed.tenant.name.split(" ")[0]}</span>
              {leaving && bed.tenant.moveOutDate && <span className="text-xs text-marigold-100">{t("leavesOn", { date: fmtDate(bed.tenant.moveOutDate, lang) })}</span>}
              {due > 0 && <span className="mt-0.5 rounded-full bg-white/90 px-2 text-xs font-semibold text-red-700">{t("dueAmt", { amt: rupees(due) })}</span>}
            </Link>
          );
        })}
      </div>
      {footer && <div className="mt-2 flex justify-end">{footer}</div>}
    </section>
  );
}
