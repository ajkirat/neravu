import { FormEvent, useState } from "react";
import { api, User } from "../api";
import { Button, Field, Input } from "../components/ui";

export default function Login({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      const { user } = await api<{ user: User }>(`/api/auth/${mode}`, Object.fromEntries(f));
      onAuth(user);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div><h1 className="text-2xl font-bold text-brand-600">Neravu</h1>
          <p className="text-sm text-slate-500">{mode === "login" ? "Sign in to manage your PG" : "Create your owner account"}</p></div>
        {mode === "signup" && <Field label="Your name"><Input name="name" autoComplete="name" /></Field>}
        <Field label="Email"><Input name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password"><Input name="password" type="password" required minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"} /></Field>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
        <button type="button" className="w-full text-sm text-brand-600"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
      </form>
    </div>
  );
}
