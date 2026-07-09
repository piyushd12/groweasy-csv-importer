import { Router } from "express";
import multer from "multer";
import { config } from "../config";
import {
  uploadCsv,
  extractJob,
  getJobStatus,
  streamJobProgress,
  getJobResults,
} from "../controllers/import.controller";

const router = Router();

// Configure multer for in-memory storage with size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const validMimes = [
      "text/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/csv",
      "application/octet-stream",
    ];
    const isCsvExtension = file.originalname.toLowerCase().endsWith(".csv");

    if (validMimes.includes(file.mimetype) || isCsvExtension) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are accepted"));
    }
  },
});

// Routes
router.post("/upload", upload.single("file"), uploadCsv);
router.post("/:jobId/extract", extractJob);
router.get("/:jobId/status", getJobStatus);
router.get("/:jobId/stream", streamJobProgress);
router.get("/:jobId/results", getJobResults);

export default router;
