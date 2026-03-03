import { TopBar } from "@/components/layout/TopBar";
import { CsvUploader } from "@/components/upload/CsvUploader";
import { DecileSyncButton } from "@/components/upload/DecileSyncButton";
import { EnrichButton } from "@/components/upload/EnrichButton";

export const metadata = { title: "Upload" };
export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Upload Deals" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-sm font-medium text-foreground">Import CSV</h2>
            <p className="text-sm text-muted-foreground">
              Upload a CSV file exported from Decile Hub or any deal tracking tool.
              Each row is validated before insert; invalid rows are reported without
              blocking the rest of the import.
            </p>
          </div>
          <CsvUploader />

          <div className="pt-6 border-t border-border space-y-1">
            <h2 className="text-sm font-medium text-foreground">Sync from Decile Hub</h2>
            <p className="text-sm text-muted-foreground">
              Pull new deals directly from the Decile Hub API. Only deals added
              since the last AI summary will be fetched. Existing records are
              skipped automatically.
            </p>
            <div className="pt-2">
              <DecileSyncButton />
            </div>
          </div>

          <div className="pt-6 border-t border-border space-y-1">
            <h2 className="text-sm font-medium text-foreground">Enrich Deal Data</h2>
            <p className="text-sm text-muted-foreground">
              Fill in missing sector and geography for deals that haven&apos;t been
              enriched yet. Uses Gemini AI — run this after syncing or uploading
              if the sector &amp; geography charts are empty. Processes up to 20 deals
              per run; repeat until all are enriched.
            </p>
            <div className="pt-2">
              <EnrichButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
