"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const fundName = process.env.NEXT_PUBLIC_FUND_NAME ?? "LP Dashboard";

  return (
    <div className="w-full max-w-sm space-y-8 text-center">
      <div className="space-y-1">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {fundName}
        </p>
        <h1 className="text-lg font-medium text-foreground">
          Awaiting approval
        </h1>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Your account request has been received. You&apos;ll be able to access
          the dashboard once an admin approves your account.
        </p>
        <p className="text-sm text-muted-foreground">
          No action needed — just check back later.
        </p>
      </div>

      <Button variant="outline" className="w-full" onClick={() => void handleSignOut()}>
        Sign out
      </Button>
    </div>
  );
}
