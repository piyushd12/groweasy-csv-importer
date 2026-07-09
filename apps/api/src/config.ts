import dotenv from "dotenv";
import path from "path";

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  // Server
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10),
  logLevel: process.env.LOG_LEVEL || "info",

  // AI Providers
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model:
      process.env.OPENROUTER_MODEL ||
      "nvidia/nemotron-3-super-120b-a12b:free",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  },

  // Extraction
  batchSize: parseInt(process.env.BATCH_SIZE || "10", 10),
  batchConcurrency: parseInt(process.env.BATCH_CONCURRENCY || "2", 10),

  // Retry
  maxRetries: 2,
  retryDelays: [500, 1500], // ms — exponential backoff
} as const;
