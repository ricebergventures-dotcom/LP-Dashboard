"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCsvFile } from "@/utils/csv-parser";
import type { ImportResult, RowError } from "@/types";

export function CsvUploader() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseErrors, setParseErrors] = useState<RowError[]>([]);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setParseErrors([]);
    setFatalError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) {
      setFile(dropped);
      setResult(null);
      setParseErrors([]);
      setFatalError(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setParseErrors([]);
      setFatalError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setFatalError(null);
    setParseErrors([]);
    setResult(null);

    const { valid, errors } = await parseCsvFile(file);
    setParseErrors(errors);

    if (valid.length === 0) {
      setUploading(false);
      return;
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: valid }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data: ImportResult };
      setResult(json.data);
    } catch (err: unknown) {
      setFatalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-sm border-2 border-dashed p-10 transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border bg-card hover:bg-muted/20"
        }`}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Drop a CSV file here
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or{" "}
          <label className="cursor-pointer underline underline-offset-2 hover:text-foreground">
            browse
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        </p>
        <p className="mt-3 text-[11px] text-muted-foreground font-mono">
          Required columns: company_name, sector, stage, geography, status
        </p>
      </div>

      {/* Selected file */}
      {file && !result && (
        <div className="flex items-center justify-between rounded-sm border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void handleImport()}
              disabled={uploading}
              size="sm"
            >
              {uploading ? "Importing…" : "Import"}
            </Button>
            <Button variant="ghost" size="icon" onClick={reset} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <ErrorList
          title="Validation errors (rows skipped)"
          errors={parseErrors}
        />
      )}

      {/* Server / fatal error */}
      {fatalError && (
        <div className="flex items-start gap-2 rounded-sm border border-border bg-secondary px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-foreground">{fatalError}</p>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-sm border border-accent bg-accent/5 px-4 py-3">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm text-foreground">
              <span className="tabular font-medium">{result.success}</span>{" "}
              rows imported successfully.
            </p>
          </div>
          {result.errors.length > 0 && (
            <ErrorList
              title={`${result.errors.length} rows failed to insert`}
              errors={result.errors}
            />
          )}
          <Button variant="outline" size="sm" onClick={reset}>
            Import another file
          </Button>
        </div>
      )}

      {/* CSV format guide */}
      <CsvFormatGuide />
    </div>
  );
}

function ErrorList({ title, errors }: { title: string; errors: RowError[] }) {
  return (
    <div className="rounded-sm border border-border">
      <p className="border-b border-border px-4 py-2 text-xs font-medium text-foreground">
        {title}
      </p>
      <ul className="max-h-48 overflow-y-auto divide-y divide-border">
        {errors.map((err) => (
          <li key={err.row} className="flex items-start gap-3 px-4 py-2">
            <span className="tabular text-xs text-muted-foreground shrink-0">
              Row {err.row}
            </span>
            <span className="text-xs text-muted-foreground">
              {err.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CsvFormatGuide() {
  return (
    <div className="rounded-sm border border-border bg-muted/30 p-4">
      <p className="text-xs font-medium text-foreground mb-2">CSV format</p>
      <pre className="font-mono text-[11px] text-muted-foreground overflow-x-auto">{`company_name,sector,stage,geography,status,notes,date_added
Acme AI,Enterprise SaaS,series-a,North America,active,AI copilot for ops,2025-02-01
Widget Co,Fintech,seed,Europe,diligence,,2025-01-28`}</pre>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Valid stages: pre-seed · seed · series-a · series-b · series-c · growth<br />
        Valid statuses: active · passed · diligence
      </p>
    </div>
  );
}
