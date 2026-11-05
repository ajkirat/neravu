import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm text-brand-600 hover:underline">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-brand-900">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn" | "good" | "brand";
}) {
  const tones = {
    default: "bg-white",
    warn: "bg-marigold-100/60 border-marigold-400/40",
    good: "bg-brand-50 border-brand-100",
    brand: "bg-brand-600 border-brand-600 text-white",
  } as const;
  return (
    <div className={`card p-4 ${tones[tone]}`}>
      <p className={`text-xs font-medium tracking-wide uppercase ${tone === "brand" ? "text-brand-100" : "text-muted"}`}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
      {hint && (
        <p className={`mt-1 text-xs ${tone === "brand" ? "text-brand-100" : "text-muted"}`}>{hint}</p>
      )}
    </div>
  );
}

const badgeTones = {
  gray: "bg-canvas text-muted ring-line",
  green: "bg-brand-50 text-brand-700 ring-brand-100",
  amber: "bg-marigold-100 text-marigold-700 ring-marigold-400/40",
  red: "bg-red-50 text-red-700 ring-red-200",
} as const;

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-canvas/50 px-6 py-10 text-center">
      <p className="font-semibold text-brand-900">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TenantStatusBadge({ status }: { status: string }) {
  if (status === "NOTICE") return <Badge tone="amber">On notice</Badge>;
  if (status === "MOVED_OUT") return <Badge>Moved out</Badge>;
  return <Badge tone="green">Active</Badge>;
}
