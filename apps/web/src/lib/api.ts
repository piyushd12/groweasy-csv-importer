const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      throw new ApiError(
        response.status,
        "UNKNOWN_ERROR",
        `Request failed with status ${response.status}`,
      );
    }
    throw new ApiError(
      response.status,
      errorData.error || "UNKNOWN_ERROR",
      errorData.message || `Request failed with status ${response.status}`,
    );
  }
  return response.json();
}

/**
 * Upload a CSV file to the backend.
 */
export async function uploadCsvFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/import/upload`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<{
    jobId: string;
    headers: string[];
    rowCount: number;
    fileName: string;
    fileSize: number;
  }>(response);
}

/**
 * Trigger AI extraction for a job.
 */
export async function triggerExtraction(jobId: string) {
  const response = await fetch(`${API_URL}/api/import/${jobId}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  return handleResponse<{
    jobId: string;
    message: string;
    statusEndpoint: string;
  }>(response);
}

/**
 * Poll job status.
 */
export async function getJobStatus(jobId: string) {
  const response = await fetch(`${API_URL}/api/import/${jobId}/status`);
  return handleResponse<{
    jobId: string;
    status: string;
    batchesCompleted: number;
    totalBatches: number;
    totalRows: number;
    error?: string;
  }>(response);
}

/**
 * Get extraction results for a completed job.
 */
export async function getJobResults(jobId: string) {
  const response = await fetch(`${API_URL}/api/import/${jobId}/results`);
  return handleResponse<{
    records: Record<string, string>[];
    skipped: { sourceRowIndex: number; reason: string; rawRow: Record<string, string> }[];
    totalRows: number;
    totalImported: number;
    totalSkipped: number;
  }>(response);
}

/**
 * Create an SSE connection for real-time progress updates.
 */
export function createProgressStream(
  jobId: string,
  onProgress: (data: {
    type: string;
    batchId?: number;
    batchesCompleted: number;
    totalBatches: number;
    partialRecords?: number;
    partialSkipped?: number;
    error?: string;
  }) => void,
  onError: (error: Error) => void,
): EventSource {
  const eventSource = new EventSource(`${API_URL}/api/import/${jobId}/stream`);

  eventSource.addEventListener("progress", (event) => {
    try {
      const data = JSON.parse(event.data);
      onProgress(data);
    } catch (err) {
      console.error("Failed to parse SSE data:", err);
    }
  });

  eventSource.onerror = (event) => {
    console.error("SSE error:", event);
    onError(new Error("Connection to server lost"));
    eventSource.close();
  };

  return eventSource;
}
