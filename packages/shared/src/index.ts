// ─── CRM Status Enum ───────────────────────────────────────────────
export type CrmStatus =
  | "GOOD_LEAD_FOLLOW_UP"
  | "DID_NOT_CONNECT"
  | "BAD_LEAD"
  | "SALE_DONE"
  | "";

export const VALID_CRM_STATUSES: CrmStatus[] = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
  "",
];

// ─── Data Source Enum ──────────────────────────────────────────────
export type DataSource =
  | "leads_on_demand"
  | "meridian_tower"
  | "eden_park"
  | "varah_swamy"
  | "sarjapur_plots"
  | "";

export const VALID_DATA_SOURCES: DataSource[] = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
  "",
];

// ─── CRM Record ────────────────────────────────────────────────────
export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

/** All CRM record field names in display order */
export const CRM_FIELDS: (keyof CrmRecord)[] = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];

// ─── Skipped Record ────────────────────────────────────────────────
export interface SkippedRecord {
  sourceRowIndex: number;
  reason: string;
  rawRow: Record<string, string>;
}

// ─── API Request/Response Contracts ────────────────────────────────

/** Response from POST /api/import/upload */
export interface UploadResponse {
  jobId: string;
  headers: string[];
  rowCount: number;
  fileName: string;
  fileSize: number;
}

/** Response from POST /api/import/:jobId/extract */
export interface ExtractionResponse {
  records: (CrmRecord & { sourceRowIndex: number })[];
  skipped: SkippedRecord[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

/** Response from GET /api/import/:jobId/status */
export interface JobStatusResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  batchesCompleted: number;
  totalBatches: number;
  totalRows: number;
  error?: string;
}

/** SSE event data for streaming progress */
export interface ProgressEvent {
  type: "batch_complete" | "batch_error" | "job_complete" | "job_error";
  batchesCompleted: number;
  totalBatches: number;
  batchId?: number;
  error?: string;
  /** Partial results sent with each batch_complete event */
  partialRecords?: number;
  partialSkipped?: number;
}

/** Standard API error response shape */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}
