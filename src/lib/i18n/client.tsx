"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, type Lang, type TFn } from "./index";

const Ctx = createContext<{ lang: Lang; t: TFn }>({ lang: "en", t: makeT("en") });

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
