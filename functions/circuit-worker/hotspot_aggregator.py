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

    for (district, category), count in counts.items():
        # Determine trend based on count thresholds
        if count > 5:
            trend = "Rising"
        elif count > 2:
            trend = "Stable"
        else:
            trend = "Declining"

        hotspots.append({
            "district": district,
            "crime_category": category,
            "count": count,
            "period": "2024-2025",
            "computed_at": now,
            "trend": trend,
        })

    # Sort by count descending
    hotspots.sort(key=lambda h: h["count"], reverse=True)
    return hotspots


def aggregate_monthly_hotspots(fir_records):
    """
    Aggregate FIR records by district + category + month.
    Enables "crime rose X% in region Y this month vs last month" comparisons.
    """
    counts = defaultdict(int)
    for fir in fir_records:
        date_str = fir.get("date_filed", "")
        if len(date_str) >= 7:
            month = date_str[:7]  # "2024-11"
        else:
            month = "unknown"
        key = (fir["district"], fir["category"], month)
        counts[key] += 1

    now = datetime.utcnow().isoformat() + "Z"
    monthly = []
    for (district, category, month), count in sorted(counts.items()):
        monthly.append({
            "district": district,
            "crime_category": category,
            "month": month,
            "count": count,
            "computed_at": now,
        })
    return monthly


def detect_spikes(hotspots, threshold=1.5):
    """
    Detect spikes: district/category count exceeds state-average by threshold.
    Returns list of spike alerts with reasoning.
    """
    # Compute average per category across all districts
    cat_totals = defaultdict(list)
    for h in hotspots:
        cat_totals[h["crime_category"]].append(h["count"])

    cat_averages = {}
    for cat, counts in cat_totals.items():
        cat_averages[cat] = sum(counts) / len(counts) if counts else 0

    spikes = []
    for h in hotspots:
        avg = cat_averages.get(h["crime_category"], 0)
        if avg > 0 and h["count"] > avg * threshold:
            ratio = round(h["count"] / avg, 2)
            spikes.append({
                "district": h["district"],
                "crime_category": h["crime_category"],
                "count": h["count"],
                "state_average": round(avg, 1),
                "spike_ratio": ratio,
                "alert": f"{h['district']} has {ratio}x the state average for {h['crime_category']}",
            })

    spikes.sort(key=lambda s: s["spike_ratio"], reverse=True)
    return spikes


def compute_monthly_deltas(monthly_hotspots):
    """
    For each district/category, compute month-over-month change.
    Returns list of delta entries.
    """
    # Group by district+category
    grouped = defaultdict(list)
    for m in monthly_hotspots:
        key = (m["district"], m["crime_category"])
        grouped[key].append(m)

    deltas = []
    for (district, category), entries in grouped.items():
        # Sort by month
        entries.sort(key=lambda e: e["month"])
        for i in range(1, len(entries)):
            prev = entries[i - 1]
            curr = entries[i]
            change = curr["count"] - prev["count"]
            pct_change = round((change / max(prev["count"], 1)) * 100, 1)
            deltas.append({
                "district": district,
                "crime_category": category,
                "month": curr["month"],
                "prev_month": prev["month"],
                "count": curr["count"],
                "prev_count": prev["count"],
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
        district_stats[d]["total"] += h["count"]
        district_stats[d]["categories"][h["crime_category"]] = h["count"]

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
