import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentOwner } from "@/lib/auth";

const features = [
  {
    title: "Beds at a glance",
    body: "Map every property, room and bed. See what is occupied, on notice or free to let.",
  },
  {
    title: "Rent that bills itself",
    body: "Monthly rent is raised automatically on each tenant's due day, so dues are always current.",
  },
  {
    title: "Dues you can chase",
    body: "One list of who owes what and since when, with a WhatsApp reminder a tap away.",
  },
  {
    title: "Payments and receipts",
    body: "Record UPI, cash or bank payments in seconds and share a printable receipt.",
  },
  {
    title: "Expenses and profit",
    body: "Log groceries, salaries and bills per property, then see collections against spend.",
  },
  {
    title: "Smooth move-ins and move-outs",
    body: "Capture KYC and emergency contacts, track notice periods and free up beds on exit.",
  },
];

export default async function Home() {
  if (await currentOwner()) redirect("/dashboard");
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex gap-2">
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 md:pt-20">
          <p className="mb-4 inline-block rounded-full bg-marigold-100 px-3 py-1 text-xs font-semibold text-marigold-700">
            For PG and hostel owners
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight text-brand-900 md:text-6xl">
            Run your PG like it runs itself.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Neravu keeps your beds, tenants, rent and dues in one calm place, so month-end is a
            glance instead of a hunt through notebooks and chats.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Create free account
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">
              I already have one
            </Link>
          </div>
        </section>
        <section className="border-t border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-14 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line p-6">
                <div className="mb-3 h-1.5 w-10 rounded-full bg-marigold-400" />
                <h2 className="font-semibold text-brand-900">{f.title}</h2>
                <p className="mt-1.5 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-5 py-8 text-xs text-muted">
        © {new Date().getFullYear()} Neravu
      </footer>
    </div>
  );
}
