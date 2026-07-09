import type { CrmRecord, SkippedRecord } from "@groweasy/shared";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  status: JobStatus;
  batchesCompleted: number;
  totalBatches: number;
  records: (CrmRecord & { sourceRowIndex: number })[];
  skipped: SkippedRecord[];
  error?: string;
  createdAt: Date;
  /** SSE listeners for progress updates */
  listeners: Set<(data: string) => void>;
}

/** In-memory job store. Acceptable for this assignment — see README for trade-offs. */
const jobs = new Map<string, Job>();

export function createJob(
  id: string,
  fileName: string,
  fileSize: number,
  headers: string[],
  rows: Record<string, string>[],
): Job {
  const job: Job = {
    id,
    fileName,
    fileSize,
    headers,
    rows,
    rowCount: rows.length,
    status: "pending",
    batchesCompleted: 0,
    totalBatches: 0,
    records: [],
    skipped: [],
    createdAt: new Date(),
    listeners: new Set(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

/** Emit an SSE event to all listeners for a job */
export function emitJobEvent(jobId: string, event: string, data: unknown): void {
  const job = jobs.get(jobId);
  if (!job) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const listener of job.listeners) {
    try {
      listener(payload);
    } catch {
      // Listener may have disconnected
      job.listeners.delete(listener);
    }
  }
}
