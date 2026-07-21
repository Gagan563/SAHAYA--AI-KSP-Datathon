"use client";

import { FileText, Download, Printer, Calendar } from "lucide-react";

export default function ReportsPage() {
  const mockReports = [
    {
      id: "RPT-001",
      title: "Bengaluru Urban Crime Summary Q4 2024",
      date: "2024-12-15",
      type: "Quarterly",
      status: "Ready",
    },
    {
      id: "RPT-002",
      title: "Drug Network Analysis — Cross-District",
      date: "2024-12-10",
      type: "Intelligence",
      status: "Ready",
    },
    {
      id: "RPT-003",
      title: "Suspect Risk Assessment — Batch 12",
      date: "2024-12-08",
      type: "Assessment",
      status: "Processing",
    },
    {
      id: "RPT-004",
      title: "Monthly Crime Trend Report — November",
      date: "2024-11-30",
      type: "Monthly",
      status: "Ready",
    },
  ];

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
            <FileText className="w-7 h-7 text-[var(--color-accent-cyan)]" />
            Intelligence Reports
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            Generated reports and exportable intelligence dossiers
          </p>
        </div>
        <button className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer">
          <Printer className="w-4 h-4" />
          Generate New Report
        </button>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {mockReports.map((report) => (
          <div
            key={report.id}
            className="glass-card rounded-xl p-5 flex items-center justify-between hover:border-[var(--color-border-accent)] transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-primary)] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--color-accent-cyan)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {report.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-mono text-[var(--color-accent-cyan)]">
                    {report.id}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {report.date}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] bg-[var(--color-bg-primary)] px-2 py-0.5 rounded">
                    {report.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  report.status === "Ready"
                    ? "source-badge-db"
                    : "bg-[var(--color-accent-amber)] bg-opacity-15 text-[var(--color-accent-amber)] border border-[var(--color-accent-amber)] border-opacity-30"
                }`}
              >
                {report.status}
              </span>
              {report.status === "Ready" && (
                <button
                  className="btn-ghost px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PDF Export Note */}
      <div className="glass-card rounded-xl p-5 mt-8">
        <p className="text-xs text-[var(--color-text-tertiary)]">
          📄 PDF reports are generated using Catalyst SmartBrowz headless browser.
          Reports include chat conversation history, graph visualizations, and hotspot data.
          Export any chat session using the &quot;Save as PDF&quot; button in the chat window.
        </p>
      </div>
    </div>
  );
}
