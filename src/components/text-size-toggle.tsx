"use client";

import { useTransition } from "react";
import { setTextSize } from "@/app/actions/prefs";
import { useT } from "@/lib/i18n/client";

export function TextSizeToggle({ large }: { large: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={large}
      onClick={() => start(() => setTextSize(large ? "normal" : "lg"))}
      className={`rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ring-line ${large ? "bg-brand-600 text-white" : "bg-white text-muted hover:text-ink"}`}
    >
      A<span className="text-lg">A</span> {t("largeText")}
    </button>
  );
}
