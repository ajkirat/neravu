export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // A roofline sheltering three beds: Neravu's mark.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0e6b64" />
      <path
        d="M7 15.5 16 8l9 7.5"
        fill="none"
        stroke="#f0b14d"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8.5" y="18.5" width="4" height="6" rx="1.4" fill="#fff" />
      <rect x="14" y="18.5" width="4" height="6" rx="1.4" fill="#fff" />
      <rect x="19.5" y="18.5" width="4" height="6" rx="1.4" fill="#fff" opacity=".55" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span
        className={`text-lg font-bold tracking-tight ${light ? "text-white" : "text-brand-900"}`}
      >
        neravu
      </span>
    </span>
  );
}
