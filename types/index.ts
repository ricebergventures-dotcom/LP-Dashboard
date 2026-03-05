// ─── String union types ───────────────────────────────────────────────────────

export type DealStage =
  | "pre-seed"
  | "seed"
  | "series-a"
  | "series-b"
  | "series-c"
  | "growth";

export type DealStatus = "active" | "passed" | "diligence";

export type UserRole = "admin" | "viewer";

// ─── Type guards ──────────────────────────────────────────────────────────────

const DEAL_STAGES: readonly DealStage[] = [
  "pre-seed",
  "seed",
  "series-a",
  "series-b",
  "series-c",
  "growth",
];

const DEAL_STATUSES: readonly DealStatus[] = ["active", "passed", "diligence"];

export function isDealStage(value: unknown): value is DealStage {
  return (
    typeof value === "string" &&
    (DEAL_STAGES as readonly string[]).includes(value)
  );
}

export function isDealStatus(value: unknown): value is DealStatus {
  return (
    typeof value === "string" &&
    (DEAL_STATUSES as readonly string[]).includes(value)
  );
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "viewer";
}

// ─── Database row interfaces ──────────────────────────────────────────────────

export interface Deal {
  id: string;
  company_name: string;
  sector: string;
  stage: string;   // pipeline stage name from Decile Hub (e.g. "Added", "Reach Out to Cold Lead")
  geography: string;
  status: DealStatus;
  source: string;
  notes: string | null;
  check_size: number | null;  // USD amount, e.g. 500000
  date_added: string;         // ISO date string "YYYY-MM-DD"
  created_at: string;         // ISO datetime string
  created_by: string | null;
  decile_hub_id: number | null; // Decile Hub pipeline prospect ID — used as upsert key
}

export interface WeeklySummary {
  id: string;
  week_start: string;         // "YYYY-MM-DD"
  week_end: string;           // "YYYY-MM-DD"
  summary_text: string;
  deal_count: number;
  top_sectors: Record<string, number>;
  stage_distribution: Record<string, number>;
  generated_at: string;       // ISO datetime string
  generated_by: string | null;
}

export interface MonthlySummary {
  id: string;
  month: string;              // "YYYY-MM" e.g. "2026-02"
  month_label: string;        // "February 2026"
  summary_text: string;
  deal_count: number;
  sector_breakdown: Record<string, number>;
  geography_breakdown: Record<string, number>;
  stage_distribution: Record<string, number>;
  generated_at: string;       // ISO datetime string
  generated_by: string | null;
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  approved: boolean;
  created_at: string;         // ISO datetime string
}

// ─── Computed / UI types ──────────────────────────────────────────────────────

export interface DashboardMetrics {
  dealsThisWeek: number;
  dealsThisMonth: number;
  activePipeline: number;
  weekOverWeekChange: number; // percentage vs prior week, can be negative
  totalDeployed: number;      // sum of check_size for all deals with a non-null size (USD)
}

export interface SectorCount {
  sector: string;
  count: number;
}

export interface StageCount {
  stage: string;
  count: number;
}

export interface GeographyCount {
  geography: string;
  count: number;
}

export interface MonthlyInbound {
  month: string; // e.g. "Jan '25"
  count: number;
}

/** Pre-aggregated snapshot used by the PDF export and any route that needs
 *  metrics + sector breakdown + stage breakdown in one call. */
export interface AggregatedData {
  metrics: DashboardMetrics;
  sectors: SectorCount[];
  stages: StageCount[];
  geographies: GeographyCount[];
}

// ─── CSV / Upload types ───────────────────────────────────────────────────────

/** A validated row parsed from the uploaded CSV file, ready for DB insert. */
export interface CsvDealRow {
  company_name: string;
  sector: string;
  stage: DealStage;
  geography: string;
  status: DealStatus;
  notes?: string;
  check_size?: string; // raw string from CSV; converted to number on insert
  date_added?: string; // YYYY-MM-DD
}

export interface RowError {
  row: number;
  message: string;
}

export interface ImportResult {
  success: number;
  errors: RowError[];
}

// ─── API response envelope ────────────────────────────────────────────────────

export type ApiOk<T> = { data: T; error?: never };
export type ApiErr = { data?: never; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
