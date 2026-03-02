// Decile Hub API integration.
// Env vars are read at request time (inside functions), not at module load,
// so the build succeeds on Vercel before runtime env vars are injected.

import type { Deal, DealStage, DealStatus } from "@/types";
import { isDealStage, isDealStatus } from "@/types";

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

// Resolved lazily at request time — not at module load / build time.
function getApiToken(): string { return requireEnv("DECILE_HUB_API_TOKEN"); }
function getBaseUrl(): string  { return requireEnv("DECILE_HUB_BASE_URL"); }

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Shape of a single deal record returned by the Decile Hub API. */
export interface DecileHubDeal {
  id: string;
  company: string;
  vertical: string;        // maps → sector
  round: string;           // maps → stage (slugified)
  region: string;          // maps → geography
  dealStatus: string;      // maps → status
  checkSize: number | null; // USD amount — null when not set
  memo: string | null;
  createdAt: string;       // ISO datetime, sliced to YYYY-MM-DD for date_added
}

/** Paginated list response from Decile Hub. */
interface DecileHubListResponse {
  data: DecileHubDeal[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
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
 * Fetches all deals from the Decile Hub API.
 *
 * @param since - If provided, only deals with createdAt >= since are returned.
 *                Uses Decile Hub's `since` query param if the API supports it,
 *                otherwise filters client-side.
 *
 * Pagination: follows `meta.totalPages`, requesting page=1…N at pageSize=100.
 * Error handling:
 *   - 401 → throws with a clear "check your token" message
 *   - 429 → waits 60 s and retries once; throws if it fails again
 *   - other non-2xx → throws with status code and message
 */
export async function fetchDealsFromDecileHub(
  since?: Date
): Promise<DecileHubDeal[]> {
  const all: DecileHubDeal[] = [];
  const PAGE_SIZE = 100;
  let page = 1;
  let totalPages = 1; // will be set from the first response

  while (page <= totalPages) {
    const url = buildUrl(page, PAGE_SIZE, since);
    const batch = await fetchPage(url);

    totalPages = batch.meta.totalPages;
    all.push(...batch.data);
    page++;
  }

  // If the API doesn't support server-side `since` filtering, apply it here.
  if (since) {
    const sinceMs = since.getTime();
    return all.filter((d) => new Date(d.createdAt).getTime() >= sinceMs);
  }

  return all;
}

function buildUrl(page: number, pageSize: number, since?: Date): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (since) {
    params.set("since", since.toISOString());
  }
  return `${getBaseUrl()}/deals?${params.toString()}`;
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
    // No caching — we want fresh data on every sync run.
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

// ─── Mapper ────────────────────────────────────────────────────────────────────

/**
 * Maps a raw Decile Hub deal record to the internal Deal shape expected by
 * the database insert. `id`, `created_at`, and `created_by` are omitted
 * because they are generated by Supabase / the API route.
 */
export function mapDecileHubDeal(
  raw: DecileHubDeal
): Omit<Deal, "id" | "created_at" | "created_by"> {
  // Slugify "Series A" → "series-a" to match DealStage union
  const rawStage = raw.round.toLowerCase().replace(/\s+/g, "-");
  const rawStatus = raw.dealStatus.toLowerCase();

  const stage: DealStage = isDealStage(rawStage) ? rawStage : "seed";
  const status: DealStatus = isDealStatus(rawStatus) ? rawStatus : "active";

  return {
    company_name: raw.company,
    sector: raw.vertical,
    stage,
    geography: raw.region,
    status,
    source: "Decile Hub",
    notes: raw.memo,
    check_size: raw.checkSize ?? null,
    date_added: raw.createdAt.slice(0, 10),
  };
}
