"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { usePublicData } from "@/lib/use-public-data";

/**
 * Socio-Economic Correlation Scatter Plot
 * X-axis: Urbanization % (or literacy, unemployment)
 * Y-axis: Crime rate per 100K population
 */

interface DataPoint {
  district: string;
  x: number;
  y: number;
  totalCrimes: number;
  population: number;
}

type MetricKey = "urbanization_pct" | "literacy_rate" | "unemployment_rate" | "density_per_sq_km";

const METRIC_LABELS: Record<MetricKey, string> = {
  urbanization_pct: "Urbanization %",
  literacy_rate: "Literacy Rate %",
  unemployment_rate: "Unemployment %",
  density_per_sq_km: "Pop. Density /km²",
};

function pearsonCorrelation(data: DataPoint[]): number {
  const n = data.length;
  if (n < 3) return 0;
  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const sumY2 = data.reduce((s, d) => s + d.y * d.y, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

export function CorrelationChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metric, setMetric] = useState<MetricKey>("urbanization_pct");
  const { data: demographics, loading: loadingDemo } = usePublicData<any[]>("karnataka_districts.json", []);
  const { data: hotspotData, loading: loadingHotspot } = usePublicData<any[]>("hotspot_answers.json", []);

  const loading = loadingDemo || loadingHotspot;

  const { dataPoints, r, insight } = useMemo(() => {
    if (!demographics.length || !hotspotData.length) return { dataPoints: [], r: 0, insight: "" };

    const crimeTotals: Record<string, number> = {};
    for (const h of hotspotData) {
      crimeTotals[h.district] = (crimeTotals[h.district] || 0) + h.count;
    }

    const points: DataPoint[] = demographics
      .filter((d: any) => crimeTotals[d.district] !== undefined)
      .map((d: any) => ({
        district: d.district,
        x: d[metric],
        y: (crimeTotals[d.district] / d.population) * 100000,
        totalCrimes: crimeTotals[d.district],
        population: d.population,
      }));

    const rVal = pearsonCorrelation(points);

    let insightText = "";
    const absR = Math.abs(rVal);
    const direction = rVal > 0 ? "positive" : "negative";
    if (absR > 0.7) {
      insightText = `Strong ${direction} correlation (r=${rVal.toFixed(2)}). Districts with higher ${METRIC_LABELS[metric].toLowerCase()} show ${rVal > 0 ? "significantly more" : "fewer"} crimes per capita.`;
    } else if (absR > 0.4) {
      insightText = `Moderate ${direction} correlation (r=${rVal.toFixed(2)}). ${METRIC_LABELS[metric]} has a noticeable influence on crime rates.`;
    } else {
      insightText = `Weak correlation (r=${rVal.toFixed(2)}). ${METRIC_LABELS[metric]} alone doesn't strongly predict crime rate in this dataset.`;
    }

    return { dataPoints: points, r: rVal, insight: insightText };
  }, [demographics, hotspotData, metric]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dataPoints.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 40, left: 55 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);

    const xMin = Math.min(...dataPoints.map(d => d.x)) * 0.9;
    const xMax = Math.max(...dataPoints.map(d => d.x)) * 1.1;
    const yMin = 0;
    const yMax = Math.max(...dataPoints.map(d => d.y)) * 1.2;

    const scaleX = (v: number) => padding.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const scaleY = (v: number) => padding.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    // Grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Trend line
    if (dataPoints.length >= 2) {
      const n = dataPoints.length;
      const meanX = dataPoints.reduce((s, d) => s + d.x, 0) / n;
      const meanY = dataPoints.reduce((s, d) => s + d.y, 0) / n;
      const slope = dataPoints.reduce((s, d) => s + (d.x - meanX) * (d.y - meanY), 0) /
                    dataPoints.reduce((s, d) => s + (d.x - meanX) ** 2, 0);
      const intercept = meanY - slope * meanX;

      ctx.strokeStyle = r > 0 ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(scaleX(xMin), scaleY(slope * xMin + intercept));
      ctx.lineTo(scaleX(xMax), scaleY(slope * xMax + intercept));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Data points
    for (const dp of dataPoints) {
      const cx = scaleX(dp.x);
      const cy = scaleY(dp.y);
      const radius = 5 + (dp.totalCrimes / Math.max(...dataPoints.map(d => d.totalCrimes))) * 10;

      ctx.beginPath();
      ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(6, 182, 212, 0.8)";
      ctx.fill();
      ctx.strokeStyle = "rgba(6, 182, 212, 1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(dp.district.split(" ")[0], cx, cy - radius - 4);
    }

    // Axes
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(METRIC_LABELS[metric], w / 2, h - 8);

    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Crimes per 100K", 0, 0);
    ctx.restore();

    ctx.fillStyle = "#475569";
    ctx.font = "9px system-ui";
    for (let i = 0; i <= 4; i++) {
      const xVal = xMin + ((xMax - xMin) / 4) * i;
      const yVal = yMin + ((yMax - yMin) / 4) * i;
      ctx.textAlign = "center";
      ctx.fillText(xVal.toFixed(0), scaleX(xVal), h - padding.bottom + 14);
      ctx.textAlign = "right";
      ctx.fillText(yVal.toFixed(0), padding.left - 6, scaleY(yVal) + 3);
    }
  }, [dataPoints, metric, r]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 h-96 flex items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading correlation data...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            📊 Socio-Economic Correlation
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Crime rate vs. demographic indicators
          </p>
        </div>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
          className="text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border-default)] rounded-md px-2 py-1 text-[var(--color-text-primary)] cursor-pointer"
        >
          {Object.entries(METRIC_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
          Math.abs(r) > 0.7 ? "bg-red-500/20 text-red-400" :
          Math.abs(r) > 0.4 ? "bg-amber-500/20 text-amber-400" :
          "bg-slate-500/20 text-slate-400"
        }`}>
          r = {r.toFixed(3)}
        </div>
        <span className="text-[11px] text-[var(--color-text-muted)]">{insight}</span>
      </div>

      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ height: 280 }} />
    </div>
  );
}
