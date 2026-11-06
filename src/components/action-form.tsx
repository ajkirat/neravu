"use client";

import { useActionState, useEffect, useRef, startTransition, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

export type FormState = { error?: string; ok?: string; at?: number } | undefined;
export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Form wrapper for server actions: shows errors and success messages, keeps
 * the user's input on error, and optionally clears the form on success.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitClassName = "btn-primary",
  resetOnSuccess = false,
  className = "space-y-4",
  cols = false,
  confirm,
  footer,
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
  className?: string;
  /** Lay fields out in 1/2/3 columns as the screen widens (full-width form cards). */
  cols?: boolean | "pairs";
  confirm?: string;
  footer?: ReactNode;
}) {
  const t = useT();
  const [state, dispatch, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={cols === "pairs" ? "grid grid-cols-2 items-start gap-x-3 gap-y-3 lg:grid-cols-3 lg:gap-x-4" : cols ? "grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3" : className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && !state.error && (
        <p role="status" className="col-span-full rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {state.ok}
        </p>
      )}
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <button type="submit" className={submitClassName} disabled={pending}>
          {pending ? t("saving") : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
