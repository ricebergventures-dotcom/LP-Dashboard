"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Deal } from "@/types";

interface UseDealsResult {
  deals: Deal[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDeals(limit?: number): UseDealsResult {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    let query = supabase
      .from("deals")
      .select("*")
      .order("date_added", { ascending: false });

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setDeals((data as Deal[]) ?? []);
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { deals, loading, error, refresh: fetch };
}
