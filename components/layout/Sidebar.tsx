"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Upload, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",              icon: LayoutDashboard },
  { label: "Transactions",  href: "/dashboard/transactions", icon: ArrowLeftRight   },
  { label: "Upload",        href: "/dashboard/upload",       icon: Upload, adminOnly: true },
  { label: "Settings",      href: "/dashboard/settings",     icon: Settings         },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin } = useAuth();
  const fundName = process.env.NEXT_PUBLIC_FUND_NAME ?? "LP Dashboard";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-background">
      {/* Fund name */}
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          {fundName}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/50 tracking-wide">
          LP Reporting
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-px p-3">
        {NAV_ITEMS.map((item) => {
          if ("adminOnly" in item && item.adminOnly && !isAdmin) return null;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-l-2 border-accent text-accent font-medium pl-[10px]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2.5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground truncate">
            {profile?.email ?? "—"}
          </p>
          <Badge
            variant={profile?.role === "admin" ? "active" : "default"}
            className="text-[10px] px-1.5 py-0"
          >
            {profile?.role ?? "viewer"}
          </Badge>
        </div>
        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
