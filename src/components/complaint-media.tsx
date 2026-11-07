"use client";

import { useEffect, useRef, useState } from "react";
import { shrinkImage } from "@/lib/image";
import { useI18n } from "@/lib/i18n/client";

/** Largest video we send: a form can carry about 4 MB in all. */
export const VIDEO_MAX_BYTES = 3_500_000;
const MAX_SECONDS = 30;
// Low bitrate keeps 30 seconds well under the limit and is still clear on a phone.
const REC = { videoBitsPerSecond: 650_000, audioBitsPerSecond: 48_000 };

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["video/mp4;codecs=avc1", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "";
}

/** Put a file into a (hidden) file input, so the normal form submit sends it. */
function setFile(input: HTMLInputElement | null, file: File | null) {
  if (!input) return;
  const dt = new DataTransfer();
  if (file) dt.items.add(file);
  input.files = dt.files;
}

/** Record from a stream into one file, stopping at MAX_SECONDS. */
function recordStream(stream: MediaStream, onTick: (s: number) => void, stopRef: { stop?: () => void }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mime = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { ...REC, mimeType: mime } : REC);
    } catch (e) {
      return reject(e);
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || mime || "video/webm" }));
    rec.onerror = () => reject(new Error("record"));
    let s = 0;
    const timer = setInterval(() => {
      s += 1;
      onTick(s);
      if (s >= MAX_SECONDS) stop();
    }, 1000);
    const stop = () => {
      clearInterval(timer);
      if (rec.state !== "inactive") rec.stop();
    };
    stopRef.stop = stop;
    rec.start(1000);
  });
}

/**
 * Photo or video for a tenant's complaint: take a photo, choose a photo, record a video (up to 30
 * seconds) or choose a video. Big photos are shrunk; big videos are re-recorded smaller where the
 * phone allows it.
 */
