import Papa from "papaparse";
import { z } from "zod";
import type { CsvDealRow, RowError } from "@/types";

const VALID_STAGES = [
  "pre-seed",
  "seed",
  "series-a",
  "series-b",
  "series-c",
  "growth",
] as const;

const VALID_STATUSES = ["active", "passed", "diligence"] as const;

const CsvDealRowSchema = z.object({
  company_name: z.string().min(1, "company_name is required"),
  sector: z.string().min(1, "sector is required"),
  stage: z.enum(VALID_STAGES, {
    errorMap: () => ({
      message: `stage must be one of: ${VALID_STAGES.join(", ")}`,
    }),
  }),
  geography: z.string().min(1, "geography is required"),
  status: z.enum(VALID_STATUSES, {
    errorMap: () => ({
      message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
    }),
  }),
  notes: z.string().optional(),
  check_size: z.string().optional(),
  date_added: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_added must be YYYY-MM-DD")
    .optional(),
});

// Zod infers the correct DealStage / DealStatus literals from the enums;
// this static assertion confirms the schema output is assignable to CsvDealRow.
type _AssertSchema = z.infer<typeof CsvDealRowSchema> extends CsvDealRow
  ? true
  : never;
const _assert: _AssertSchema = true;
void _assert;

export interface ParsedCsv {
  valid: CsvDealRow[];
  errors: RowError[];
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const valid: CsvDealRow[] = [];
        const errors: RowError[] = [];

        results.data.forEach((raw, idx) => {
          const row = idx + 2; // 1-indexed; header is row 1
          // Normalise keys: trim whitespace, lowercase
          const normalized = Object.fromEntries(
            Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), v?.trim()])
          );
          const result = CsvDealRowSchema.safeParse(normalized);
          if (result.success) {
            valid.push(result.data);
          } else {
            const messages = result.error.errors.map((e) => e.message).join("; ");
            errors.push({ row, message: messages });
          }
        });

        resolve({ valid, errors });
      },
      error(err) {
        resolve({ valid: [], errors: [{ row: 0, message: err.message }] });
      },
    });
  });
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
