"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Header } from "@/components/header";
import { Stepper } from "@/components/stepper";
import { FileUpload } from "@/components/file-upload";
import { DataTable } from "@/components/data-table";
import { ProgressBar } from "@/components/progress-bar";
import { ResultsView } from "@/components/results-view";
import {
  uploadCsvFile,
  triggerExtraction,
  getJobResults,
  createProgressStream,
  ApiError,
} from "@/lib/api";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const STEPS = [
  { label: "Upload", description: "Select your CSV file" },
  { label: "Preview", description: "Review raw data" },
  { label: "Confirm", description: "Start AI extraction" },
  { label: "Results", description: "View CRM records" },
];

interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

interface ExtractionState {
  jobId: string;
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  batchesCompleted: number;
  totalBatches: number;
  error?: string;
  records: Record<string, string>[];
  skipped: { sourceRowIndex: number; reason: string; rawRow: Record<string, string> }[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [extraction, setExtraction] = useState<ExtractionState>({
    jobId: "",
    status: "idle",
    batchesCompleted: 0,
    totalBatches: 0,
    records: [],
    skipped: [],
    totalRows: 0,
    totalImported: 0,
    totalSkipped: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // ─── Step 1: File Selection ───────────────────────────────────────
  const handleFileAccepted = useCallback((file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setGlobalError(null);

    // Parse CSV client-side with PapaParse for preview
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (results.errors.length > 0) {
          const fatalErrors = results.errors.filter(
            (e) => e.type !== "FieldMismatch",
          );
          if (fatalErrors.length > 0 && results.data.length === 0) {
            setParseError(
              `Failed to parse CSV: ${fatalErrors[0].message}`,
            );
            return;
          }
        }

        const headers = results.meta.fields || [];
        const rows = (results.data as Record<string, string>[]).filter(
          (row) => Object.values(row).some((v) => v !== "" && v !== undefined),
        );

        if (headers.length === 0) {
          setParseError("The CSV file appears to be empty or has no headers.");
          return;
        }

        if (rows.length === 0) {
          setParseError("The CSV file has headers but no data rows.");
          return;
        }

        setParsedCsv({ headers, rows });
        setCurrentStep(2);
      },
      error: (error) => {
        setParseError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  // ─── Step 3: Confirm & Extract ────────────────────────────────────
  const handleConfirmImport = useCallback(async () => {
    if (!selectedFile) return;

    setGlobalError(null);
    setExtraction((prev) => ({ ...prev, status: "uploading" }));
    setCurrentStep(3);

    try {
      // 1. Upload to backend
      const uploadResult = await uploadCsvFile(selectedFile);

      setExtraction((prev) => ({
        ...prev,
        jobId: uploadResult.jobId,
        totalRows: uploadResult.rowCount,
        status: "processing",
      }));

      // 2. Trigger extraction
      await triggerExtraction(uploadResult.jobId);

      // 3. Connect SSE for progress
      const eventSource = createProgressStream(
        uploadResult.jobId,
        (data) => {
          setExtraction((prev) => ({
            ...prev,
            batchesCompleted: data.batchesCompleted,
            totalBatches: data.totalBatches,
          }));

          if (data.type === "job_complete") {
            // Fetch final results
            fetchResults(uploadResult.jobId);
            eventSource.close();
          }

          if (data.type === "job_error") {
            setExtraction((prev) => ({
              ...prev,
              status: "failed",
              error: data.error || "Extraction failed",
            }));
            eventSource.close();
          }
        },
        (error) => {
          // SSE connection lost — fallback to polling
          console.warn("SSE connection lost, falling back to polling:", error);
          pollForResults(uploadResult.jobId);
        },
      );

      eventSourceRef.current = eventSource;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "An unexpected error occurred";

      setExtraction((prev) => ({
        ...prev,
        status: "failed",
        error: message,
      }));
      setGlobalError(message);
    }
  }, [selectedFile]);

  const fetchResults = async (jobId: string) => {
    try {
      const results = await getJobResults(jobId);
      setExtraction((prev) => ({
        ...prev,
        status: "completed",
        records: results.records,
        skipped: results.skipped,
        totalRows: results.totalRows,
        totalImported: results.totalImported,
        totalSkipped: results.totalSkipped,
      }));
      setCurrentStep(4);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch results";
      setExtraction((prev) => ({
        ...prev,
        status: "failed",
        error: message,
      }));
    }
  };

  const pollForResults = async (jobId: string) => {
    const poll = async () => {
      try {
        const { getJobStatus: getStatus } = await import("@/lib/api");
        const status = await getStatus(jobId);

        setExtraction((prev) => ({
          ...prev,
          batchesCompleted: status.batchesCompleted,
          totalBatches: status.totalBatches,
        }));

        if (status.status === "completed") {
          await fetchResults(jobId);
        } else if (status.status === "failed") {
          setExtraction((prev) => ({
            ...prev,
            status: "failed",
            error: status.error || "Extraction failed",
          }));
        } else {
          setTimeout(poll, 1500);
        }
      } catch {
        setTimeout(poll, 3000);
      }
    };

    poll();
  };

  // ─── Reset ────────────────────────────────────────────────────────
  const handleReset = () => {
    eventSourceRef.current?.close();
    setCurrentStep(1);
    setSelectedFile(null);
    setParsedCsv(null);
    setParseError(null);
    setGlobalError(null);
    setExtraction({
      jobId: "",
      status: "idle",
      batchesCompleted: 0,
      totalBatches: 0,
      records: [],
      skipped: [],
      totalRows: 0,
      totalImported: 0,
      totalSkipped: 0,
    });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />

      <main
        style={{
          flex: 1,
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
          padding: "0 24px 48px",
        }}
      >
        {/* Stepper */}
        <Stepper currentStep={currentStep} steps={STEPS} />

        {/* Global error */}
        {globalError && currentStep < 4 && (
          <div
            className="animate-scale-in"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 20px",
              marginBottom: 24,
              borderRadius: "var(--radius-md)",
              background: "hsl(var(--error) / 0.08)",
              border: "1px solid hsl(var(--error) / 0.2)",
              color: "hsl(var(--error))",
              fontSize: "0.9rem",
              fontWeight: 500,
              maxWidth: 640,
              margin: "0 auto 24px",
            }}
          >
            <AlertCircle size={18} />
            {globalError}
          </div>
        )}

        {/* ─── Step 1: Upload ──────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="animate-slide-up">
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "hsl(var(--text-primary))",
                  marginBottom: 8,
                }}
              >
                Upload your CSV file
              </h2>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "hsl(var(--text-secondary))",
                  maxWidth: 480,
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                Import leads from Facebook, Google Ads, spreadsheets, or any CRM export.
                Our AI will intelligently map columns to your GrowEasy CRM schema.
              </p>
            </div>

            <FileUpload onFileAccepted={handleFileAccepted} />

            {parseError && (
              <div
                className="animate-scale-in"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  marginTop: 16,
                  maxWidth: 640,
                  margin: "16px auto 0",
                  borderRadius: "var(--radius-md)",
                  background: "hsl(var(--error) / 0.08)",
                  border: "1px solid hsl(var(--error) / 0.2)",
                  color: "hsl(var(--error))",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={16} />
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Preview ─────────────────────────────────────── */}
        {currentStep === 2 && parsedCsv && (
          <div className="animate-slide-up">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "hsl(var(--text-primary))",
                  }}
                >
                  Preview your data
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "hsl(var(--text-secondary))",
                    marginTop: 4,
                  }}
                >
                  Review the raw CSV data before AI processing.
                  {selectedFile && (
                    <span style={{ color: "hsl(var(--text-muted))" }}>
                      {" "}
                      · {selectedFile.name}
                    </span>
                  )}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  id="back-btn"
                  onClick={() => {
                    setCurrentStep(1);
                    setParsedCsv(null);
                    setSelectedFile(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid hsl(var(--border-primary))",
                    background: "transparent",
                    color: "hsl(var(--text-secondary))",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "hsl(var(--border-hover))";
                    e.currentTarget.style.background = "hsl(var(--bg-secondary))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "hsl(var(--border-primary))";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                <button
                  id="confirm-import-btn"
                  onClick={handleConfirmImport}
                  disabled={extraction.status === "uploading" || extraction.status === "processing"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 24px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background:
                      "linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-dark)))",
                    color: "#fff",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px hsl(var(--brand-primary) / 0.3)",
                    transition: "all var(--transition-fast)",
                    opacity:
                      extraction.status === "uploading" || extraction.status === "processing"
                        ? 0.6
                        : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (extraction.status !== "uploading" && extraction.status !== "processing") {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 14px hsl(var(--brand-primary) / 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px hsl(var(--brand-primary) / 0.3)";
                  }}
                >
                  <Sparkles size={16} /> Confirm Import
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <DataTable
              headers={parsedCsv.headers}
              rows={parsedCsv.rows}
              maxHeight={520}
            />
          </div>
        )}

        {/* ─── Step 3: Processing ──────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="animate-slide-up">
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "hsl(var(--text-primary))",
                  marginBottom: 8,
                }}
              >
                AI Extraction in Progress
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--text-secondary))",
                }}
              >
                Our AI is analyzing your CSV data and mapping it to the GrowEasy CRM schema.
              </p>
            </div>

            <ProgressBar
              batchesCompleted={extraction.batchesCompleted}
              totalBatches={extraction.totalBatches}
              status={
                extraction.status === "uploading"
                  ? "processing"
                  : extraction.status
              }
              error={extraction.error}
            />

            {extraction.status === "failed" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginTop: 24,
                }}
              >
                <button
                  onClick={handleConfirmImport}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background:
                      "linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-dark)))",
                    color: "#fff",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={14} /> Retry
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid hsl(var(--border-primary))",
                    background: "transparent",
                    color: "hsl(var(--text-secondary))",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 4: Results ─────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="animate-slide-up">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "hsl(var(--text-primary))",
                  }}
                >
                  Import Results
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "hsl(var(--text-secondary))",
                    marginTop: 4,
                  }}
                >
                  AI extraction complete. Review your normalized CRM records below.
                </p>
              </div>

              <button
                id="start-over-btn"
                onClick={handleReset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid hsl(var(--border-primary))",
                  background: "transparent",
                  color: "hsl(var(--text-secondary))",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--border-hover))";
                  e.currentTarget.style.background = "hsl(var(--bg-secondary))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--border-primary))";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <RotateCcw size={14} /> Import Another File
              </button>
            </div>

            <ResultsView
              records={extraction.records}
              skipped={extraction.skipped}
              totalRows={extraction.totalRows}
              totalImported={extraction.totalImported}
              totalSkipped={extraction.totalSkipped}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "20px 24px",
          textAlign: "center",
          borderTop: "1px solid hsl(var(--border-primary))",
          background: "hsl(var(--bg-card))",
        }}
      >
        <p
          style={{
            fontSize: "0.8rem",
            color: "hsl(var(--text-muted))",
          }}
        >
          Built with AI-powered data mapping · GrowEasy CRM © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
