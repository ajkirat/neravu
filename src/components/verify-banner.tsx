"use client";

import { useActionState, startTransition } from "react";
import { resendVerification } from "@/app/actions/account";
import { useT } from "@/lib/i18n/client";

export function VerifyBanner({ email }: { email: string }) {
  const t = useT();
  const [state, dispatch, pending] = useActionState(resendVerification, undefined);
  return (
    <div role="status" className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-marigold-100 px-4 py-2.5 text-sm text-marigold-700">
      <span>{t("verifyBanner", { email })}</span>
      {state?.ok ? (
        <span className="font-medium">{state.ok}</span>
      ) : (
        <button type="button" className="font-semibold underline" disabled={pending} onClick={() => startTransition(() => dispatch())}>
          {t("verifyResend")}
        </button>
      )}
      {state?.error && <span className="text-red-700">{state.error}</span>}
    </div>
  );
}
