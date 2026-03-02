import { redirect } from "next/navigation";

// Root redirects to dashboard. Middleware handles auth.
export default function Home() {
  redirect("/dashboard");
}
