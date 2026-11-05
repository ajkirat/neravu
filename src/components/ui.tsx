import { ReactNode, useEffect } from "react";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
);

export const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="text-2xl font-semibold">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
    {action}
  </div>
);

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" };
export const Button = ({ variant = "primary", className = "", ...p }: BtnProps) => {
  const v = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  }[variant];
  return <button {...p} className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${v} ${className}`} />;
};

const tones: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700", red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700", slate: "bg-slate-100 text-slate-600",
};
export const Badge = ({ tone = "slate", children }: { tone?: keyof typeof tones; children: ReactNode }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
);

export const Stat = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) => (
  <Card className="p-4">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${tone ?? ""}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </Card>
);

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block text-sm"><span className="mb-1 block text-slate-600">{label}</span>{children}</label>
);
export const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={inputCls} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={inputCls} />;

export const Empty = ({ text }: { text: string }) => <div className="p-8 text-center text-sm text-slate-500">{text}</div>;

export const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
        <tr>{head.map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);
export const Td = ({ children, className = "" }: { children: ReactNode; className?: string }) => <td className={`px-4 py-3 ${className}`}>{children}</td>;
