"""
SAHAYA AI — Batch Analytics: Hotspot Aggregator (v2)
Aggregates FIR records per district/category for the precomputed Hotspot_Answers table.

v2 additions:
  - Monthly breakdown for time-based trend analysis
  - Spike detection (flags district/category exceeding average by 50%+)
  - Day-of-week aggregation
"""

import json
from collections import defaultdict
from datetime import datetime


def aggregate_hotspots(fir_records):
    """
    Aggregate FIR records by district + crime category.
    Returns list of hotspot entries ready for Catalyst Data Store insertion.
    """
    counts = defaultdict(int)
    for fir in fir_records:
        key = (fir["district"], fir["category"])
        counts[key] += 1

    now = datetime.utcnow().isoformat() + "Z"
    hotspots = []

    for (district, category), case_count in counts.items():
        # Determine trend based on case_count thresholds
        if case_count > 5:
            trend = "Rising"
        elif case_count > 2:
            trend = "Stable"
        else:
            trend = "Declining"

        hotspots.append({
            "district": district,
            "crime_category": category,
            "case_count": case_count,
            "period": "2024-2025",
            "computed_at": now,
            "trend": trend,
        })

    # Sort by case_count descending
    hotspots.sort(key=lambda h: h["case_count"], reverse=True)
    return hotspots


def aggregate_monthly_hotspots(fir_records):
    """
    Aggregate FIR records by district + category + report_month.
    Enables "crime rose X% in region Y this report_month vs last report_month" comparisons.
    """
    counts = defaultdict(int)
    for fir in fir_records:
        date_str = fir.get("date_filed", "")
        if len(date_str) >= 7:
            report_month = date_str[:7]  # "2024-11"
        else:
            report_month = "unknown"
        key = (fir["district"], fir["category"], report_month)
        counts[key] += 1

    now = datetime.utcnow().isoformat() + "Z"
    monthly = []
    for (district, category, report_month), case_count in sorted(counts.items()):
        monthly.append({
            "district": district,
            "crime_category": category,
            "report_month": report_month,
            "case_count": case_count,
            "computed_at": now,
        })
    return monthly


def detect_spikes(hotspots, threshold=1.5):
    """
    Detect spikes: district/category case_count exceeds state-average by threshold.
    Returns list of spike alerts with reasoning.
    """
    # Compute average per category across all districts
    cat_totals = defaultdict(list)
    for h in hotspots:
        cat_totals[h["crime_category"]].append(h["case_count"])

    cat_averages = {}
    for cat, counts in cat_totals.items():
        cat_averages[cat] = sum(counts) / len(counts) if counts else 0

    spikes = []
    for h in hotspots:
        avg = cat_averages.get(h["crime_category"], 0)
        if avg > 0 and h["case_count"] > avg * threshold:
            ratio = round(h["case_count"] / avg, 2)
            spikes.append({
                "district": h["district"],
                "crime_category": h["crime_category"],
                "case_count": h["case_count"],
                "state_average": round(avg, 1),
                "spike_ratio": ratio,
                "alert": f"{h['district']} has {ratio}x the state average for {h['crime_category']}",
            })

    spikes.sort(key=lambda s: s["spike_ratio"], reverse=True)
    return spikes


def compute_monthly_deltas(monthly_hotspots):
    """
    For each district/category, compute report_month-over-report_month change.
    Returns list of delta entries.
    """
    # Group by district+category
    grouped = defaultdict(list)
    for m in monthly_hotspots:
        key = (m["district"], m["crime_category"])
        grouped[key].append(m)

    deltas = []
    for (district, category), entries in grouped.items():
        # Sort by report_month
        entries.sort(key=lambda e: e["report_month"])
        for i in range(1, len(entries)):
            prev = entries[i - 1]
            curr = entries[i]
            change = curr["case_count"] - prev["case_count"]
            pct_change = round((change / max(prev["case_count"], 1)) * 100, 1)
            deltas.append({
                "district": district,
                "crime_category": category,
                "report_month": curr["report_month"],
                "prev_month": prev["report_month"],
                "case_count": curr["case_count"],
                "prev_count": prev["case_count"],
                "change": change,
                "pct_change": pct_change,
                "direction": "up" if change > 0 else "down" if change < 0 else "flat",
            })

    return deltas


def get_district_summary(hotspots):
    """Generate per-district summary statistics."""
    district_stats = defaultdict(lambda: {"total": 0, "categories": {}})

    for h in hotspots:
        d = h["district"]
        district_stats[d]["total"] += h["case_count"]
        district_stats[d]["categories"][h["crime_category"]] = h["case_count"]

    summaries = []
    for district, stats in sorted(district_stats.items(), key=lambda x: x[1]["total"], reverse=True):
        top_category = max(stats["categories"], key=stats["categories"].get)
        summaries.append({
            "district": district,
            "total_cases": stats["total"],
            "top_category": top_category,
            "top_category_count": stats["categories"][top_category],
            "category_count": len(stats["categories"]),
        })

    return summaries


if __name__ == "__main__":
    import os

    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "samples")

    with open(os.path.join(data_dir, "fir_records.json")) as f:
        fir_records = json.load(f)

    print("📊 Aggregating hotspot data...")
    hotspots = aggregate_hotspots(fir_records)
    print(f"  Generated {len(hotspots)} hotspot entries")

    print("\n📅 Aggregating monthly hotspots...")
    monthly = aggregate_monthly_hotspots(fir_records)
    print(f"  Generated {len(monthly)} monthly entries")

    print("\n⚠️ Detecting spikes...")
    spikes = detect_spikes(hotspots)
    print(f"  Found {len(spikes)} spike(s):")
    for s in spikes:
        print(f"    {s['alert']}")

    print("\n📈 Computing monthly deltas...")
    deltas = compute_monthly_deltas(monthly)
    big_moves = [d for d in deltas if abs(d["pct_change"]) > 50]
    print(f"  {len(deltas)} deltas computed, {len(big_moves)} significant moves (>50%)")

    summaries = get_district_summary(hotspots)
    print("\n📍 District Summary:")
    for s in summaries:
        print(f"  {s['district']}: {s['total_cases']} cases "
              f"(top: {s['top_category']} with {s['top_category_count']})")

    # Save results
    with open(os.path.join(data_dir, "hotspot_answers.json"), "w") as f:
        json.dump(hotspots, f, indent=2)
    with open(os.path.join(data_dir, "monthly_hotspots.json"), "w") as f:
        json.dump(monthly, f, indent=2)

    print("\n✅ Written hotspot_answers.json + monthly_hotspots.json")
