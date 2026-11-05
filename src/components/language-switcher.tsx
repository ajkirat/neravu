"use client";

import { useTransition } from "react";
import { setLanguage } from "@/app/actions/prefs";
import { LANGS } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

/** Three big buttons so anyone can find their language, shown in its own script. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className={`inline-flex rounded-xl bg-white p-1 ring-1 ring-line ${className}`} role="group" aria-label="Language">
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
