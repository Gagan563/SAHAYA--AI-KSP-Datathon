"use client";

import {
  Shield,
  AlertTriangle,
  Users,
  FileText,
  Network,
  Clock,
  TrendingUp,
  Map,
} from "lucide-react";
import { HotspotCard, StatCard } from "@/components/HotspotCard";
import { TimeHeatmap } from "@/components/TimeHeatmap";
import { CorrelationChart } from "@/components/CorrelationChart";
import { ForecastPanel } from "@/components/ForecastPanel";
import { AnomalyAlerts } from "@/components/AnomalyAlerts";
import { CrimeMapWrapper } from "@/components/CrimeMapWrapper";
import { MOCK_HOTSPOTS } from "@/lib/mock-data";

export default function DashboardPage() {
  const totalCases = MOCK_HOTSPOTS.reduce((sum, h) => sum + h.count, 0);
  const risingCount = MOCK_HOTSPOTS.filter((h) => h.trend === "Rising").length;
  const sortedHotspots = [...MOCK_HOTSPOTS].sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
          <Shield className="w-7 h-7 text-[var(--color-accent-cyan)]" />
          Intelligence Dashboard
        </h1>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
          Karnataka State Police — Crime Analytics & Predictive Intelligence
        </p>
        <p className="text-[10px] font-mono text-[var(--color-text-tertiary)] mt-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Last updated: {new Date().toLocaleString("en-IN")} | Data period: 2024-2025 |
          Powered by Zoho Catalyst
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Cases"
          value={totalCases}
          icon={<FileText className="w-5 h-5 text-[var(--color-accent-cyan)]" />}
          accent="cyan"
        />
        <StatCard
          label="Rising Hotspots"
          value={risingCount}
          icon={<TrendingUp className="w-5 h-5 text-[var(--color-accent-red)]" />}
          accent="red"
          trend="⬆ Needs attention"
        />
        <StatCard
          label="Crime Rings Detected"
          value={5}
          icon={<Network className="w-5 h-5 text-[var(--color-accent-purple)]" />}
          accent="purple"
        />
        <StatCard
          label="High-Risk Suspects"
          value={8}
          icon={<AlertTriangle className="w-5 h-5 text-[var(--color-accent-amber)]" />}
          accent="amber"
        />
      </div>

      {/* ═══════════ SECTION 1: Geospatial Map ═══════════ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Map className="w-5 h-5 text-[var(--color-accent-cyan)]" />
          Geospatial Crime Hotspot Map
        </h2>
        <CrimeMapWrapper />
      </div>

      {/* ═══════════ SECTION 2: Spatiotemporal + Forecasts (side by side) ═══════════ */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <TimeHeatmap />
        <ForecastPanel />
      </div>

      {/* ═══════════ SECTION 3: Correlation + Anomalies (side by side) ═══════════ */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <CorrelationChart />
        <AnomalyAlerts />
      </div>

      {/* ═══════════ SECTION 4: Hotspot Grid ═══════════ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[var(--color-accent-amber)]" />
          Crime Hotspots by District & Category
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {sortedHotspots.slice(0, 9).map((entry, idx) => (
            <HotspotCard key={`${entry.district}-${entry.crime_category}`} entry={entry} rank={idx + 1} />
          ))}
        </div>
      </div>

      {/* ═══════════ SECTION 5: District Comparison Bar Chart ═══════════ */}
      <div className="glass-card rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--color-accent-cyan)]" />
          District Crime Comparison
        </h2>
        <div className="space-y-3">
          {(() => {
            // Aggregate by district
            const districtTotals: Record<string, number> = {};
            MOCK_HOTSPOTS.forEach((h) => {
              districtTotals[h.district] = (districtTotals[h.district] || 0) + h.count;
            });
            const maxCount = Math.max(...Object.values(districtTotals));
            const sorted = Object.entries(districtTotals).sort(([, a], [, b]) => b - a);

            return sorted.map(([district, count]) => (
              <div key={district} className="flex items-center gap-4">
                <span className="text-xs text-[var(--color-text-secondary)] w-36 truncate">
                  {district}
                </span>
                <div className="flex-1 h-3 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      background: `linear-gradient(90deg, var(--color-accent-cyan), var(--color-accent-blue))`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-[var(--color-text-primary)] w-8 text-right">
                  {count}
                </span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-[var(--color-text-tertiary)]">
        SAHAYA AI • Karnataka State Police × Zoho Datathon • Powered by Catalyst (Functions, Data Store, QuickML, Zia, AppSail, Circuits)
      </div>
    </div>
  );
}
