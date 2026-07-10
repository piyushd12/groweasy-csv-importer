import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { parseCsvBuffer } from "../services/csv-parser.service";
import { runExtraction } from "../services/extraction.service";
import { createJob, getJob, emitJobEvent } from "../store";
import { logger } from "../logger";


function getStringParam(
  value: string | string[] | undefined,
  paramName: string
): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${paramName}`);
  }

  return value;
}


/**
 * POST /api/import/upload
 * Accepts multipart CSV upload, parses it server-side, returns jobId + metadata.
 */
export async function uploadCsv(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        error: "NO_FILE",
        message: "No file uploaded. Please upload a CSV file.",
        statusCode: 400,
      });
      return;
    }

    const file = req.file;

    // Validate MIME type and extension
    const validMimes = ["text/csv", "text/plain", "application/vnd.ms-excel", "application/csv"];
    const isCsvExtension = file.originalname.toLowerCase().endsWith(".csv");

    if (!validMimes.includes(file.mimetype) && !isCsvExtension) {
      res.status(400).json({
        error: "INVALID_FILE_TYPE",
        message: "Only CSV files are accepted.",
        statusCode: 400,
      });
      return;
    }

    // Parse CSV
    const parseResult = parseCsvBuffer(file.buffer);

    if (parseResult.headers.length === 0) {
      res.status(400).json({
        error: "EMPTY_CSV",
        message: "The CSV file appears to be empty or has no headers.",
        statusCode: 400,
      });
      return;
    }

    if (parseResult.rows.length === 0) {
      res.status(400).json({
        error: "NO_DATA_ROWS",
        message:
          "The CSV file has headers but no data rows.",
        statusCode: 400,
      });
      return;
    }

    // Create job
    const jobId = uuidv4();
    const job = createJob(
      jobId,
      file.originalname,
      file.size,
      parseResult.headers,
      parseResult.rows,
    );

    logger.info(
      {
        jobId,
        fileName: file.originalname,
        fileSize: file.size,
        headers: parseResult.headers.length,
        rows: parseResult.rows.length,
      },
      "CSV uploaded and parsed",
    );

    res.status(200).json({
      jobId: job.id,
      headers: job.headers,
      rowCount: job.rowCount,
      fileName: job.fileName,
      fileSize: job.fileSize,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/import/:jobId/extract
 * Triggers the AI extraction pipeline for a job.
 */
export async function extractJob(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobId = getStringParam(req.params.jobId, "jobId");
    const job = getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: "JOB_NOT_FOUND",
        message: `Job ${jobId} not found.`,
        statusCode: 404,
      });
      return;
    }

    if (job.status === "processing") {
      res.status(409).json({
        error: "JOB_IN_PROGRESS",
        message: "This job is already being processed.",
        statusCode: 409,
      });
      return;
    }

    if (job.status === "completed") {
      // Return cached results
      res.status(200).json({
        records: job.records,
        skipped: job.skipped,
        totalRows: job.rowCount,
        totalImported: job.records.length,
        totalSkipped: job.skipped.length,
      });
      return;
    }

    // Start extraction asynchronously
    // We return immediately and the client tracks progress via SSE
    logger.info({ jobId }, "Extraction triggered");

    // Reset state if re-extracting after failure
    job.records = [];
    job.skipped = [];
    job.batchesCompleted = 0;
    job.error = undefined;

    // Run extraction in background
    runExtraction(jobId).catch((error) => {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      logger.error({ jobId, error: errorMsg }, "Extraction pipeline failed");
      job.status = "failed";
      job.error = errorMsg;
      emitJobEvent(jobId, "progress", {
        type: "job_error",
        batchesCompleted: job.batchesCompleted,
        totalBatches: job.totalBatches,
        error: errorMsg,
      });
    });

    res.status(202).json({
      jobId,
      message: "Extraction started. Connect to SSE endpoint for progress updates.",
      statusEndpoint: `/api/import/${jobId}/stream`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/import/:jobId/status
 * Returns current job status (polling fallback).
 */
export async function getJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobId = getStringParam(req.params.jobId, "jobId");
    const job = getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: "JOB_NOT_FOUND",
        message: `Job ${jobId} not found.`,
        statusCode: 404,
      });
      return;
    }

    res.status(200).json({
      jobId: job.id,
      status: job.status,
      batchesCompleted: job.batchesCompleted,
      totalBatches: job.totalBatches,
      totalRows: job.rowCount,
      error: job.error,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/import/:jobId/stream
 * Server-Sent Events endpoint for real-time progress updates.
 */
export async function streamJobProgress(
  req: Request,
  res: Response,
): Promise<void> {
  const jobId = getStringParam(req.params.jobId, "jobId");
  const job = getJob(jobId);

  if (!job) {
    res.status(404).json({
      error: "JOB_NOT_FOUND",
      message: `Job ${jobId} not found.`,
      statusCode: 404,
    });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send initial status
  const initialData = JSON.stringify({
    type: "connected",
    jobId: job.id,
    status: job.status,
    batchesCompleted: job.batchesCompleted,
    totalBatches: job.totalBatches,
  });
  res.write(`event: progress\ndata: ${initialData}\n\n`);

  // If already completed, send final results and close
  if (job.status === "completed") {
    const completeData = JSON.stringify({
      type: "job_complete",
      batchesCompleted: job.totalBatches,
      totalBatches: job.totalBatches,
    });
    res.write(`event: progress\ndata: ${completeData}\n\n`);
    res.end();
    return;
  }

  // Register SSE listener
  const listener = (payload: string) => {
    res.write(payload);
  };

  job.listeners.add(listener);

  // Keep-alive ping every 15s
  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(keepAlive);
    job.listeners.delete(listener);
    logger.info({ jobId }, "SSE client disconnected");
  });
}

/**
 * GET /api/import/:jobId/results
 * Returns the final extraction results for a completed job.
 */
export async function getJobResults(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobId = getStringParam(req.params.jobId, "jobId");
    const job = getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: "JOB_NOT_FOUND",
        message: `Job ${jobId} not found.`,
        statusCode: 404,
      });
      return;
    }

    if (job.status !== "completed") {
      res.status(409).json({
        error: "JOB_NOT_COMPLETE",
        message: `Job is currently ${job.status}. Results are only available after completion.`,
        statusCode: 409,
      });
      return;
    }

    res.status(200).json({
      records: job.records,
      skipped: job.skipped,
      totalRows: job.rowCount,
      totalImported: job.records.length,
      totalSkipped: job.skipped.length,
    });
  } catch (error) {
    next(error);
  }
}
