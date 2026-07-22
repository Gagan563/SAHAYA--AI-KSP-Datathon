"use client";

import { useMemo, useRef, useEffect } from "react";
import { usePublicData } from "@/lib/use-public-data";

/**
 * ForecastPanel — Shows crime forecast sparklines with predicted trends.
 */

interface ForecastEntry {
  district: string;
  crime_category: string;
  historical_months: string[];
  historical_counts: number[];
  moving_average_3m: number;
  trend_slope: number;
  trend_direction: string;
  std_deviation: number;
  forecasted_periods: Array<{
    month: string;
    predicted_count: number;
    lower_bound: number;
    upper_bound: number;
  }>;
}

function Sparkline({ entry }: { entry: ForecastEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const historical = entry.historical_counts;
    const forecasted = entry.forecasted_periods.map(f => f.predicted_count);
    const allValues = [...historical, ...forecasted];
    const maxVal = Math.max(...allValues, ...entry.forecasted_periods.map(f => f.upper_bound)) * 1.1;
    const minVal = 0;

    const totalPoints = allValues.length;
    const padding = { left: 4, right: 4, top: 6, bottom: 6 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const scaleX = (i: number) => padding.left + (i / (totalPoints - 1)) * plotW;
    const scaleY = (v: number) => padding.top + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

    ctx.clearRect(0, 0, w, h);

    // Confidence band
    if (entry.forecasted_periods.length > 0) {
      ctx.fillStyle = "rgba(6, 182, 212, 0.08)";
      ctx.beginPath();
      const startIdx = historical.length;
      for (let i = 0; i < entry.forecasted_periods.length; i++) {
        const x = scaleX(startIdx + i);
        const y = scaleY(entry.forecasted_periods[i].upper_bound);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = entry.forecasted_periods.length - 1; i >= 0; i--) {
        ctx.lineTo(scaleX(startIdx + i), scaleY(entry.forecasted_periods[i].lower_bound));
      }
      ctx.closePath();
      ctx.fill();
    }

    // Divider
    if (historical.length > 0 && forecasted.length > 0) {
      const divX = scaleX(historical.length - 1);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(divX, padding.top);
      ctx.lineTo(divX, h - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Historical line
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < historical.length; i++) {
      const x = scaleX(i);
      const y = scaleY(historical[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Forecast line
    if (forecasted.length > 0) {
      const trendColor = entry.trend_direction === "Rising" ? "#ef4444" :
                         entry.trend_direction === "Declining" ? "#22c55e" : "#f59e0b";
      ctx.strokeStyle = trendColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(scaleX(historical.length - 1), scaleY(historical[historical.length - 1]));
      for (let i = 0; i < forecasted.length; i++) {
        ctx.lineTo(scaleX(historical.length + i), scaleY(forecasted[i]));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dots
    for (let i = 0; i < historical.length; i++) {
      ctx.beginPath();
      ctx.arc(scaleX(i), scaleY(historical[i]), 2, 0, Math.PI * 2);
      ctx.fillStyle = "#06b6d4";
      ctx.fill();
    }
  }, [entry]);

  const trendArrow = entry.trend_direction === "Rising" ? "↑" :
                     entry.trend_direction === "Declining" ? "↓" : "→";
  const trendColor = entry.trend_direction === "Rising" ? "text-red-400" :
                     entry.trend_direction === "Declining" ? "text-green-400" : "text-amber-400";

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--color-bg-primary)]/50 hover:bg-[var(--color-bg-primary)] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">{entry.district}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
            {entry.crime_category}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-bold ${trendColor}`}>
            {trendArrow} {entry.trend_direction}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            slope: {entry.trend_slope > 0 ? "+" : ""}{entry.trend_slope}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            MA(3): {entry.moving_average_3m}
          </span>
        </div>
      </div>
      <canvas ref={canvasRef} className="shrink-0" style={{ width: 120, height: 40 }} />
    </div>
  );
}

export function ForecastPanel() {
  const { data: forecasts, loading } = usePublicData<ForecastEntry[]>("forecast_answers.json", []);

  const sorted = useMemo(() =>
    [...forecasts].sort((a, b) => {
      if (a.trend_direction === "Rising" && b.trend_direction !== "Rising") return -1;
      if (b.trend_direction === "Rising" && a.trend_direction !== "Rising") return 1;
      return Math.abs(b.trend_slope) - Math.abs(a.trend_slope);
    }),
    [forecasts]
  );

  const rising = sorted.filter(f => f.trend_direction === "Rising").length;

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 h-64 flex items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading forecasts...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">🔮 Crime Trend Forecast</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            3-month moving average projection • {sorted.length} tracked trends
          </p>
        </div>
        {rising > 0 && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-semibold">
            {rising} rising
          </span>
        )}
      </div>

      <div className="space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar">
        {sorted.map((entry) => (
          <Sparkline key={`${entry.district}-${entry.crime_category}`} entry={entry} />
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--color-border-default)]">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
          <div className="w-4 h-[2px] bg-[#06b6d4]"></div> Historical
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
          <div className="w-4 h-[2px] border-t-2 border-dashed border-[#f59e0b]"></div> Forecast
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
          <div className="w-4 h-2 bg-[rgba(6,182,212,0.15)] rounded"></div> Confidence
        </div>
      </div>
    </div>
  );
}
