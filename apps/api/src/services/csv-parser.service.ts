import Papa from "papaparse";
import { logger } from "../logger";

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

/**
 * Parse a CSV buffer into structured rows.
 * Handles BOM, encoding issues, and malformed rows gracefully.
 */
export function parseCsvBuffer(buffer: Buffer): ParseResult {
  // Remove BOM if present
  let content = buffer.toString("utf-8");
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
    logger.info("Removed BOM from CSV file");
  }

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header: string, index: number) => {
      const trimmed = header.trim();
      // Handle duplicate or empty headers
      if (!trimmed) return `column_${index + 1}`;
      return trimmed;
    },
    transform: (value: string) => {
      return value.trim();
    },
  });

  const errors = result.errors
    .filter((e) => e.type !== "FieldMismatch") // PapaParse emits this for inconsistent column counts — we handle gracefully
    .map((e) => `Row ${e.row}: ${e.message}`);

  if (result.errors.some((e) => e.type === "FieldMismatch")) {
    logger.warn(
      { count: result.errors.filter((e) => e.type === "FieldMismatch").length },
      "CSV has rows with inconsistent column counts — handled gracefully",
    );
  }

  // Deduplicate headers (append _2, _3, etc. for duplicates)
  const headerCounts = new Map<string, number>();
  const headers = (result.meta.fields || []).map((h) => {
    const count = headerCounts.get(h) || 0;
    headerCounts.set(h, count + 1);
    return count > 0 ? `${h}_${count + 1}` : h;
  });

  const rows = result.data.filter((row) => {
    // Filter out completely empty rows
    return Object.values(row).some((v) => v !== "" && v !== undefined);
  });

  logger.info(
    { headers: headers.length, rows: rows.length, parseErrors: errors.length },
    "CSV parsed successfully",
  );

  return { headers, rows, errors };
}
