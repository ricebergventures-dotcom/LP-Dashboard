"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart2, Briefcase, Upload, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { label: "Pipeline",  href: "/dashboard",           icon: BarChart2  },
  { label: "Portfolio", href: "/dashboard/portfolio",  icon: Briefcase  },
  { label: "Upload",    href: "/dashboard/upload",     icon: Upload,  adminOnly: true },
  { label: "Users",     href: "/dashboard/admin",      icon: Users,   adminOnly: true },
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
    <aside
      className="flex h-screen w-[212px] shrink-0 flex-col"
      style={{ background: "#0A0C12" }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Image
          src="/logo.png"
          alt={fundName}
          width={116}
          height={32}
          className="object-contain"
          priority
        />
        <p className="mt-2 text-[9px] text-white/20 tracking-[0.18em] uppercase font-mono">
          LP Reporting
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5">
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
                "relative flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-[3px] transition-colors",
                active
                  ? "text-[#5CD3D3] font-medium"
                  : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 bg-white/[0.08] rounded-[3px]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <item.icon className="relative h-4 w-4 shrink-0" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className="px-4 py-4 space-y-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="min-w-0">
          <p className="text-[12px] text-white/50 truncate leading-snug">
            {profile?.email ?? "—"}
          </p>
          <p className="text-[10px] text-white/25 capitalize mt-0.5">
            {profile?.role ?? "viewer"}
          </p>
        </div>
        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors"
        >
          <LogOut className="h-3 w-3 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
