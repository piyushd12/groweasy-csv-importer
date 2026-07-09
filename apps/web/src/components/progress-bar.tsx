"use client";

interface ProgressBarProps {
  batchesCompleted: number;
  totalBatches: number;
  status: string;
  error?: string;
}

export function ProgressBar({
  batchesCompleted,
  totalBatches,
  status,
  error,
}: ProgressBarProps) {
  const percentage =
    totalBatches > 0 ? Math.round((batchesCompleted / totalBatches) * 100) : 0;

  return (
    <div
      className="animate-fade-in"
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px",
        borderRadius: "var(--radius-lg)",
        background: "hsl(var(--bg-card))",
        border: "1px solid hsl(var(--border-primary))",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Status text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {status === "processing" && (
            <div
              className="animate-spin"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "2.5px solid hsl(var(--border-primary))",
                borderTopColor: "hsl(var(--brand-primary))",
              }}
            />
          )}
          <p
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "hsl(var(--text-primary))",
            }}
          >
            {status === "processing"
              ? "AI is analyzing your data..."
              : status === "completed"
                ? "Extraction complete!"
                : status === "failed"
                  ? "Extraction failed"
                  : "Preparing..."}
          </p>
        </div>
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "hsl(var(--brand-primary))",
          }}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "hsl(var(--bg-secondary))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            borderRadius: 999,
            background:
              status === "failed"
                ? "hsl(var(--error))"
                : "linear-gradient(90deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-light)))",
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow:
              status !== "failed"
                ? "0 0 12px hsl(var(--brand-primary) / 0.3)"
                : "none",
          }}
        />
      </div>

      {/* Batch info */}
      <p
        style={{
          fontSize: "0.8rem",
          color: "hsl(var(--text-muted))",
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {status === "processing"
          ? `Processing batch ${batchesCompleted + 1} of ${totalBatches}`
          : status === "completed"
            ? `All ${totalBatches} batches processed successfully`
            : `${batchesCompleted} of ${totalBatches} batches completed`}
      </p>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "hsl(var(--error) / 0.08)",
            border: "1px solid hsl(var(--error) / 0.2)",
            color: "hsl(var(--error))",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
