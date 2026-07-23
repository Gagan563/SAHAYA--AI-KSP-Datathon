"use client";

import { useMemo } from "react";
import { usePublicData } from "@/lib/use-public-data";

/**
 * Time-of-Day × Day-of-Week Crime Heatmap
 * A 7×24 grid showing crime frequency patterns.
 */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getHeatColor(value: number, max: number): string {
  if (max === 0) return "rgba(30, 41, 59, 0.5)";
  const ratio = value / max;
  if (ratio === 0) return "rgba(30, 41, 59, 0.5)";
  if (ratio < 0.25) return "rgba(34, 197, 94, 0.3)";
  if (ratio < 0.5) return "rgba(34, 197, 94, 0.6)";
  if (ratio < 0.75) return "rgba(245, 158, 11, 0.7)";
  return "rgba(239, 68, 68, 0.85)";
}

function formatHour(h: number): string {
  if (h === 0) return "12A";
  if (h < 12) return `${h}A`;
  if (h === 12) return "12P";
  return `${h - 12}P`;
}

interface TimeHeatmapProps {
  categoryFilter?: string;
}

interface FIRRecord {
  category: string;
  day_of_week: string;
  hour_of_day: number;
}

export function TimeHeatmap({ categoryFilter }: TimeHeatmapProps) {
  const { data: firData, loading } = usePublicData<FIRRecord[]>("fir_records.json", []);

  const { grid, maxVal, totalCrimes, peakTime } = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let total = 0;

    for (const fir of firData) {
      if (categoryFilter && fir.category !== categoryFilter) continue;
      const dayIdx = DAYS.indexOf(fir.day_of_week);
      const hour = fir.hour_of_day;
      if (dayIdx >= 0 && hour >= 0 && hour < 24) {
        g[dayIdx][hour]++;
        total++;
      }
    }

    let max = 0;
    let peakDay = 0;
    let peakHour = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (g[d][h] > max) {
          max = g[d][h];
          peakDay = d;
          peakHour = h;
        }
      }
    }

    return {
      grid: g,
      maxVal: max,
      totalCrimes: total,
      peakTime: max > 0 ? `${DAYS[peakDay]} ${formatHour(peakHour)}-${formatHour((peakHour + 1) % 24)}` : "N/A",
    };
  }, [firData, categoryFilter]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4 h-64 flex items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading heatmap...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            ⏰ Spatiotemporal Crime Pattern
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {categoryFilter ? `${categoryFilter} incidents` : "All crime types"} • {totalCrimes} incidents
          </p>
        </div>
        {maxVal > 0 && (
          <div className="text-right">
            <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Peak Time</div>
            <div className="text-xs font-bold text-[#f59e0b]">{peakTime}</div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex ml-16 mb-1">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-[var(--color-text-muted)]">
                {h % 3 === 0 ? formatHour(h) : ""}
              </div>
            ))}
          </div>

          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-1 mb-[2px]">
              <div className="w-14 text-right text-[10px] text-[var(--color-text-muted)] pr-2 shrink-0">
                {day.slice(0, 3)}
              </div>
              <div className="flex flex-1 gap-[1px]">
                {HOURS.map((hour) => {
                  const val = grid[dayIdx][hour];
                  return (
                    <div
                      key={hour}
                      className="flex-1 rounded-[2px] transition-all hover:scale-150 hover:z-10 cursor-pointer relative group"
                      style={{
                        backgroundColor: getHeatColor(val, maxVal),
                        height: 18,
                        minWidth: 4,
                      }}
                      title={`${day} ${formatHour(hour)}: ${val} crimes`}
                    >
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#0f172a] border border-[var(--color-border-default)] rounded text-[10px] text-[var(--color-text-primary)] whitespace-nowrap z-20 shadow-xl">
                        {day} {formatHour(hour)}: <strong>{val}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 mt-2 mr-1">
            <span className="text-[9px] text-[var(--color-text-muted)]">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-[2px]"
                style={{ backgroundColor: getHeatColor(r * maxVal, maxVal) }}
              />
            ))}
            <span className="text-[9px] text-[var(--color-text-muted)]">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
