"use client";

import { useT } from "@/lib/i18n/client";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}>
      {t("print")}
    </button>
  );
}
