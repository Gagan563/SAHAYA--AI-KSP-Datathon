"""
SAHAYA AI -- Batch Analytics: Crime Forecaster
Computes 3-report_month moving average forecasts per district/category.
Also computes simple linear trend extrapolation with confidence bands.

Output: forecast_answers.json, anomaly_alerts.json
"""

import json
import os
import math
from collections import defaultdict
from datetime import datetime


def _month_to_ordinal(month_str):
    """Convert 'YYYY-MM' to an integer ordinal (months since epoch).
    Ensures regression is fitted against calendar months, not observation
    positions (Issue 3)."""
    year, report_month = map(int, month_str.split("-"))
    return year * 12 + (report_month - 1)


def compute_forecasts(monthly_hotspots, periods_ahead=3):
    """
    For each district/category, compute:
    - 3-report_month moving average
    - Linear trend (slope + intercept) fitted against calendar months
    - Forecast for next `periods_ahead` months
    - Confidence interval (+-1 std dev)
    """
    # Group by district + category
    grouped = defaultdict(list)
    for m in monthly_hotspots:
        key = (m["district"], m["crime_category"])
        grouped[key].append(m)

    forecasts = []
    for (district, category), entries in grouped.items():
        # Sort by report_month
        entries.sort(key=lambda e: e["report_month"])
        counts = [e["case_count"] for e in entries]
        months = [e["report_month"] for e in entries]

        if len(counts) < 2:
            continue

        # 3-report_month moving average (or whatever we have)
        window = min(3, len(counts))
        ma = sum(counts[-window:]) / window

        # Issue 3: Fit against calendar-report_month ordinals, not positions
        x_vals = [_month_to_ordinal(m) for m in months]
        n = len(counts)
        x_mean = sum(x_vals) / n
        y_mean = sum(counts) / n

        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, counts))
        denominator = sum((x - x_mean) ** 2 for x in x_vals)

        if denominator == 0:
            slope = 0
            intercept = y_mean
        else:
            slope = numerator / denominator
            intercept = y_mean - slope * x_mean

        # Standard deviation of residuals
        residuals = [counts[i] - (slope * x_vals[i] + intercept) for i in range(n)]
        std_dev = math.sqrt(sum(r ** 2 for r in residuals) / max(n - 2, 1))

        # Forecast next periods
        predicted = []
        last_month = months[-1]
        last_ordinal = _month_to_ordinal(last_month)
        for p in range(1, periods_ahead + 1):
            x_future = last_ordinal + p
            y_pred = max(0, round(slope * x_future + intercept, 1))
            y_lower = max(0, round(y_pred - std_dev, 1))
            y_upper = round(y_pred + std_dev, 1)

            # Compute future report_month string
            future_year = x_future // 12
            future_month_num = (x_future % 12) + 1
            future_month = f"{future_year}-{str(future_month_num).zfill(2)}"

            predicted.append({
                "report_month": future_month,
                "predicted_count": y_pred,
                "lower_bound": y_lower,
                "upper_bound": y_upper,
            })

        # Trend direction (slope is now per calendar report_month)
        if slope > 0.3:
            trend = "Rising"
        elif slope < -0.3:
            trend = "Declining"
        else:
            trend = "Stable"

        forecasts.append({
            "district": district,
            "crime_category": category,
            "historical_months": months,
            "historical_counts": counts,
            "moving_average_3m": round(ma, 1),
            "trend_slope": round(slope, 3),
            "trend_direction": trend,
            "std_deviation": round(std_dev, 2),
            "forecasted_periods": predicted,
            "computed_at": datetime.utcnow().isoformat() + "Z",
        })

    # Sort by absolute slope (biggest movers first)
    forecasts.sort(key=lambda f: abs(f["trend_slope"]), reverse=True)
    return forecasts


def detect_anomalies_zscore(monthly_hotspots, threshold=2.0):
    """
    Z-score anomaly detection: flag months where a district/category's case_count
    exceeds mu + threshold * sigma.

    Issue 1 fix: Leave-one-out -- exclude the candidate report_month from the
    baseline statistics so the extreme value doesn't inflate mean/stddev.
    """
    grouped = defaultdict(list)
    for m in monthly_hotspots:
        key = (m["district"], m["crime_category"])
        grouped[key].append(m)

    anomalies = []
    for (district, category), entries in grouped.items():
        counts = [e["case_count"] for e in entries]
        if len(counts) < 4:
            # Need at least 4 data points for leave-one-out to be meaningful
            continue

        for idx, entry in enumerate(entries):
            # Issue 1: Exclude the candidate from the baseline
            baseline = counts[:idx] + counts[idx + 1:]
            n_baseline = len(baseline)

            mean = sum(baseline) / n_baseline
            variance = sum((c - mean) ** 2 for c in baseline) / n_baseline
            std = math.sqrt(variance) if variance > 0 else 0

            if std == 0:
                continue

            z = (entry["case_count"] - mean) / std
            if z > threshold:
                anomalies.append({
                    "district": district,
                    "crime_category": category,
                    "report_month": entry["report_month"],
                    "case_count": entry["case_count"],
                    "mean": round(mean, 1),
                    "std_dev": round(std, 2),
                    "z_score": round(z, 2),
                    "severity": "Critical" if z > 3 else "High" if z > 2.5 else "Elevated",
                    "alert": f"[!] {category} in {district} spiked to {entry['case_count']} in {entry['report_month']} ({round(z, 1)} sigma above normal)",
                })

    anomalies.sort(key=lambda a: a["z_score"], reverse=True)
    return anomalies


