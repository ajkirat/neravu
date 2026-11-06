"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

/** A small photo that opens full-screen with one tap, right where it is. Tap anywhere (or Esc) to close. */
export function PhotoThumb({ src, alt, className = "h-12 w-12" }: { src: string; alt: string; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`shrink-0 overflow-hidden rounded-lg border border-line bg-canvas ${className}`} aria-label={t("tapToEnlarge")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-3" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <button type="button" className="btn-secondary mt-3" onClick={() => setOpen(false)}>
            {t("close")}
          </button>
        </div>
      )}
    </>
  );
}
