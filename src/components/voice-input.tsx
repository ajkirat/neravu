"use client";

import { useRef, useState } from "react";
import { localeFor } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

type Rec = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

/** Text input with a microphone button: speak in Kannada, Telugu or English instead of typing. */
export function VoiceInput({
  name,
  className = "input",
  defaultValue,
  placeholder,
  required,
  maxLength,
}: {
  name: string;
  className?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const { lang, t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recRef = useRef<Rec | null>(null);

  const toggle = () => {
    if (listening) return recRef.current?.stop();
    const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Ctor) return setUnsupported(true);
    const rec: Rec = new Ctor();
    rec.lang = localeFor(lang);
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const said = Array.from(e.results as ArrayLike<any>).map((r) => r[0].transcript).join(" ").trim();
      if (ref.current && said) {
        ref.current.value = (ref.current.value ? ref.current.value + " " : "") + said;
        ref.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <div>
      <div className="flex gap-2">
        <input ref={ref} className={className} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} maxLength={maxLength} />
        <button
          type="button"
          onClick={toggle}
          aria-pressed={listening}
          aria-label={t("voiceStart")}
          title={t("voiceStart")}
          className={`shrink-0 rounded-lg px-3 text-lg ring-1 ring-line ${listening ? "bg-red-50 text-red-700" : "bg-white"}`}
        >
          🎤
        </button>
      </div>
      {listening && <p className="mt-1 text-xs text-brand-700">{t("voiceListening")}</p>}
      {unsupported && <p className="mt-1 text-xs text-muted">{t("voiceUnsupported")}</p>}
    </div>
  );
}
