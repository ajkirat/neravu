import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { signup } from "@/app/actions/auth";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Create your owner account</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Free while in early access.</p>
      <ActionForm action={signup} submitLabel="Create account" submitClassName="btn-primary w-full">
        <Field label="Your name">
          <input className="input" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email">
          <input className="input" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Mobile (optional)">
          <input className="input" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input
            className="input"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
