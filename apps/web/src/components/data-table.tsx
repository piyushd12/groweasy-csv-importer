"use client";

import { useMemo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxHeight?: number;
}

export function DataTable({ headers, rows, maxHeight = 500 }: DataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<ColumnDef<Record<string, string>>[]>(
    () => [
      // Row number column
      {
        id: "_rowNum",
        header: "#",
        cell: ({ row }) => (
          <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.75rem", fontWeight: 500 }}>
            {row.index + 1}
          </span>
        ),
        size: 50,
      },
      ...headers.map((header) => ({
        accessorKey: header,
        header: header,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = getValue() as string;
          return value || <span style={{ color: "hsl(var(--text-muted))" }}>—</span>;
        },
        size: Math.max(120, header.length * 10),
      })),
    ],
    [headers],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { getHeaderGroups, getRowModel } = table;
  const tableRows = getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 42,
    overscan: 20,
  });

  if (rows.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 24px",
          color: "hsl(var(--text-muted))",
        }}
      >
        <p style={{ fontSize: "1rem", fontWeight: 500 }}>No data to display</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="table-container"
      style={{
        maxHeight,
        overflow: "auto",
        borderRadius: "var(--radius-md)",
        border: "1px solid hsl(var(--border-primary))",
        background: "hsl(var(--bg-card))",
      }}
    >
      <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
        <thead>
          {getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    background: "hsl(var(--bg-elevated))",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "hsl(var(--text-secondary))",
                    padding: "12px 16px",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    borderBottom: "2px solid hsl(var(--border-primary))",
                    width: header.getSize(),
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = tableRows[virtualRow.index];
            return (
              <tr
                key={row.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "table-row",
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      padding: "10px 16px",
                      fontSize: "0.875rem",
                      color: "hsl(var(--text-primary))",
                      borderBottom: "1px solid hsl(var(--border-primary))",
                      whiteSpace: "nowrap",
                      maxWidth: 300,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Row count */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "8px 16px",
          background: "hsl(var(--bg-elevated))",
          borderTop: "1px solid hsl(var(--border-primary))",
          fontSize: "0.75rem",
          color: "hsl(var(--text-muted))",
          fontWeight: 500,
        }}
      >
        {rows.length.toLocaleString()} row{rows.length !== 1 ? "s" : ""}
        {" · "}
        {headers.length} column{headers.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
