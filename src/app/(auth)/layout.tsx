import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentOwner } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await currentOwner()) redirect("/dashboard");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-700 p-10 text-white lg:flex">
        <Link href="/">
          <Logo light />
        </Link>
        <div>
          <p className="text-3xl leading-tight font-bold">
            Every bed, every tenant,
            <br />
            every rupee. <span className="text-marigold-400">Sorted.</span>
          </p>
          <p className="mt-4 max-w-sm text-brand-100">
            Neravu helps PG owners track occupancy, collect rent and chase dues without a single
            spreadsheet.
          </p>
        </div>
        <p className="text-xs text-brand-200">Built for PG and hostel owners in India.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
