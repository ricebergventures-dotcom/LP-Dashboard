"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatters";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const today = formatDate(new Date().toISOString());

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">{title}</h1>
        {subtitle && (
          <span className="text-[11px] text-muted-foreground/60">{subtitle}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="tabular text-[11px] text-muted-foreground/60">{today}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
