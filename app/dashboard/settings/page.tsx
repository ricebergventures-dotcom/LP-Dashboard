import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile } from "@/types";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = data as Profile | null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-lg space-y-5">
          {/* Account section */}
          <Card>
            <div className="px-5 py-4 border-b border-border">
              <p className="tabular text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Account
              </p>
            </div>
            <CardContent className="py-4 space-y-4">
              <Row label="Email" value={profile?.email ?? user.email ?? "—"} />
              <Row
                label="Name"
                value={profile?.full_name || "—"}
              />
              <div className="flex items-center justify-between">
                <span className="tabular text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  Role
                </span>
                <Badge variant={profile?.role === "admin" ? "active" : "default"}>
                  {profile?.role ?? "viewer"}
                </Badge>
              </div>
              <Row
                label="Member since"
                value={
                  profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </CardContent>
          </Card>

          {/* Access note */}
          <p className="text-[11px] text-muted-foreground">
            Access is managed by your fund administrator. Contact them to change
            your role or permissions.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="tabular text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