def compute_trend_for_hotspots(hotspots, monthly_hotspots):
    """
    Issue 5: Derive trend labels from one shared linear regression
    calculation, rather than using ad-hoc case_count thresholds.
    Returns hotspots list with `trend` field set from actual slope analysis.
    """
    # Build a slope lookup from monthly data
    grouped = defaultdict(list)
    for m in monthly_hotspots:
        key = (m["district"], m["crime_category"])
        grouped[key].append(m)

    slope_lookup = {}
    for (district, category), entries in grouped.items():
        entries.sort(key=lambda e: e["report_month"])
        counts = [e["case_count"] for e in entries]
        months = [e["report_month"] for e in entries]

        if len(counts) < 2:
            slope_lookup[(district, category)] = "Stable"
            continue

        x_vals = [_month_to_ordinal(m) for m in months]
        n = len(counts)
        x_mean = sum(x_vals) / n
        y_mean = sum(counts) / n

        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, counts))
        denominator = sum((x - x_mean) ** 2 for x in x_vals)

        slope = numerator / denominator if denominator != 0 else 0

        if slope > 0.3:
            slope_lookup[(district, category)] = "Rising"
        elif slope < -0.3:
            slope_lookup[(district, category)] = "Declining"
        else:
            slope_lookup[(district, category)] = "Stable"

    # Apply to hotspots
    for h in hotspots:
        key = (h["district"], h["crime_category"])
        h["trend"] = slope_lookup.get(key, "Stable")

    return hotspots


if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "samples")

    with open(os.path.join(data_dir, "monthly_hotspots.json")) as f:
        monthly = json.load(f)

    print("[FORECAST] Computing forecasts (calendar-report_month regression)...")
    forecasts = compute_forecasts(monthly, periods_ahead=3)
    print(f"  Generated {len(forecasts)} forecast entries")

    rising = [f for f in forecasts if f["trend_direction"] == "Rising"]
    declining = [f for f in forecasts if f["trend_direction"] == "Declining"]
    print(f"  Rising: {len(rising)}, Declining: {len(declining)}")

    print("\n[ANOMALY] Detecting anomalies (leave-one-out Z-score)...")
    anomalies = detect_anomalies_zscore(monthly, threshold=2.0)
    print(f"  Found {len(anomalies)} anomalies")
    for a in anomalies[:5]:
        print(f"    {a['alert']}")

    # Issue 5: Re-derive hotspot trends from shared regression
    hotspot_path = os.path.join(data_dir, "hotspot_answers.json")
    if os.path.exists(hotspot_path):
        print("\n[TREND] Updating hotspot trend labels from shared regression...")
        with open(hotspot_path) as f:
            hotspots = json.load(f)
        hotspots = compute_trend_for_hotspots(hotspots, monthly)
        with open(hotspot_path, "w") as f:
            json.dump(hotspots, f, indent=2)
        print(f"  Updated {len(hotspots)} hotspot entries with computed trends")

    with open(os.path.join(data_dir, "forecast_answers.json"), "w") as f:
        json.dump(forecasts, f, indent=2)
    print(f"\n[OK] Written forecast_answers.json")

    with open(os.path.join(data_dir, "anomaly_alerts.json"), "w") as f:
        json.dump(anomalies, f, indent=2)
    print(f"[OK] Written anomaly_alerts.json")

    # Issue 2: Publish artifacts to frontend/public/data/
    frontend_data_dir = os.path.join(
        os.path.dirname(__file__), "..", "..", "frontend", "public", "data"
    )
    os.makedirs(frontend_data_dir, exist_ok=True)
    publish_files = [
        "forecast_answers.json",
        "anomaly_alerts.json",
        "hotspot_answers.json",
    ]
    for fname in publish_files:
        src = os.path.join(data_dir, fname)
        if os.path.exists(src):
            import shutil
            shutil.copy2(src, os.path.join(frontend_data_dir, fname))
            print(f"[PUBLISH] Copied {fname} -> frontend/public/data/")
    print("\n[OK] All artifacts published to dashboard")
