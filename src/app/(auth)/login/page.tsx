import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { login } from "@/app/actions/auth";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Log in to manage your PG.</p>
      <ActionForm action={login} submitLabel="Log in" submitClassName="btn-primary w-full">
        <Field label="Email">
          <input className="input" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <input
            className="input"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm text-muted">
        New to Neravu?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Create an owner account
        </Link>
      </p>
    </>
  );
}
