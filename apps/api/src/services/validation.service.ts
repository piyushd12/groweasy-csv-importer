import {
  VALID_CRM_STATUSES,
  VALID_DATA_SOURCES,
  type CrmRecord,
  type CrmStatus,
  type DataSource,
  type SkippedRecord,
} from "@groweasy/shared";
import { logger } from "../logger";

interface RawExtraction {
  records: (Partial<CrmRecord> & { sourceRowIndex: number })[];
  skipped: { sourceRowIndex: number; reason: string }[];
}

/**
 * Validate and sanitize the LLM's extraction output.
 * Never trust the model blindly — enforce all business rules in code.
 */
export function validateAndSanitize(
  rawJson: string,
  originalRows: Record<string, string>[],
  startIndex: number,
): {
  records: (CrmRecord & { sourceRowIndex: number })[];
  skipped: SkippedRecord[];
} {
  let parsed: RawExtraction;

  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    logger.error({ error, rawJsonLength: rawJson.length }, "Failed to parse LLM JSON response");
    // Return all rows as skipped
    return {
      records: [],
      skipped: originalRows.map((row, i) => ({
        sourceRowIndex: startIndex + i,
        reason: "AI extraction returned invalid JSON",
        rawRow: row,
      })),
    };
  }

  if (!parsed.records || !Array.isArray(parsed.records)) {
    parsed.records = [];
  }
  if (!parsed.skipped || !Array.isArray(parsed.skipped)) {
    parsed.skipped = [];
  }

  const validRecords: (CrmRecord & { sourceRowIndex: number })[] = [];
  const skippedRecords: SkippedRecord[] = [];

  // Process LLM-provided skipped records
  for (const skip of parsed.skipped) {
    const rowIdx =
      typeof skip.sourceRowIndex === "number" ? skip.sourceRowIndex : -1;
    const rawRow =
      rowIdx >= startIndex && rowIdx < startIndex + originalRows.length
        ? originalRows[rowIdx - startIndex]
        : {};

    skippedRecords.push({
      sourceRowIndex: rowIdx,
      reason: typeof skip.reason === "string" ? skip.reason : "Unknown reason",
      rawRow,
    });
  }

  // Process and validate each record
  for (const raw of parsed.records) {
    const record = sanitizeRecord(raw);

    // Re-check: must have email or mobile
    const hasEmail = record.email.trim() !== "";
    const hasMobile = record.mobile_without_country_code.trim() !== "";

    if (!hasEmail && !hasMobile) {
      const rowIdx =
        typeof raw.sourceRowIndex === "number" ? raw.sourceRowIndex : -1;
      const rawRow =
        rowIdx >= startIndex && rowIdx < startIndex + originalRows.length
          ? originalRows[rowIdx - startIndex]
          : {};

      skippedRecords.push({
        sourceRowIndex: rowIdx,
        reason: "Missing both email and mobile number",
        rawRow,
      });
      continue;
    }

    validRecords.push({
      ...record,
      sourceRowIndex:
        typeof raw.sourceRowIndex === "number" ? raw.sourceRowIndex : -1,
    });
  }

  logger.info(
    {
      validCount: validRecords.length,
      skippedCount: skippedRecords.length,
      startIndex,
    },
    "Batch validation complete",
  );

  return { records: validRecords, skipped: skippedRecords };
}

/**
 * Sanitize a single CRM record, enforcing enums, date formats, and field rules.
 */
function sanitizeRecord(raw: Partial<CrmRecord>): CrmRecord {
  return {
    created_at: sanitizeDate(str(raw.created_at)),
    name: sanitizeText(str(raw.name)),
    email: sanitizeText(str(raw.email)).toLowerCase(),
    country_code: sanitizeText(str(raw.country_code)),
    mobile_without_country_code: sanitizeText(
      str(raw.mobile_without_country_code),
    ),
    company: sanitizeText(str(raw.company)),
    city: sanitizeText(str(raw.city)),
    state: sanitizeText(str(raw.state)),
    country: sanitizeText(str(raw.country)),
    lead_owner: sanitizeText(str(raw.lead_owner)),
    crm_status: sanitizeEnum(str(raw.crm_status), VALID_CRM_STATUSES) as CrmStatus,
    crm_note: sanitizeText(str(raw.crm_note)),
    data_source: sanitizeEnum(
      str(raw.data_source),
      VALID_DATA_SOURCES,
    ) as DataSource,
    possession_time: sanitizeText(str(raw.possession_time)),
    description: sanitizeText(str(raw.description)),
  };
}

/** Safely coerce to string */
function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

/** Sanitize text: escape raw newlines, trim */
function sanitizeText(val: string): string {
  return val
    .replace(/\r\n/g, "\\n")
    .replace(/\r/g, "\\n")
    .replace(/\n/g, "\\n")
    .trim();
}

/** Validate a date string, returning empty string if invalid */
function sanitizeDate(val: string): string {
  if (!val.trim()) return "";

  // Try direct parse
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  // Try common fallback formats
  const fallbackFormats = [
    // DD/MM/YYYY
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/,
    // DD/MM/YY
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/,
  ];

  for (const pattern of fallbackFormats) {
    const match = val.match(pattern);
    if (match) {
      const [, day, month, year] = match;
      const fullYear = year.length === 2 ? `20${year}` : year;
      const attempt = new Date(`${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
      if (!isNaN(attempt.getTime())) {
        return attempt.toISOString();
      }
    }
  }

  logger.warn({ value: val }, "Invalid date value, blanking out");
  return "";
}

/** Validate an enum value against allowed list */
function sanitizeEnum(val: string, allowed: string[]): string {
  const trimmed = val.trim();
  if (allowed.includes(trimmed)) return trimmed;
  if (trimmed === "") return "";

  // Try case-insensitive match
  const lower = trimmed.toLowerCase();
  const match = allowed.find((a) => a.toLowerCase() === lower && a !== "");
  if (match) return match;

  logger.warn({ value: trimmed, allowed }, "Invalid enum value, blanking out");
  return "";
}
