import { messages, type MsgKey } from "./messages";

export const LANGS = [
  { code: "en", label: "English", short: "EN" },
  { code: "kn", label: "ಕನ್ನಡ", short: "ಕ" },
  { code: "te", label: "తెలుగు", short: "తె" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "neravu_lang";

export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v);
export const asLang = (v: unknown): Lang => (isLang(v) ? v : DEFAULT_LANG);

/** BCP-47 locale used for dates and speech recognition. */
export const localeFor = (lang: Lang) => ({ en: "en-IN", kn: "kn-IN", te: "te-IN" })[lang];

export type TVars = Record<string, string | number>;
export type TFn = (key: MsgKey, vars?: TVars) => string;

export function translate(lang: Lang, key: MsgKey, vars?: TVars): string {
  const entry = messages[key];
  const s = entry[lang] || entry.en;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}

export const makeT = (lang: Lang): TFn => (key, vars) => translate(lang, key, vars);

export type { MsgKey };
