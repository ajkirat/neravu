/** How full a room is. Pure, used by the room cards and the bed picker. */
export type RoomFill = "FULL" | "PARTLY" | "EMPTY";

export function roomFill(beds: { filled: boolean }[]): RoomFill {
  const n = beds.filter((b) => b.filled).length;
  if (beds.length > 0 && n === beds.length) return "FULL";
  return n > 0 ? "PARTLY" : "EMPTY";
}

/**
 * Rooms to offer when placing a new tenant. With "fill partly filled rooms first" on, only rooms where
 * someone already stays (and a bed is free) are shown, so fewer rooms are in use (light, fan, cleaning).
 * If no such room exists, every room with a free bed is shown.
 */
export function roomsToOffer<R extends { beds: { filled: boolean }[] }>(rooms: R[], partlyFirst: boolean): { rooms: R[]; fellBack: boolean } {
  const withFree = rooms.filter((r) => r.beds.some((b) => !b.filled));
  if (!partlyFirst) return { rooms: withFree, fellBack: false };
  const partly = withFree.filter((r) => roomFill(r.beds) === "PARTLY");
  return partly.length ? { rooms: partly, fellBack: false } : { rooms: withFree, fellBack: withFree.length > 0 };
}
