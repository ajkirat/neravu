import { redirect } from "next/navigation";
import { requireActor } from "@/lib/auth";

// Regular jobs grew into Upkeep (services, checklists, equipment).
export default async function JobsPage() {
  await requireActor();
  redirect("/upkeep?tab=services");
}
