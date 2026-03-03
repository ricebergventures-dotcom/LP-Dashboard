"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types";

export default function AdminUsersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push("/dashboard");
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    void fetch("/api/admin/users")
      .then((r) => r.json())
      .then(({ data }: { data: Profile[] }) => {
        setProfiles(data ?? []);
        setLoading(false);
      });
  }, [isAdmin]);

  const update = async (id: string, patch: Partial<Pick<Profile, "approved" | "role">>) => {
    setBusy(id);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setProfiles((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
    setBusy(null);
  };

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!isAdmin) return null;

  const pending = profiles.filter((p) => !p.approved);
  const approved = profiles.filter((p) => p.approved);

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-lg font-medium text-foreground">User Management</h1>

      {pending.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Pending Approval ({pending.length})
          </p>
          <div className="border border-border divide-y divide-border">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {u.full_name || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Button
                  size="sm"
                  disabled={busy === u.id}
                  onClick={() => void update(u.id, { approved: true })}
                >
                  Approve
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      )}

      {approved.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Approved ({approved.length})
          </p>
          <div className="border border-border divide-y divide-border">
            {approved.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {u.full_name || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={u.role === "admin" ? "active" : "default"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {u.role}
                  </Badge>
                  {u.role !== "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === u.id}
                      onClick={() => void update(u.id, { role: "admin" })}
                    >
                      Make admin
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === u.id}
                    onClick={() => void update(u.id, { approved: false })}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
