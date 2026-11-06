import { redirect } from "next/navigation";

// Owners and caretakers now sign in on the same page.
export default function StaffLoginPage() {
  redirect("/login");
}
