import express from "express";
import cors from "cors";
import { config } from "./config";
import { logger } from "./logger";
import importRoutes from "./routes/import.routes";
import { errorHandler } from "./middleware/error-handler";

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      /\.vercel\.app$/,
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));

// ─── Health Check ───────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────────────
app.use("/api/import", importRoutes);

// ─── Error Handling ─────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv },
    `🚀 GrowEasy API server running on port ${config.port}`,
  );
});

export default app;
