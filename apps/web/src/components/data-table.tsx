"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";

interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxHeight?: number;
}

export function DataTable({ headers, rows, maxHeight = 500 }: DataTableProps) {
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
      className="table-container"
      style={{
        maxHeight,
        overflow: "auto",
        borderRadius: "var(--radius-md)",
        border: "1px solid hsl(var(--border-primary))",
        background: "hsl(var(--bg-card))",
      }}
    >
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          minWidth: "100%",
          tableLayout: "fixed",
        }}
      >
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
        <tbody>
          {tableRows.map((row) => (
            <tr key={row.id}>
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
          ))}
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
