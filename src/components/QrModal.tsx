import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button, Modal } from "./ui";
import type { Property } from "../types";

export function QrModal({ property, pgName, onClose }: { property: Property; pgName: string; onClose: () => void }) {
  const link = `${location.origin}/enquire/${property.id}`;
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(link, { width: 320, margin: 1 }).then(setSrc); }, [link]);
  return (
    <Modal title="Enquiry QR code" onClose={onClose}>
      <div className="print-area text-center">
        <p className="text-lg font-semibold">{pgName}</p><p className="text-sm text-slate-500">{property.name}</p>
        {src && <img src={src} alt="Enquiry QR code" className="mx-auto my-3 h-64 w-64" />}
        <p className="font-medium">Scan to enquire about rooms</p>
        <p className="break-all text-xs text-slate-400">{link}</p>
      </div>
      <div className="no-print mt-4 flex gap-2">
        <Button onClick={() => window.print()}>Print poster</Button>
        <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(link)}>Copy link</Button>
      </div>
    </Modal>
  );
}
