"use client";

import { useTransition } from "react";
import { setLanguage } from "@/app/actions/prefs";
import { LANGS } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

/**
 * Big buttons so anyone can find their language, each shown in its own script. `grid` puts them in two
 * rows, for narrow places like the sidebar.
 */
export function LanguageSwitcher({ className = "", grid = false }: { className?: string; grid?: boolean }) {
  const { lang } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className={`${grid ? "grid grid-cols-2 gap-1" : "inline-flex"} rounded-xl bg-white p-1 ring-1 ring-line ${className}`} role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          disabled={pending}
          aria-pressed={lang === l.code}
          onClick={() => start(() => setLanguage(l.code))}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
            lang === l.code ? "bg-brand-600 text-white" : "text-muted hover:text-ink"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
