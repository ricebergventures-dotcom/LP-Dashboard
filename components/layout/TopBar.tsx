"use client";

import { useState } from "react";
import { Moon, Sun, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/formatters";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const today = formatDate(new Date().toISOString());
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch("/api/summary", { method: "POST" });
      router.refresh();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-sm font-medium text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <span className="tabular text-xs text-muted-foreground">{today}</span>

        {isAdmin && (
          <Button
            size="sm"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="h-7 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating…" : "Generate LP Update"}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="h-7 w-7"
        >
          <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
