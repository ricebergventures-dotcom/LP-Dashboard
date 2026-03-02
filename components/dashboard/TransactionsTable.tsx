import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatDate, formatStage, formatCheckSize } from "@/utils/formatters";
import type { Deal, DealStatus } from "@/types";

interface TransactionsTableProps {
  deals: Deal[];
}

const STATUS_VARIANT: Record<DealStatus, "active" | "passed" | "diligence"> = {
  active: "active",
  passed: "passed",
  diligence: "diligence",
};

export function TransactionsTable({ deals }: TransactionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {deals.length === 0 ? (
          <EmptyState label="No deals yet. Upload a CSV to get started." height="h-32" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Geography</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Check Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium text-foreground">
                    {deal.company_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {deal.sector}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatStage(deal.stage)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {deal.geography}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[deal.status]}>
                      {deal.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular text-xs text-muted-foreground">
                    {formatDate(deal.date_added)}
                  </TableCell>
                  <TableCell className="tabular text-xs text-muted-foreground text-right">
                    {formatCheckSize(deal.check_size)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function TransactionsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-4 space-y-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
