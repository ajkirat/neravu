import { describe, expect, it } from "vitest";
import { parseReceipt, sanitizeDate, sumItems, totalsMismatch } from "./receipt";

const now = new Date("2026-11-05T10:00:00Z");

describe("parseReceipt", () => {
  it("normalises a good result", () => {
    const r = parseReceipt(
      {
        is_receipt: true,
        vendor: "  Sri Ganesh   Stores ",
        date: "2026-11-03",
        category: "Groceries",
        total: 1180.4,
        items: [
          { name: "Rice 25kg", quantity: 1, amount: 1100.2 },
          { name: "ಹಾಲು", quantity: 2, amount: 80 },
        ],
      },
      now,
    );
    expect(r.isReceipt).toBe(true);
    expect(r.vendor).toBe("Sri Ganesh Stores");
    expect(r.date).toBe("2026-11-03");
    expect(r.items).toEqual([
      { name: "Rice 25kg", quantity: 1, amount: 1100 },
      { name: "ಹಾಲು", quantity: 2, amount: 80 },
    ]);
    expect(r.total).toBe(1180);
    expect(sumItems(r.items)).toBe(1180);
  });
  it("drops unusable lines and unknown categories", () => {
    const r = parseReceipt(
      { category: "Crypto", items: [{ name: "", amount: 5 }, { name: "x", amount: "12" }, { name: "ok", amount: 7 }, { name: "bad", amount: NaN }] },
      now,
    );
    expect(r.category).toBe("Other");
    expect(r.items).toEqual([{ name: "ok", quantity: 1, amount: 7 }]);
  });
  it("rejects absurd amounts and caps the number of lines", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ name: `item ${i}`, amount: 1 }));
    expect(parseReceipt({ items: many }, now).items).toHaveLength(60);
    expect(parseReceipt({ items: [{ name: "gold", amount: 1e12 }] }, now).items).toHaveLength(0);
  });
  it("says it is not a receipt when nothing was read or the model said so", () => {
    expect(parseReceipt({ is_receipt: false, items: [{ name: "a", amount: 1 }] }, now).isReceipt).toBe(false);
    expect(parseReceipt({ items: [] }, now).isReceipt).toBe(false);
    expect(parseReceipt("garbage", now).isReceipt).toBe(false);
    expect(parseReceipt(null, now).isReceipt).toBe(false);
  });
  it("ignores instructions hidden in names beyond the length limit", () => {
    const r = parseReceipt({ items: [{ name: "a".repeat(500), amount: 1 }] }, now);
    expect(r.items[0].name).toHaveLength(120);
  });
});

describe("sanitizeDate", () => {
  it("accepts recent real dates only", () => {
    expect(sanitizeDate("2026-11-05", now)).toBe("2026-11-05");
    expect(sanitizeDate("2026-02-30", now)).toBeNull();
    expect(sanitizeDate("2027-01-01", now)).toBeNull();
    expect(sanitizeDate("2019-01-01", now)).toBeNull();
    expect(sanitizeDate("05/11/2026", now)).toBeNull();
    expect(sanitizeDate(null, now)).toBeNull();
  });
});

describe("totalsMismatch", () => {
  it("flags when the printed total differs from the items", () => {
    expect(totalsMismatch([{ amount: 100 }, { amount: 50 }], 150)).toBe(false);
    expect(totalsMismatch([{ amount: 100 }, { amount: 50 }], 151)).toBe(false);
    expect(totalsMismatch([{ amount: 100 }, { amount: 50 }], 180)).toBe(true);
    expect(totalsMismatch([], 180)).toBe(false);
    expect(totalsMismatch([{ amount: 10 }], null)).toBe(false);
  });
});