export function ComplaintMedia() {
  const { t } = useI18n();
  const photoField = useRef<HTMLInputElement>(null);
  const videoField = useRef<HTMLInputElement>(null);
  const live = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<{ stop?: () => void }>({});
  const streamRef = useRef<MediaStream | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "recording" | "shrinking">("idle");
  const [secs, setSecs] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  // The form is cleared after a complaint is sent: clear the previews too.
  useEffect(() => {
    const form = photoField.current?.form;
    if (!form) return;
    const clear = () => {
      setPhotoUrl(null);
      setVideoUrl(null);
      setMsg(null);
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);
  useEffect(() => () => stopCamera(), []);

  const acceptPhoto = async (file: File | undefined) => {
    setMsg(null);
    if (!file) return;
    let out = file;
    if (file.size > 600_000) {
      try {
        const img = await shrinkImage(file, 1280, 0.75);
        out = new File([Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0))], "photo.jpg", { type: "image/jpeg" });
      } catch {
        /* keep the original */
      }
    }
    setFile(photoField.current, out);
    setPhotoUrl(URL.createObjectURL(out));
  };

  const acceptVideo = (blob: Blob) => {
    if (blob.size > VIDEO_MAX_BYTES) {
      setMsg(t("mpVideoTooBig"));
      return;
    }
    const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("quicktime") ? "mov" : "webm";
    // Plain type only: "video/mp4;codecs=avc1,opus" confuses the upload.
    setFile(videoField.current, new File([blob], `video.${ext}`, { type: blob.type.split(";")[0] || `video/${ext}` }));
    setVideoUrl(URL.createObjectURL(blob));
    setMsg(null);
  };

  const recordVideo = async () => {
    setMsg(null);
    if (!navigator.mediaDevices?.getUserMedia || !pickMime()) return setMsg(t("mpCameraNo"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
      streamRef.current = stream;
      setMode("recording");
      setSecs(0);
      requestAnimationFrame(() => {
        if (live.current) {
          live.current.srcObject = stream;
          void live.current.play().catch(() => {});
        }
      });
      const blob = await recordStream(stream, setSecs, stopRef.current);
      stopCamera();
      setMode("idle");
      acceptVideo(blob);
    } catch {
      stopCamera();
      setMode("idle");
      setMsg(t("mpCameraNo"));
    }
  };

  const chooseVideo = async (file: File | undefined) => {
    setMsg(null);
    if (!file) return;
    if (file.size <= VIDEO_MAX_BYTES) return acceptVideo(file);
    // Too big: play it once into a recorder at a lower quality (Chrome / Android can; iPhone cannot).
    const v = document.createElement("video");
    const capture = (v as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
    if (!capture || !pickMime()) return setMsg(t("mpVideoTooBig"));
    try {
      v.src = URL.createObjectURL(file);
      v.muted = true;
      v.playsInline = true;
      await v.play();
      setMode("shrinking");
      setSecs(0);
      const blob = await recordStream(capture.call(v), setSecs, stopRef.current);
      v.pause();
      setMode("idle");
      acceptVideo(blob);
    } catch {
      setMode("idle");
      setMsg(t("mpVideoTooBig"));
    }
  };

  const clearPhoto = () => {
    setFile(photoField.current, null);
    setPhotoUrl(null);
  };
  const clearVideo = () => {
    setFile(videoField.current, null);
    setVideoUrl(null);
  };

  const btn = "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-line bg-white px-3 py-3 text-base font-semibold text-brand-900 hover:bg-brand-50";
  return (
    <div className="space-y-3">
      {/* What actually gets sent with the form. */}
      <input ref={photoField} type="file" name="photo" accept="image/*" className="hidden" tabIndex={-1} aria-hidden />
      <input ref={videoField} type="file" name="video" accept="video/*" className="hidden" tabIndex={-1} aria-hidden />

      {mode === "idle" && (
        <div className="grid grid-cols-2 gap-2">
          <label className={btn}>
            📷 {t("mpTakePhoto")}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => acceptPhoto(e.target.files?.[0])} data-testid="take-photo" />
          </label>
          <label className={btn}>
            🖼️ {t("mpUploadPhoto")}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => acceptPhoto(e.target.files?.[0])} data-testid="upload-photo" />
          </label>
          <button type="button" className={btn} onClick={recordVideo} data-testid="record-video">
            🎥 {t("mpRecordVideo")}
          </button>
          <label className={btn}>
            📁 {t("mpUploadVideo")}
            <input type="file" accept="video/*" className="sr-only" onChange={(e) => chooseVideo(e.target.files?.[0])} data-testid="upload-video" />
          </label>
        </div>
      )}

      {mode === "recording" && (
        <div className="space-y-2 rounded-xl bg-brand-900 p-2">
          <video ref={live} muted playsInline className="w-full rounded-lg" />
          <div className="flex items-center justify-between px-1 text-white">
            <span className="font-semibold">🔴 {t("mpRecording", { s: secs, max: MAX_SECONDS })}</span>
            <button type="button" className="btn-accent" onClick={() => stopRef.current.stop?.()}>
              {t("mpStopRec")}
            </button>
          </div>
        </div>
      )}
      {mode === "shrinking" && <p className="rounded-xl bg-brand-50 px-3 py-3 text-sm text-brand-700">{t("mpShrinking", { s: secs })}</p>}

      {msg && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{msg}</p>}

      {(photoUrl || videoUrl) && (
        <div className="grid grid-cols-2 gap-2">
          {photoUrl && (
            <div className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-32 w-full rounded-lg object-cover" />
              <button type="button" className="text-sm text-red-700 underline" onClick={clearPhoto}>
                {t("mpRemove")}
              </button>
            </div>
          )}
          {videoUrl && (
            <div className="space-y-1">
              <video src={videoUrl} controls playsInline className="h-32 w-full rounded-lg bg-black" data-testid="video-preview" />
              <button type="button" className="text-sm text-red-700 underline" onClick={clearVideo}>
                {t("mpRemove")}
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-muted">{t("mpMediaHint", { max: MAX_SECONDS })}</p>
    </div>
  );
}
