"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

const ZOOM = 2.5;
const MAX = 5;

/**
 * Full-screen photo viewer that works like a magnifying glass, in the same tab, on phone and desktop:
 * click or tap a spot to zoom in there; move the mouse (or drag a finger) to look around; the mouse
 * wheel zooms in and out; click again to zoom out. Close button or Esc to go back.
 */
function Viewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const t = useT();
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Where the pointer is on the photo, as a percentage: that spot stays under the pointer while zoomed.
  const at = (clientX: number, clientY: number) => {
    const r = imgRef.current?.getBoundingClientRect();
    if (!r) return origin;
    return { x: Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)), y: Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)) };
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-white">
        <span>{scale > 1 ? t("zoomOutHint") : t("zoomInHint")}</span>
        <span className="flex gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => setScale((s) => (s > 1 ? 1 : ZOOM))}>
            {scale > 1 ? "−" : "+"}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            {t("close")}
          </button>
        </span>
      </div>
      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-2"
        style={{ touchAction: scale > 1 ? "none" : "auto" }}
        onClick={(e) => {
          if (e.target === e.currentTarget && scale === 1) onClose();
        }}
        onWheel={(e) => {
          setOrigin(at(e.clientX, e.clientY));
          setScale((s) => Math.min(MAX, Math.max(1, s * (e.deltaY < 0 ? 1.2 : 1 / 1.2))));
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          className={`max-h-full max-w-full select-none object-contain transition-transform duration-150 ${scale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          style={{ transform: `scale(${scale})`, transformOrigin: `${origin.x}% ${origin.y}%` }}
          onPointerDown={() => (dragged.current = false)}
          onPointerMove={(e) => {
            // Zoomed in: the spot under the mouse or finger is what you see magnified.
            if (scale > 1 && (e.pointerType === "mouse" || e.buttons)) {
              dragged.current = true;
              setOrigin(at(e.clientX, e.clientY));
            }
          }}
          onClick={(e) => {
            if (scale > 1) {
              if (!dragged.current || e.detail > 1) setScale(1);
              dragged.current = false;
              return;
            }
            setOrigin(at(e.clientX, e.clientY));
            setScale(ZOOM);
          }}
        />
      </div>
    </div>
  );
}

/** A small photo (list rows) that opens the magnifier with one tap. */
export function PhotoThumb({ src, alt, className = "h-12 w-12" }: { src: string; alt: string; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-line bg-canvas ${className}`} aria-label={t("tapToEnlarge")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </button>
      {open && <Viewer src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

/** A large photo (expense page) shown in full, which also opens the magnifier in the same tab. */
export function PhotoLarge({ src, alt }: { src: string; alt: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in" aria-label={t("tapToEnlarge")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="mx-auto max-h-[80vh] w-full rounded-lg border border-line object-contain" />
      </button>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-sm text-brand-600 underline">
        🔍 {t("magnify")}
      </button>
      {open && <Viewer src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
