import { describe, expect, it } from "vitest";
import { LANGS, translate } from "./index";
import { messages } from "./messages";

describe("i18n", () => {
  it("has every key in every language, non-empty", () => {
    for (const [key, entry] of Object.entries(messages)) {
      for (const l of LANGS) expect(entry[l.code], `${key} (${l.code})`).toBeTruthy();
    }
  });
  it("keeps the same {placeholders} in every language", () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const [key, entry] of Object.entries(messages)) {
      for (const l of LANGS) expect(vars(entry[l.code]), `${key} (${l.code})`).toBe(vars(entry.en));
    }
  });
  it("interpolates variables and falls back to English", () => {
    expect(translate("en", "greeting", { name: "Asha" })).toContain("Asha");
    expect(translate("kn", "greeting", { name: "Asha" })).toContain("Asha");
  });
});
