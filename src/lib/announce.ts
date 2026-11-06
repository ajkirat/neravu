import type { Lang, MsgKey } from "./i18n";
import { makeT } from "./i18n";

export const ANNOUNCEMENTS = ["WATER", "POWER", "PEST", "TANK", "NOTICE", "OWN"] as const;
export type Announcement = (typeof ANNOUNCEMENTS)[number];

/** The announcement text in one language. `when` is free text ("Sunday 10 am - 1 pm"), `note` any extra line. */
export function announcementText(kind: Announcement, lang: Lang, o: { pg: string; when: string; note: string }): string {
  const t = makeT(lang);
  const base = t(`ann_${kind}` as MsgKey, { pg: o.pg, when: o.when.trim() || t("annSoon"), note: o.note.trim() });
  return base.replace(/\s+$/g, "").replace(/ {2,}/g, " ");
}
