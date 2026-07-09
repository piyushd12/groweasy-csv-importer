import type { CrmRecord, SkippedRecord } from "@groweasy/shared";
import { config } from "../config";
import { logger } from "../logger";
import { emitJobEvent, getJob } from "../store";
import { chunkRows, runWithConcurrency } from "./batching.service";
import {
  buildBatchUserPrompt,
  getExtractionSystemPrompt,
} from "./extraction-prompt";
import { callWithRetryAndFallback } from "./llm-provider.service";
import { validateAndSanitize } from "./validation.service";

export interface ExtractionResult {
  records: (CrmRecord & { sourceRowIndex: number })[];
  skipped: SkippedRecord[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

/**
 * Run the full AI extraction pipeline for a job:
 * 1. Chunk rows into batches
 * 2. Process batches with limited concurrency
 * 3. Call LLM with retry + fallback per batch
 * 4. Validate and sanitize results
 * 5. Merge all batch results
 * 6. Emit progress events via SSE
 */
export async function runExtraction(jobId: string): Promise<ExtractionResult> {
  const job = getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  const importedAt = new Date().toISOString();
  const batches = chunkRows(job.rows, config.batchSize);
  const systemPrompt = getExtractionSystemPrompt();

  // Update job state
  job.status = "processing";
  job.totalBatches = batches.length;
  job.batchesCompleted = 0;

  logger.info(
    { jobId, totalRows: job.rowCount, totalBatches: batches.length },
    "Starting extraction pipeline",
  );

  const allRecords: (CrmRecord & { sourceRowIndex: number })[] = [];
  const allSkipped: SkippedRecord[] = [];

  // Process batches with limited concurrency
  await runWithConcurrency(
    batches,
    config.batchConcurrency,
    async (batch, batchIndex) => {
      const startIndex = batchIndex * config.batchSize;
      const batchId = batchIndex + 1;

      logger.info(
        { jobId, batchId, batchSize: batch.length, startIndex },
        "Processing batch",
      );

      try {
        const userPrompt = buildBatchUserPrompt(batch, startIndex, importedAt);
        const llmResponse = await callWithRetryAndFallback(
          systemPrompt,
          userPrompt,
          batchId,
        );

        const { records, skipped } = validateAndSanitize(
          llmResponse.content,
          batch,
          startIndex,
        );

        allRecords.push(...records);
        allSkipped.push(...skipped);

        job.batchesCompleted++;
        job.records.push(...records);
        job.skipped.push(...skipped);

        // Emit SSE progress event
        emitJobEvent(jobId, "progress", {
          type: "batch_complete",
          batchId,
          batchesCompleted: job.batchesCompleted,
          totalBatches: job.totalBatches,
          partialRecords: records.length,
          partialSkipped: skipped.length,
        });

        logger.info(
          {
            jobId,
            batchId,
            records: records.length,
            skipped: skipped.length,
            provider: llmResponse.provider,
          },
          "Batch processed successfully",
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);

        logger.error(
          { jobId, batchId, error: errorMsg },
          "Batch failed after all retries",
        );

        // Mark all rows in this batch as skipped
        const failedSkipped: SkippedRecord[] = batch.map((row, i) => ({
          sourceRowIndex: startIndex + i,
          reason: "AI extraction failed after retries",
          rawRow: row,
        }));

        allSkipped.push(...failedSkipped);
        job.skipped.push(...failedSkipped);
        job.batchesCompleted++;

        emitJobEvent(jobId, "progress", {
          type: "batch_error",
          batchId,
          batchesCompleted: job.batchesCompleted,
          totalBatches: job.totalBatches,
          error: errorMsg,
        });
      }
    },
  );

  // Sort records by sourceRowIndex for consistent output
  allRecords.sort((a, b) => a.sourceRowIndex - b.sourceRowIndex);
  allSkipped.sort((a, b) => a.sourceRowIndex - b.sourceRowIndex);

  const result: ExtractionResult = {
    records: allRecords,
    skipped: allSkipped,
    totalRows: job.rowCount,
    totalImported: allRecords.length,
    totalSkipped: allSkipped.length,
  };

  // Update job final state
  job.status = "completed";
  job.records = allRecords;
  job.skipped = allSkipped;

  emitJobEvent(jobId, "progress", {
    type: "job_complete",
    batchesCompleted: job.totalBatches,
    totalBatches: job.totalBatches,
  });

  logger.info(
    {
      jobId,
      totalImported: result.totalImported,
      totalSkipped: result.totalSkipped,
      totalRows: result.totalRows,
    },
    "Extraction pipeline completed",
  );

  return result;
}
