"use client";

import { useActionState, useEffect, useRef, startTransition, type ReactNode } from "react";

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
  confirm,
  footer,
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
  className?: string;
  confirm?: string;
  footer?: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && !state.error && (
        <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {state.ok}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={submitClassName} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
