"use client";

import { useState, useTransition } from "react";
import { startRazorpayPayment } from "@/app/actions/paylink";
import { useT } from "@/lib/i18n/client";

export function PayOnlineButton({ token, amount }: { token: string; amount: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="btn-primary w-full justify-center"
        disabled={pending || redirecting}
        onClick={() =>
          start(async () => {
            setError("");
            const res = await startRazorpayPayment(token);
            if (res.url) {
              setRedirecting(true);
              window.location.href = res.url;
            } else setError(res.error ?? t("payRzpError"));
          })
        }
      >
        {pending || redirecting ? t("payRedirecting") : t("payOnlineBtn", { amt: amount })}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
