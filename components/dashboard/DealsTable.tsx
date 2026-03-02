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
import { formatDate, formatStage } from "@/utils/formatters";
import type { Deal, DealStatus } from "@/types";

interface DealsTableProps {
  deals: Deal[];
}

const STATUS_VARIANT: Record<DealStatus, "active" | "passed" | "diligence"> = {
  active: "active",
  passed: "passed",
  diligence: "diligence",
};

export function DealsTable({ deals }: DealsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Deals</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {deals.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No deals yet. Upload a CSV to get started.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Geography</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="font-mono">Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">
                    {deal.company_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.sector}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatStage(deal.stage)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.geography}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[deal.status]}>
                      {deal.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDate(deal.date_added)}
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

export function DealsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
