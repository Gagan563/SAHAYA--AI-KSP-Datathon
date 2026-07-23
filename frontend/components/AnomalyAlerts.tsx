"use client";

import { usePublicData } from "@/lib/use-public-data";

/**
 * AnomalyAlerts — Visual call-outs for Z-score anomalies.
 */

interface Anomaly {
  district: string;
  crime_category: string;
  report_month: string;
  case_count: number;
  mean: number;
  std_dev: number;
  z_score: number;
  severity: "Critical" | "High" | "Elevated";
  alert: string;
}

const SEVERITY_STYLES = {
  Critical: { bg: "bg-red-500/15", border: "border-red-500/40", badge: "bg-red-500/25 text-red-400", icon: "🔴" },
  High: { bg: "bg-amber-500/10", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-400", icon: "🟡" },
  Elevated: { bg: "bg-blue-500/10", border: "border-blue-500/30", badge: "bg-blue-500/20 text-blue-400", icon: "🔵" },
};

export function AnomalyAlerts() {
  const { data: anomalies, loading } = usePublicData<Anomaly[]>("anomaly_alerts.json", []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 h-64 flex items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading anomaly data...</div>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">🔍 Anomaly Detection</h3>
        <div className="flex items-center gap-2 px-3 py-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-green-400 text-sm">✓</span>
          <span className="text-xs text-green-400">
            No statistical anomalies detected. All district/category combinations are within 2σ of their historical mean.
          </span>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
          Z-score threshold: 2.0σ • Method: per-district/category monthly deviation analysis
        </p>
      </div>
    );
  }

  const criticalCount = anomalies.filter(a => a.severity === "Critical").length;
  const highCount = anomalies.filter(a => a.severity === "High").length;

  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">🔍 Anomaly Detection</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Z-score analysis • {anomalies.length} anomalies detected
          </p>
        </div>
        <div className="flex gap-1.5">
          {criticalCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">{criticalCount} critical</span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">{highCount} high</span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
        {anomalies.map((anomaly, i) => {
          const style = SEVERITY_STYLES[anomaly.severity];
          const pctAbove = (((anomaly.case_count - anomaly.mean) / anomaly.mean) * 100).toFixed(0);

          return (
            <div key={i} className={`rounded-lg border ${style.border} ${style.bg} p-3 transition-all hover:scale-[1.01]`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span>{style.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {anomaly.crime_category} in {anomaly.district}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      {anomaly.report_month} • {anomaly.case_count} incidents ({pctAbove}% above mean of {anomaly.mean})
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${style.badge} font-bold`}>
                  {anomaly.z_score}σ
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-[9px] text-[var(--color-text-muted)] w-8">Mean</span>
                <div className="flex-1 h-1.5 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((anomaly.case_count / (anomaly.mean * 3)) * 100, 100)}%`,
                      background: anomaly.severity === "Critical" ? "#ef4444" : anomaly.severity === "High" ? "#f59e0b" : "#3b82f6",
                    }}
                  />
                </div>
                <span className="text-[9px] text-[var(--color-text-muted)] w-6 text-right">{anomaly.case_count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[var(--color-text-muted)] mt-3 pt-2 border-t border-[var(--color-border-default)]">
        Method: Z-score deviation analysis on monthly counts per district/category. Threshold: 2.0σ above historical mean.
      </p>
    </div>
  );
}
