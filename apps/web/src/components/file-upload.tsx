"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, AlertCircle, X } from "lucide-react";

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
  isUploading?: boolean;
}

export function FileUpload({ onFileAccepted, isUploading }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError.message.includes("file type")) {
          setError("Only CSV files are accepted. Please upload a .csv file.");
        } else {
          setError(firstError.message);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileAccepted(file);
      }
    },
    [onFileAccepted],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div
        {...getRootProps()}
        id="dropzone"
        style={{
          border: `2px dashed ${isDragActive ? "hsl(var(--brand-primary))" : error ? "hsl(var(--error))" : "hsl(var(--border-primary))"}`,
          borderRadius: "var(--radius-xl)",
          padding: "48px 32px",
          textAlign: "center",
          cursor: isUploading ? "wait" : "pointer",
          background: isDragActive
            ? "hsl(var(--brand-primary) / 0.05)"
            : "hsl(var(--bg-card))",
          transition: "all var(--transition-base)",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isUploading) {
            e.currentTarget.style.borderColor = "hsl(var(--brand-primary))";
            e.currentTarget.style.background = "hsl(var(--brand-primary) / 0.03)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragActive && !isUploading) {
            e.currentTarget.style.borderColor = error
              ? "hsl(var(--error))"
              : "hsl(var(--border-primary))";
            e.currentTarget.style.background = "hsl(var(--bg-card))";
          }
        }}
      >
        <input {...getInputProps()} id="file-input" />

        {selectedFile && !isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-lg)",
                background: "hsl(var(--brand-primary) / 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={28} style={{ color: "hsl(var(--brand-primary))" }} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "hsl(var(--text-primary))",
                }}
              >
                {selectedFile.name}
              </p>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "hsl(var(--text-muted))",
                  marginTop: 4,
                }}
              >
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={clearFile}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid hsl(var(--border-primary))",
                background: "transparent",
                color: "hsl(var(--text-secondary))",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 500,
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "hsl(var(--error))";
                e.currentTarget.style.color = "hsl(var(--error))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "hsl(var(--border-primary))";
                e.currentTarget.style.color = "hsl(var(--text-secondary))";
              }}
            >
              <X size={14} /> Remove
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: isDragActive
                  ? "hsl(var(--brand-primary) / 0.12)"
                  : "hsl(var(--bg-secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                transition: "all var(--transition-base)",
              }}
            >
              <Upload
                size={28}
                style={{
                  color: isDragActive
                    ? "hsl(var(--brand-primary))"
                    : "hsl(var(--text-muted))",
                  transition: "color var(--transition-base)",
                }}
              />
            </div>
            <p
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "hsl(var(--text-primary))",
                marginBottom: 8,
              }}
            >
              {isDragActive
                ? "Drop your CSV file here"
                : "Drag & drop your CSV file"}
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "hsl(var(--text-muted))",
              }}
            >
              or{" "}
              <span
                style={{
                  color: "hsl(var(--brand-primary))",
                  fontWeight: 500,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                click to browse
              </span>{" "}
              · CSV files only, up to 50 MB
            </p>
          </>
        )}

        {isUploading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              className="animate-spin"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid hsl(var(--border-primary))",
                borderTopColor: "hsl(var(--brand-primary))",
              }}
            />
            <p style={{ fontSize: "0.9rem", color: "hsl(var(--text-secondary))", fontWeight: 500 }}>
              Uploading and parsing...
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          className="animate-scale-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            marginTop: 16,
            borderRadius: "var(--radius-md)",
            background: "hsl(var(--error) / 0.08)",
            border: "1px solid hsl(var(--error) / 0.2)",
            color: "hsl(var(--error))",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
