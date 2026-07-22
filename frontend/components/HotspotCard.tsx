"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
  Users,
  FileText,
  MapPin,
} from "lucide-react";
import type { HotspotEntry } from "@/lib/mock-data";

interface HotspotCardProps {
  entry: HotspotEntry;
  rank?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  Theft: "🔓",
  Robbery: "🔫",
  Assault: "👊",
  Cybercrime: "💻",
  Drug: "💊",
  Murder: "🔪",
  Fraud: "💳",
  Missing: "🔍",
};

const TREND_CONFIG = {
  Rising: {
    icon: TrendingUp,
    class: "trend-rising",
    label: "Rising",
    bg: "rgba(239, 68, 68, 0.1)",
  },
  Stable: {
    icon: Minus,
    class: "trend-stable",
    label: "Stable",
    bg: "rgba(245, 158, 11, 0.1)",
  },
  Declining: {
    icon: TrendingDown,
    class: "trend-declining",
    label: "Declining",
    bg: "rgba(34, 197, 94, 0.1)",
  },
};

export function HotspotCard({ entry, rank }: HotspotCardProps) {
  const trend = TREND_CONFIG[entry.trend];
  const TrendIcon = trend.icon;
  const emoji = CATEGORY_ICONS[entry.crime_category] || "📋";

  return (
    <div className="glass-card rounded-xl p-4 hover:border-[var(--color-border-accent)] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {rank && (
            <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] bg-[var(--color-bg-primary)] w-5 h-5 rounded flex items-center justify-center">
              {rank}
            </span>
          )}
          <span className="text-lg">{emoji}</span>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {entry.crime_category}
            </p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {entry.district}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${trend.class}`}
          style={{ background: trend.bg }}
        >
          <TrendIcon className="w-3 h-3" />
          {trend.label}
        </div>
      </div>

      {/* Count + Sparkline */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
            {entry.count}
          </p>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">{entry.period}</p>
        </div>

        {/* Mini sparkline */}
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 6 }, (_, i) => {
            const height = Math.max(
              4,
              (entry.count / 15) * 32 * (0.3 + Math.random() * 0.7)
            );
            return (
              <div
                key={i}
                className="sparkline-bar w-1.5 rounded-t"
                style={{
                  height: `${height}px`,
                  background:
                    entry.trend === "Rising"
                      ? "rgba(239, 68, 68, 0.5)"
                      : entry.trend === "Declining"
                      ? "rgba(34, 197, 94, 0.5)"
                      : "rgba(245, 158, 11, 0.5)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Summary Stat Card ──

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  accent?: string;
}

export function StatCard({ label, value, icon, trend, accent = "cyan" }: StatCardProps) {
  const accentColors: Record<string, string> = {
    cyan: "var(--color-accent-cyan)",
    amber: "var(--color-accent-amber)",
    red: "var(--color-accent-red)",
    green: "var(--color-accent-green)",
    purple: "var(--color-accent-purple)",
  };

  return (
    <div className="glass-card rounded-xl p-5 hover:border-[var(--color-border-accent)] transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColors[accent]}15` }}
        >
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-medium text-[var(--color-accent-green)]">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
        {value}
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{label}</p>
    </div>
  );
}
