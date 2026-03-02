import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Settings are user-specific. With public access enabled there is no
// logged-in user, so redirect to the main dashboard.
export default function SettingsPage() {
  redirect("/dashboard");
}
