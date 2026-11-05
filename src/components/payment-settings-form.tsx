"use client";

import { useActionState, startTransition, useState } from "react";
import { savePaymentSettings, removeRazorpay } from "@/app/actions/payment-settings";
import { CopyButton } from "@/components/copy-button";
import { useT } from "@/lib/i18n/client";
import type { MsgKey } from "@/lib/i18n";

const MODES: { value: "NONE" | "UPI" | "RAZORPAY"; label: MsgKey; desc: MsgKey }[] = [
  { value: "UPI", label: "modeUpi", desc: "modeUpiDesc" },
  { value: "RAZORPAY", label: "modeRzp", desc: "modeRzpDesc" },
  { value: "NONE", label: "modeNone", desc: "modeNoneDesc" },
];

export function PaymentSettingsForm({
  initialMode,
  upiId,
  razorpayKeyId,
  razorpayEnabled,
  webhookUrl,
}: {
  initialMode: "NONE" | "UPI" | "RAZORPAY";
  upiId: string;
  razorpayKeyId: string;
  razorpayEnabled: boolean;
  webhookUrl: string;
}) {
  const t = useT();
  const [mode, setMode] = useState(initialMode);
  const [state, dispatch, pending] = useActionState(savePaymentSettings, undefined);
  const [removed, removeDispatch, removing] = useActionState(removeRazorpay, undefined);

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          // Submit by hand: React's built-in form action clears every field, even after an error.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
      >
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-muted">{t("payHowHint")}</legend>
          {MODES.map((m) => (
            <label key={m.value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === m.value ? "border-brand-500 bg-brand-50" : "border-line bg-white"}`}>
              <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="mt-1 h-4 w-4" />
              <span>
                <span className="block text-sm font-semibold text-brand-900">{t(m.label)}</span>
                <span className="block text-xs text-muted">{t(m.desc)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {(mode === "UPI" || mode === "RAZORPAY") && (
          <label className="block">
            <span className="label">{t("upiIdLabel")}</span>
            <input name="upiId" className="input" defaultValue={upiId} placeholder="name@bank" />
            <span className="mt-1 block text-xs text-muted">{t("upiIdHint")}</span>
          </label>
        )}

        {mode === "RAZORPAY" && (
          <div className="space-y-4 rounded-xl bg-canvas p-4">
            {razorpayEnabled && <p className="text-sm font-medium text-brand-700">✓ {t("rzpActive")}</p>}
            <div>
              <p className="mb-1 text-sm font-semibold text-brand-900">{t("rzpStepsTitle")}</p>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
                {(["rzpStep1", "rzpStep2", "rzpStep3", "rzpStep4"] as MsgKey[]).map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ol>
            </div>
            <div>
              <span className="label">{t("rzpWebhookUrl")}</span>
              <div className="flex items-center gap-2">
                <input readOnly className="input" value={webhookUrl} onFocus={(e) => e.currentTarget.select()} />
                <CopyButton text={webhookUrl} />
              </div>
            </div>
            <label className="block">
              <span className="label">{t("rzpKeyId")}</span>
              <input name="razorpayKeyId" className="input" defaultValue={razorpayKeyId} placeholder="rzp_live_xxxxxxxx" autoComplete="off" />
            </label>
            <label className="block">
              <span className="label">{t("rzpKeySecret")}</span>
              <input name="razorpayKeySecret" type="password" className="input" autoComplete="new-password" placeholder={razorpayEnabled ? "••••••••" : ""} />
              {razorpayEnabled && <span className="mt-1 block text-xs text-muted">{t("rzpSavedKeep")}</span>}
            </label>
            <label className="block">
              <span className="label">{t("rzpWebhookSecret")}</span>
              <input name="razorpayWebhookSecret" type="password" className="input" autoComplete="new-password" placeholder={razorpayEnabled ? "••••••••" : ""} />
              {razorpayEnabled && <span className="mt-1 block text-xs text-muted">{t("rzpSavedKeep")}</span>}
            </label>
          </div>
        )}

        {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        {state?.ok && !state.error && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.ok}</p>}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </button>
      </form>

      {razorpayEnabled && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (window.confirm(t("rzpRemoveConfirm"))) startTransition(() => removeDispatch());
          }}
        >
          <button type="submit" className="btn-danger btn-sm" disabled={removing}>
            {t("rzpRemove")}
          </button>
        </form>
      )}
      {/* Shown even after the button is gone, so the owner sees it worked. */}
      {removed?.ok && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{removed.ok}</p>}
    </div>
  );
}
