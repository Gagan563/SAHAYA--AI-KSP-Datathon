"use client";

import { useState } from "react";
import {
  Database,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  Clock,
  Brain,
  ArrowRight,
} from "lucide-react";
import type { ChatResponse } from "@/lib/mock-data";

interface ExplainabilityPanelProps {
  response: ChatResponse;
}

export function ExplainabilityPanel({ response }: ExplainabilityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const { source, type, data, reasoning } = response;

  if (!source && !reasoning) return null;

  const isDatabase = source?.type === "database";
  const isRAG = source?.type === "rag";

  return (
    <div className="mt-1 space-y-1.5">
      {/* Source Badge */}
      {source && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all duration-200 ${
            isDatabase ? "source-badge-db" : "source-badge-rag"
          }`}
        >
          {isDatabase ? (
            <>
              <Database className="w-3 h-3" />
              <CheckCircle2 className="w-3 h-3" />
              Verified from Database
              {source.verified_at && (
                <span className="opacity-70 ml-1">
                  at{" "}
                  {new Date(source.verified_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </>
          ) : (
            <>
              <BookOpen className="w-3 h-3" />
              Sources Cited ({source.documents?.length || 0})
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 ml-1" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-1" />
          )}
        </button>
      )}

      {/* "Why this answer?" Reasoning Badge */}
      {reasoning && reasoning.length > 0 && (
        <button
          onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all duration-200 ml-1.5"
          style={{
            background: "rgba(168, 85, 247, 0.1)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            color: "var(--color-accent-purple)",
          }}
        >
          <Brain className="w-3 h-3" />
          Why this answer?
          {isReasoningExpanded ? (
            <ChevronUp className="w-3 h-3 ml-0.5" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5" />
          )}
        </button>
      )}

      {/* Expanded Source Details */}
      {isExpanded && source && (
        <div className="mt-2 glass-card rounded-lg p-3 text-xs space-y-2 animate-fade-in">
          {/* Database source details */}
          {isDatabase && (
            <>
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Database className="w-3.5 h-3.5 text-[var(--color-accent-green)]" />
                <span>
                  Table: <code className="font-mono text-[var(--color-accent-cyan)]">{source.table}</code>
                </span>
              </div>
              {source.verified_at && (
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-accent-amber)]" />
                  <span>
                    Verified: {new Date(source.verified_at).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Data preview */}
              {data && (type === "fact" || type === "profile") && (
                <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]">
                  <p className="text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider text-[9px]">
                    Raw Data
                  </p>
                  <pre className="font-mono text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}

          {/* RAG source documents */}
          {isRAG && source.documents && (
            <>
              <p className="text-[var(--color-text-tertiary)] uppercase tracking-wider text-[9px]">
                Referenced Documents
              </p>
              {source.documents.map((doc) => (
                <div
                  key={doc.fir_id}
                  className="flex items-start gap-2 p-2 rounded bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--color-accent-purple)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--color-text-primary)] font-medium truncate">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="font-mono text-[var(--color-accent-cyan)] text-[10px]">
                        {doc.fir_id}
                      </span>
                      <span className="text-[var(--color-text-tertiary)]">
                        Relevance: {Math.round(doc.relevance * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div
                      className="w-8 h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden"
                      title={`${Math.round(doc.relevance * 100)}% relevant`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--color-accent-purple)]"
                        style={{ width: `${doc.relevance * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Expanded Reasoning Chain */}
      {isReasoningExpanded && reasoning && (
        <div className="mt-2 glass-card rounded-lg p-3 text-xs animate-fade-in">
          <p className="text-[var(--color-text-tertiary)] uppercase tracking-wider text-[9px] mb-2 flex items-center gap-1">
            <Brain className="w-3 h-3 text-[var(--color-accent-purple)]" />
            Reasoning Chain
          </p>
          <div className="space-y-1.5">
            {reasoning.map((step, idx) => {
              const isWarning = step.startsWith("⚠️");
              const isCrossRef = step.startsWith("Cross-reference") || step.includes("↔");
              const isMOMatch = step.includes("MO pattern match") || step.includes("Repeat pattern");

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-1.5 rounded ${
                    isWarning
                      ? "bg-[rgba(239,68,68,0.08)]"
                      : isCrossRef
                      ? "bg-[rgba(0,212,255,0.05)]"
                      : isMOMatch
                      ? "bg-[rgba(168,85,247,0.05)]"
                      : ""
                  }`}
                >
                  <ArrowRight className={`w-3 h-3 mt-0.5 shrink-0 ${
                    isWarning
                      ? "text-[var(--color-accent-red)]"
                      : isCrossRef
                      ? "text-[var(--color-accent-cyan)]"
                      : isMOMatch
                      ? "text-[var(--color-accent-purple)]"
                      : "text-[var(--color-text-tertiary)]"
                  }`} />
                  <span className={`${
                    isWarning
                      ? "text-[var(--color-accent-red)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
