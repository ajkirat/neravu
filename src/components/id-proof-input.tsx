"use client";

import { useEffect, useRef, useState } from "react";
import { shrinkImage } from "@/lib/image";
import { useI18n } from "@/lib/i18n/client";

type ReadResult = { status: "ok" | "unreadable" | "off"; type: string | null; number: string | null; sig: string } | { error: string };

/**
 * ID proof as a photo. The type and number are read from the photo and shown for a check; they cannot
 * be typed. Hidden fields carry the photo and the signed reading to the form's save step.
 */
export function IdProofInput({
  read,
  current,
}: {
  /** Server action that reads the photo (public Join page or owner). */
  read: (fd: FormData) => Promise<ReadResult>;
  /** The ID already saved, if any. */
  current?: { photoUrl: string | null; type: string | null; number: string | null };
}) {
  const { t } = useI18n();
  const photoField = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ReadResult | null>(null);

  // The form is cleared after it is sent: clear this box too.
  useEffect(() => {
    const form = photoField.current?.form;
    if (!form) return;
    const clear = () => {
      setPreview(null);
      setRes(null);
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    let out = file;
    try {
      const img = await shrinkImage(file, 1600, 0.85);
      out = new File([Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0))], "id.jpg", { type: "image/jpeg" });
    } catch {
      /* keep the original */
    }
    const dt = new DataTransfer();
    dt.items.add(out);
    if (photoField.current) photoField.current.files = dt.files;
    setPreview(URL.createObjectURL(out));
    setRes(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("idPhoto", out);
    try {
      setRes(await read(fd));
    } catch {
      setRes({ error: t("idBadPhoto") });
    } finally {
      setBusy(false);
    }
  };

  const ok = res && !("error" in res) ? res : null;
  const btn = "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-line bg-white px-3 py-3 text-base font-semibold text-brand-900 hover:bg-brand-50";
  return (
    <div className="space-y-3" data-testid="id-proof">
      <input ref={photoField} type="file" name="idPhoto" accept="image/*" className="hidden" tabIndex={-1} aria-hidden />
      <input type="hidden" name="idType" value={ok?.type ?? ""} />
      <input type="hidden" name="idNumber" value={ok?.number ?? ""} />
      <input type="hidden" name="idSig" value={ok?.sig ?? ""} />

      {!preview && current?.photoUrl && (
        <div className="flex items-center gap-3 rounded-xl bg-canvas p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.photoUrl} alt={t("idSeePhoto")} className="h-16 w-24 rounded-lg object-cover" />
          <div className="text-sm">
            <p className="text-xs text-muted">{t("idSaved")}</p>
            <p className="font-semibold text-brand-900">{current.number ? t("idReadAs", { type: current.type ?? "ID", number: current.number }) : t("idNotRead")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className={btn}>
          📷 {preview ? t("idRetake") : current?.photoUrl ? t("idReplace") : t("idTake")}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = ""; // so choosing the same photo again still works
              void pick(f);
            }} data-testid="id-take" />
        </label>
        <label className={btn}>
          🖼️ {t("idChoose")}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = ""; // so choosing the same photo again still works
              void pick(f);
            }} data-testid="id-choose" />
        </label>
      </div>

      {preview && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 text-sm" role="status" data-testid="id-result">
            {busy && <p className="text-muted">{t("idReading")}</p>}
            {ok?.status === "ok" && (
              <>
                <p className="text-base font-bold break-words text-brand-900">{t("idReadAs", { type: ok.type ?? "ID", number: ok.number ?? "" })}</p>
                <p className="text-xs text-muted">{t("idReadOk")}</p>
              </>
            )}
            {ok?.status === "unreadable" && <p className="text-red-700">{t("idUnreadable")}</p>}
            {ok?.status === "off" && <p className="text-muted">{t("idOffSaved")}</p>}
            {res && "error" in res && <p className="text-red-700">{res.error}</p>}
          </div>
        </div>
      )}
      <p className="text-xs text-muted">{t("idHint")}</p>
    </div>
  );
}
