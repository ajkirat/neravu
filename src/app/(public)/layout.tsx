import { Logo } from "@/components/logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      {children}
    </div>
  );
}
