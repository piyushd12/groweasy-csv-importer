"use client";

import { CRM_FIELDS } from "@groweasy/shared";
import { DataTable } from "./data-table";
import { Download, CheckCircle, XCircle, FileText, AlertTriangle, Filter } from "lucide-react";
import { useState, useMemo } from "react";

interface ResultsViewProps {
  records: Record<string, string>[];
  skipped: { sourceRowIndex: number; reason: string; rawRow: Record<string, string> }[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

export function ResultsView({
  records,
  skipped,
  totalRows,
  totalImported,
  totalSkipped,
}: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<"imported" | "skipped">("imported");

  // Prepare CRM table data
  const crmHeaders = [...CRM_FIELDS];
  const crmRows = useMemo(
    () =>
      records.map((r) => {
        const row: Record<string, string> = {};
        for (const field of CRM_FIELDS) {
          row[field] = (r as Record<string, string>)[field] || "";
        }
        return row;
      }),
    [records],
  );

  // Prepare skipped table data
  const skippedHeaders = useMemo(() => {
    if (skipped.length === 0) return [];
    const allKeys = new Set<string>();
    allKeys.add("Row #");
    allKeys.add("Reason");
    skipped.forEach((s) => Object.keys(s.rawRow).forEach((k) => allKeys.add(k)));
    return Array.from(allKeys);
  }, [skipped]);

  const skippedRows = useMemo(
    () =>
      skipped.map((s) => ({
        "Row #": String(s.sourceRowIndex + 1),
        Reason: s.reason,
        ...s.rawRow,
      })),
    [skipped],
  );

  // Export to CSV
  const exportCsv = () => {
    const headers = CRM_FIELDS;
    const csvContent = [
      headers.join(","),
      ...crmRows.map((row) =>
        headers
          .map((h) => {
            const val = row[h] || "";
            // Escape quotes and wrap in quotes if needed
            if (val.includes(",") || val.includes('"') || val.includes("\n")) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `groweasy-import-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <SummaryCard
          icon={<FileText size={20} />}
          label="Total Rows"
          value={totalRows}
          color="var(--info)"
        />
        <SummaryCard
          icon={<CheckCircle size={20} />}
          label="Imported"
          value={totalImported}
          color="var(--success)"
        />
        <SummaryCard
          icon={<XCircle size={20} />}
          label="Skipped"
          value={totalSkipped}
          color="var(--warning)"
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Tab buttons */}
        <div
          style={{
            display: "flex",
            borderRadius: "var(--radius-md)",
            border: "1px solid hsl(var(--border-primary))",
            overflow: "hidden",
          }}
        >
          <TabButton
            active={activeTab === "imported"}
            onClick={() => setActiveTab("imported")}
            icon={<CheckCircle size={14} />}
            label={`Imported (${totalImported})`}
          />
          <TabButton
            active={activeTab === "skipped"}
            onClick={() => setActiveTab("skipped")}
            icon={<AlertTriangle size={14} />}
            label={`Skipped (${totalSkipped})`}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Export button */}
        <button
          id="export-csv-btn"
          onClick={exportCsv}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
            border: "none",
            background: "linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-dark)))",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px hsl(var(--brand-primary) / 0.3)",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 14px hsl(var(--brand-primary) / 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px hsl(var(--brand-primary) / 0.3)";
          }}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      {activeTab === "imported" ? (
        crmRows.length > 0 ? (
          <DataTable headers={crmHeaders} rows={crmRows} maxHeight={520} />
        ) : (
          <EmptyState message="No records were successfully imported." />
        )
      ) : skippedRows.length > 0 ? (
        <DataTable headers={skippedHeaders} rows={skippedRows} maxHeight={520} />
      ) : (
        <EmptyState message="No records were skipped — everything imported successfully!" icon="success" />
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="animate-scale-in"
      style={{
        padding: "20px 24px",
        borderRadius: "var(--radius-lg)",
        background: "hsl(var(--bg-card))",
        border: "1px solid hsl(var(--border-primary))",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius-md)",
          background: `hsl(${color} / 0.1)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: `hsl(${color})`,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "hsl(var(--text-primary))",
            lineHeight: 1.2,
          }}
        >
          {value.toLocaleString()}
        </p>
        <p
          style={{
            fontSize: "0.8rem",
            color: "hsl(var(--text-muted))",
            fontWeight: 500,
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        border: "none",
        background: active ? "hsl(var(--brand-primary) / 0.1)" : "transparent",
        color: active ? "hsl(var(--brand-primary))" : "hsl(var(--text-secondary))",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all var(--transition-fast)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: "success" }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        borderRadius: "var(--radius-lg)",
        background: "hsl(var(--bg-card))",
        border: "1px solid hsl(var(--border-primary))",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background:
            icon === "success"
              ? "hsl(var(--success) / 0.1)"
              : "hsl(var(--bg-secondary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        {icon === "success" ? (
          <CheckCircle size={24} style={{ color: "hsl(var(--success))" }} />
        ) : (
          <Filter size={24} style={{ color: "hsl(var(--text-muted))" }} />
        )}
      </div>
      <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem" }}>{message}</p>
    </div>
  );
}
