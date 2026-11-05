import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { api } from "../api";
import { Button } from "../components/ui";
import { inr, monthLabel } from "../utils";

interface Info { pgName: string; tenantName: string; month: string; balance: number; dueDate: string; upiId: string; claimed: boolean }

/** Public page opened from a rent reminder. Pays the owner's UPI ID directly; the owner confirms receipt. */
export default function Pay() {
  const { id } = useParams();
  const [info, setInfo] = useState<Info | null>(null), [error, setError] = useState("");
  const [qr, setQr] = useState(""), [claimed, setClaimed] = useState(false);

  useEffect(() => { api<Info>(`/api/public/pay/${id}`).then(i => { setInfo(i); setClaimed(i.claimed); }).catch(e => setError(e.message)); }, [id]);
  const link = info && info.upiId
    ? `upi://pay?pa=${encodeURIComponent(info.upiId)}&pn=${encodeURIComponent(info.pgName)}&am=${info.balance}&cu=INR&tn=${encodeURIComponent("Rent " + info.month)}` : "";
  useEffect(() => { if (link) QRCode.toDataURL(link, { width: 240, margin: 1 }).then(setQr); }, [link]);

  const claim = async () => { await api(`/api/public/pay/${id}/claim`, {}).catch(() => {}); setClaimed(true); };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {!info && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && (
          <>
            <p className="text-sm text-slate-500">{info.pgName}</p>
            <h1 className="text-lg font-semibold">Hi {info.tenantName}, rent for {monthLabel(info.month)}</h1>
            {info.balance <= 0 ? <p className="mt-4 font-medium text-emerald-600">All paid. Thank you! ✓</p> : (
              <>
                <p className="my-3 text-3xl font-bold">{inr(info.balance)}</p>
                {!info.upiId ? <p className="text-sm text-slate-500">Please pay the owner directly.</p> : (
                  <>
                    <a href={link} className="block rounded-lg bg-brand-600 px-4 py-3 font-medium text-white">Pay with UPI app</a>
                    {qr && <img src={qr} alt="UPI QR code" className="mx-auto mt-4 h-48 w-48" />}
                    <p className="mt-1 text-xs text-slate-500">or scan with any UPI app · {info.upiId}</p>
                    {claimed ? <p className="mt-4 text-sm text-emerald-600">Thanks! The owner will confirm your payment.</p>
                      : <Button variant="ghost" className="mt-4 w-full" onClick={claim}>I’ve paid</Button>}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
