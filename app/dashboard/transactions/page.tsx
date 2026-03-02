import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase-server";
import { TopBar } from "@/components/layout/TopBar";
import { AllTransactionsTable, AllTransactionsTableSkeleton } from "@/components/dashboard/AllTransactionsTable";
import type { Deal } from "@/types";

export const metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

async function TransactionsContent() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("deals")
    .select("*")
    .order("date_added", { ascending: false });

  const deals = (data as Deal[]) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Transactions" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <AllTransactionsTable deals={deals} />
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full overflow-hidden">
          <TopBar title="Transactions" />
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <AllTransactionsTableSkeleton />
            </div>
          </div>
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
