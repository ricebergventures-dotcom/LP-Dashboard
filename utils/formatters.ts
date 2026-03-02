import { format, parseISO } from "date-fns";
import type { DealStatus } from "@/types";

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatShortDate(iso: string): string {
  return format(parseISO(iso), "MMM d");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a");
}

// Compact: $267.9K, $1.2M. Shows one decimal only when the value isn't whole.
function compactDollars(value: number, divisor: number, suffix: string): string {
  const n = value / divisor;
  const digits = n % 1 === 0 ? 0 : 1;
  return `$${n.toFixed(digits)}${suffix}`;
}

export function formatCheckSize(amount: number | null): string {
  if (amount === null || amount === undefined) return "—";
  if (amount >= 1_000_000) return compactDollars(amount, 1_000_000, "M");
  if (amount >= 1_000) return compactDollars(amount, 1_000, "K");
  return `$${amount.toLocaleString("en-US")}`;
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

// Stage names are now free-form strings from Decile Hub (e.g. "Added", "Reach Out to Cold Lead").
export function formatStage(stage: string): string {
  return stage || "—";
}

const STATUS_LABELS: Record<DealStatus, string> = {
  active: "Active",
  passed: "Passed",
  diligence: "Diligence",
};

export function formatStatus(status: DealStatus): string {
  return STATUS_LABELS[status] ?? status;
}
