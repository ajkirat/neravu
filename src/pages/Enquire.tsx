import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Button, Field, Input } from "../components/ui";

interface Info { name: string; address: string; city: string; pgName: string; phone: string }

/** Public page opened from the property QR code. No login. */
export default function Enquire() {
  const { id } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState(""), [done, setDone] = useState(false), [busy, setBusy] = useState(false);

  useEffect(() => { api<Info>(`/api/public/property/${id}`).then(setInfo).catch(e => setError(e.message)); }, [id]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await api("/api/public/enquiry", { propertyId: id, ...Object.fromEntries(new FormData(e.currentTarget)) }); setDone(true); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {!info && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {!info && error && <p className="text-sm text-red-600">{error}</p>}
        {info && (done ? (
          <div className="text-center"><p className="text-lg font-semibold">Thank you!</p>
            <p className="mt-1 text-sm text-slate-500">{info.pgName} will contact you shortly.</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div><h1 className="text-xl font-semibold">{info.pgName}</h1><p className="text-sm text-slate-500">{info.address}, {info.city}</p></div>
            <Field label="Your name"><Input name="name" required maxLength={80} /></Field>
            <Field label="Phone"><Input name="phone" type="tel" required pattern="[0-9+ \-]{7,20}" /></Field>
            <Field label="What are you looking for?"><Input name="note" maxLength={500} placeholder="e.g. single room from next month" /></Field>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send enquiry"}</Button>
          </form>
        ))}
      </div>
    </div>
  );
}
