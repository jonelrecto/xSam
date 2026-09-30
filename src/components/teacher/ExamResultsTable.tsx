"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { exportExamResultsCsv, type StudentResultRow } from "@/app/actions/grading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

interface ExamResultsTableProps {
  examId: string;
  results: StudentResultRow[];
}

export function ExamResultsTable({ examId, results }: ExamResultsTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [attemptFilter, setAttemptFilter] = useState<"all" | "latest">("latest");

  // Attempt filter handling
  const filteredData = useMemo(() => {
    let data = [...results];

    if (attemptFilter === "latest") {
      const latestMap = new Map<string, StudentResultRow>();
      for (const row of data) {
        const cur = latestMap.get(row.studentId);
        if (!cur || row.attemptNo > cur.attemptNo) {
          latestMap.set(row.studentId, row);
        }
      }
      data = Array.from(latestMap.values());
    }

    if (statusFilter !== "all") {
      data = data.filter((r) => r.status === statusFilter);
    }

    return data;
  }, [results, statusFilter, attemptFilter]);

  const columns = useMemo<ColumnDef<StudentResultRow>[]>(
    () => [
      {
        accessorKey: "studentName",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-white"
          >
            Student
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-white block">{row.original.studentName}</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {row.original.studentNumber || row.original.studentEmail}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge variant={s === "submitted" ? "success" : "warning"} className="text-[10px]">
              {s === "submitted" ? "Submitted" : "In Progress"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "score",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-white"
          >
            Score & %
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => {
          const { score, maxScore, percentage, fullyGraded } = row.original;
          if (score === null || maxScore === null) {
            return <span className="text-slate-500 font-mono text-xs">—</span>;
          }
          return (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-white text-xs">
                  {score} / {maxScore}
                </span>
                <span className="text-xs text-indigo-400 font-mono font-bold">
                  ({percentage}%)
                </span>
              </div>
              {!fullyGraded && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> Pending Check
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "violationSummary",
        header: "Integrity Events",
        cell: ({ row }) => {
          const summary = row.original.violationSummary || {};
          const total = Object.values(summary).reduce((a, b) => a + Number(b), 0);
          if (total === 0) {
            return (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Clean
              </span>
            );
          }
          return (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                {total} {total === 1 ? "Event" : "Events"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "submittedAt",
        header: "Submitted",
        cell: ({ row }) => {
          const sub = row.original.submittedAt;
          if (!sub) return <span className="text-slate-500 text-xs">—</span>;
          return (
            <span className="text-xs text-slate-300 font-mono">
              {new Date(sub).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Link href={`/teacher/exams/${examId}/grading`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-400 hover:text-white">
                Grade / Review
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [examId]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  const handleDownloadCsv = async () => {
    const csvContent = await exportExamResultsCsv(examId);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `exam_${examId}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <Input
              placeholder="Search students..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-950/80 border-slate-800"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950/80 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="h-8 text-xs gap-1.5 border-slate-700 text-slate-300 hover:text-white"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          <Link href={`/teacher/exams/${examId}/grading`}>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
              Open Grading Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[10px] uppercase">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="py-3 px-4">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-800">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                    No student exam sessions found matching your filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {table.getRowModel().rows.length} of {filteredData.length} records
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 font-mono text-[11px]">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
