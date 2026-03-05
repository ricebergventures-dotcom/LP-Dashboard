// Decile Hub API integration.
// Env vars are read at request time (inside functions), not at module load,
// so the build succeeds on Vercel before runtime env vars are injected.

import type { Deal, DealStatus } from "@/types";

// ─── Env validation ────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Add it to .env.local (local) or Vercel project settings (production).`
    );
  }
  return value;
}

function getApiToken(): string { return requireEnv("DECILE_HUB_API_TOKEN"); }
function getBaseUrl(): string  { return requireEnv("DECILE_HUB_BASE_URL"); }
// Pipeline ID for the main "Deals" pipeline — override via env var if needed.
function getPipelineId(): string {
  return process.env.DECILE_HUB_PIPELINE_ID ?? "WnW1aLKE";
}

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Shape of a single pipeline prospect returned by the Decile Hub API.
 *  `name` is the linked Organization name embedded by Decile Hub (present
 *  when prospectable_type = "Organization").
 */
export interface DecileHubProspect {
  id: number;
  name: string;                  // company / org name
  created_at: string;            // ISO datetime
  updated_at: string;
  stage: {
    id: number;
    name: string;                // e.g. "Added", "Passed", "Due Diligence"
  };
  rating: number | null;
  probability: number;
  prospectable_type: string;
  prospectable_id: number;
  email: string | null;
  phone: string | null;
  assigned_name?: string;
  tag_list?: string[];           // user-defined tags (can hint at sector)
}

/** Paginated list response from Decile Hub. */
interface DecileHubListResponse {
  data: DecileHubProspect[];
  pagination: {
    total_count: number;
    current_page: number;       // 0-indexed
    total_pages: number;
  };
}

// ─── HTTP errors ───────────────────────────────────────────────────────────────

export class DecileHubError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "DecileHubError";
  }
}

// ─── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Fetches ALL deal prospects from the Decile Hub pipeline (all pages).
 * No date filtering — we always do a full sync and rely on upsert deduplication
 * so that stage/status changes in Decile Hub are reflected in the DB.
 *
 * Pagination: follows `pagination.total_pages`, requesting page=0…N-1.
 */
export async function fetchDealsFromDecileHub(): Promise<DecileHubProspect[]> {
  const all: DecileHubProspect[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const url = buildUrl(page);
    const batch = await fetchPage(url);

    totalPages = batch.pagination.total_pages;
    all.push(...batch.data);
    page++;
  }

  return all;
}

function buildUrl(page: number): string {
  const params = new URLSearchParams({
    pipeline_id: getPipelineId(),
    page: String(page),
    order_by: "created_at",
    order_direction: "desc",
  });
  return `${getBaseUrl()}/api/v1/pipeline_prospects?${params.toString()}`;
}

async function fetchPage(url: string): Promise<DecileHubListResponse> {
  let response = await callApi(url);

  // 429 — wait 60 s, retry once
  if (response.status === 429) {
    await wait(60_000);
    response = await callApi(url);
  }

  if (!response.ok) {
    const body = await safeText(response);
    if (response.status === 401) {
      throw new DecileHubError(
        "Decile Hub returned 401 Unauthorized. " +
          "Check that DECILE_HUB_API_TOKEN is correct and hasn't expired.",
        401
      );
    }
    if (response.status === 429) {
      throw new DecileHubError(
        "Decile Hub rate-limit (429) persists after 60 s retry. Try again later.",
        429
      );
    }
    throw new DecileHubError(
      `Decile Hub API error ${response.status}: ${body}`,
      response.status
    );
  }

  return response.json() as Promise<DecileHubListResponse>;
}

async function callApi(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiToken()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "(no body)";
  }
}

// ─── Status derivation ─────────────────────────────────────────────────────────

/**
 * Derives a DealStatus from the Decile Hub stage name.
 * Stage names like "Passed", "Out of Thesis" → "passed"
 * Stage names like "Due Diligence", "Diligence" → "diligence"
 * Everything else → "active"
 */
function deriveStatus(stageName: string): DealStatus {
  const lower = stageName.toLowerCase();
  if (lower.includes("pass") || lower.includes("out of thesis") || lower.includes("declined")) {
    return "passed";
  }
  if (lower.includes("diligence")) {
    return "diligence";
  }
  return "active";
}

// ─── Mapper ────────────────────────────────────────────────────────────────────

/**
 * Maps a raw Decile Hub pipeline prospect to the internal Deal shape.
 * `id`, `created_at`, and `created_by` are omitted — generated by Supabase.
 *
 * Note: Decile Hub pipeline stages represent workflow steps (e.g. "Added",
 * "Stealth Startups"), not funding rounds. We store the raw stage name and
 * derive status from it. Sector and geography are not available from the
 * pipeline_prospects endpoint — they default to "" and are enriched via Gemini.
 */
export function mapDecileHubDeal(
  raw: DecileHubProspect
): Omit<Deal, "id" | "created_at" | "created_by"> {
  return {
    company_name: raw.name,
    sector: "",
    stage: raw.stage.name,      // actual pipeline stage e.g. "Added", "Reach Out to Cold Lead"
    geography: "",
    status: deriveStatus(raw.stage.name),
    source: "Decile Hub",
    notes: null,
    check_size: null,
    date_added: raw.created_at.slice(0, 10),
  };
}
