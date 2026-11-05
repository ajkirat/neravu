import { describe, expect, it } from "vitest";
import { PRESETS, defaultPattern, expandToken, generatePattern, guessFloor, letters, parseRoomList, toDrafts, validateDrafts, type PatternOpts } from "./room-gen";

const pat = (o: Partial<PatternOpts>): PatternOpts => ({ ...defaultPattern, ...o });
const nums = (o: Partial<PatternOpts>) => generatePattern(pat(o)).map((r) => r.number);

describe("generatePattern", () => {
  it("floor + 2 digits: 101..., 201...", () => {
    expect(nums({ perFloor: [3, 2] })).toEqual(["101", "102", "103", "201", "202"]);
  });
  it("ground floor labelled G, then 11, 12", () => {
    expect(nums({ ...PRESETS.ground, perFloor: [2, 2] })).toEqual(["G1", "G2", "11", "12"]);
  });
  it("ground floor as 0 with padding: 001, 101", () => {
    expect(nums({ firstFloor: 0, groundLabel: "0", perFloor: [2, 1] })).toEqual(["001", "002", "101"]);
  });
  it("continuous numbering across floors with no floor part: 1, 2, 3...", () => {
    expect(nums({ ...PRESETS.simple, perFloor: [2, 3] })).toEqual(["1", "2", "3", "4", "5"]);
  });
  it("prefix and separator: A-1-01", () => {
    expect(nums({ prefix: "A-", separator: "-", perFloor: [2] })).toEqual(["A-1-01", "A-1-02"]);
  });
  it("floor letters: A1, A2, B1", () => {
    expect(nums({ ...PRESETS.floorLetter, perFloor: [2, 1] })).toEqual(["A1", "A2", "B1"]);
  });
  it("room letters: 1A, 1B", () => {
    expect(nums({ roomLetters: true, digits: 1, perFloor: [3] })).toEqual(["1A", "1B", "1C"]);
  });
  it("different room counts per floor, custom start and suffix", () => {
    expect(nums({ perFloor: [1, 2], start: 5, suffix: "x" })).toEqual(["105x", "205x", "206x"]);
  });
  it("never returns more than 300", () => {
    expect(generatePattern(pat({ perFloor: [300, 300] }))).toHaveLength(300);
  });
  it("records the floor", () => {
    expect(generatePattern(pat({ firstFloor: 0, perFloor: [1, 1] })).map((r) => r.floor)).toEqual(["G", "1"]);
  });
});

describe("expandToken / parseRoomList", () => {
  it("expands numeric and prefixed ranges and keeps zero padding", () => {
    expect(expandToken("101-104")).toEqual(["101", "102", "103", "104"]);
    expect(expandToken("A1-A3")).toEqual(["A1", "A2", "A3"]);
    expect(expandToken("001-003")).toEqual(["001", "002", "003"]);
    expect(expandToken("5..7")).toEqual(["5", "6", "7"]);
    expect(expandToken("10 to 12")).toEqual(["10", "11", "12"]);
  });
  it("leaves plain names and hyphenated names alone", () => {
    expect(expandToken("Rose")).toEqual(["Rose"]);
    expect(expandToken("A-101")).toEqual(["A-101"]);
    expect(expandToken("Block B 12")).toEqual(["Block B 12"]);
  });
  it("rejects backwards or huge ranges", () => {
    expect(expandToken("110-101")).toBeNull();
    expect(expandToken("1-5000")).toBeNull();
  });
  it("reads a one-line list with ranges", () => {
    expect(parseRoomList("101-103, 201, G1; Rose").rows.map((r) => r.number)).toEqual(["101", "102", "103", "201", "G1", "Rose"]);
  });
  it("reads several lines, one room per line, with optional columns", () => {
    const r = parseRoomList("101\t3\t7000\n102, 2, 9000\n103");
    expect(r.rows).toEqual([
      { number: "101", sharing: 3, rent: 7000, floor: undefined },
      { number: "102", sharing: 2, rent: 9000, floor: undefined },
      { number: "103", sharing: undefined, rent: undefined, floor: undefined },
    ]);
  });
  it("accepts a range on a line of a multi-line paste", () => {
    expect(parseRoomList("101-102\n201-202").rows.map((r) => r.number)).toEqual(["101", "102", "201", "202"]);
  });
  it("reports tokens it cannot understand", () => {
    expect(parseRoomList("101, 9-1").problems).toEqual(["9-1"]);
  });
});

describe("floors and drafts", () => {
  it("guesses floors from common numbering", () => {
    expect(guessFloor("101")).toBe("1");
    expect(guessFloor("A-204")).toBe("2");
    expect(guessFloor("G3")).toBe("G");
    expect(guessFloor("12")).toBeNull();
    expect(guessFloor("Rose")).toBeNull();
  });
  it("applies defaults but lets rows override them", () => {
    const d = toDrafts(parseRoomList("101\n102, 4, 5000").rows, { sharing: 2, rent: 8000 });
    expect(d).toEqual([
      { number: "101", floor: "1", sharing: 2, rent: 8000 },
      { number: "102", floor: "1", sharing: 4, rent: 5000 },
    ]);
  });
});

describe("validateDrafts", () => {
  const base = { floor: null, sharing: 2, rent: 8000 };
  it("flags duplicates, existing rooms, bad beds and bad rent", () => {
    const { rows, ok } = validateDrafts(
      [
        { ...base, number: "101" },
        { ...base, number: "101" },
        { ...base, number: "Existing" },
        { ...base, number: "103", sharing: 0 },
        { ...base, number: "104", rent: -1 },
        { ...base, number: "   " },
        { ...base, number: "x".repeat(40) },
      ],
      ["existing"],
    );
    expect(ok).toBe(false);
    expect(rows[0].issues).toEqual(["duplicate"]);
    expect(rows[2].issues).toEqual(["exists"]);
    expect(rows[3].issues).toEqual(["beds"]);
    expect(rows[4].issues).toEqual(["rent"]);
    expect(validateDrafts([{ ...base, number: "9", rent: 0 }], []).rows[0].issues).toEqual(["rent"]);
    expect(rows[5].issues).toContain("empty");
    expect(rows[6].issues).toContain("tooLong");
  });
  it("is ok for a clean list, and not ok when empty", () => {
    expect(validateDrafts([{ ...base, number: "1" }, { ...base, number: "2" }], []).ok).toBe(true);
    expect(validateDrafts([], []).ok).toBe(false);
  });
  it("treats upper and lower case as the same room", () => {
    expect(validateDrafts([{ ...base, number: "a1" }], ["A1"]).rows[0].issues).toEqual(["exists"]);
  });
});

describe("letters", () => {
  it("counts A..Z then AA", () => {
    expect([0, 1, 25, 26, 27].map(letters)).toEqual(["A", "B", "Z", "AA", "AB"]);
  });
});
