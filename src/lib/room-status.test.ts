import { describe, expect, it } from "vitest";
import { roomFill, roomsToOffer } from "./room-status";

const room = (id: string, ...filled: boolean[]) => ({ id, beds: filled.map((f) => ({ filled: f })) });

describe("roomFill", () => {
  it("full, partly, empty", () => {
    expect(roomFill(room("a", true, true).beds)).toBe("FULL");
    expect(roomFill(room("b", true, false).beds)).toBe("PARTLY");
    expect(roomFill(room("c", false, false).beds)).toBe("EMPTY");
  });
});

describe("roomsToOffer", () => {
  const rooms = [room("full", true, true), room("partly", true, false, false), room("empty", false, false)];
  it("offers only partly filled rooms when the toggle is on", () => {
    expect(roomsToOffer(rooms, true)).toEqual({ rooms: [rooms[1]], fellBack: false });
  });
  it("offers every room with a free bed when off", () => {
    expect(roomsToOffer(rooms, false).rooms.map((r) => r.id)).toEqual(["partly", "empty"]);
  });
  it("falls back to all free rooms when none is partly filled", () => {
    expect(roomsToOffer([room("full", true), room("empty", false)], true)).toEqual({ rooms: [room("empty", false)], fellBack: true });
  });
});
