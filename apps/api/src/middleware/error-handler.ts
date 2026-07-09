import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import type { ApiError } from "@groweasy/shared";
import { MulterError } from "multer";

/**
 * Centralized error-handling middleware.
 * Returns consistent JSON error shapes with proper HTTP status codes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(
    { error: err.message, stack: err.stack },
    "Unhandled error",
  );

  // Handle multer errors
  if (err instanceof MulterError) {
    const statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Please upload a smaller CSV file."
        : `Upload error: ${err.message}`;

    const body: ApiError = {
      error: err.code,
      message,
      statusCode,
    };
    res.status(statusCode).json(body);
    return;
  }

  // Handle multer file filter errors
  if (err.message === "Only CSV files are accepted") {
    const body: ApiError = {
      error: "INVALID_FILE_TYPE",
      message: err.message,
      statusCode: 400,
    };
    res.status(400).json(body);
    return;
  }

  // Default 500
  const body: ApiError = {
    error: "INTERNAL_SERVER_ERROR",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
    statusCode: 500,
  };
  res.status(500).json(body);
}
