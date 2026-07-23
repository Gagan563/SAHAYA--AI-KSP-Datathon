"""
Inject realistic spike patterns into monthly_hotspots.json so that
the Z-score anomaly detector can find meaningful anomalies.

Problem: With only 80 FIRs across 10 districts x 8 categories x 18 months,
each monthly bucket has 1-2 cases -- too uniform for anomaly detection.

Solution: Add additional monthly entries for high-activity district/category
combos to simulate realistic crime patterns with seasonal spikes.
"""

import json
import os
from datetime import datetime

data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "samples")
monthly_path = os.path.join(data_dir, "monthly_hotspots.json")

with open(monthly_path) as f:
    monthly = json.load(f)

now = datetime.utcnow().isoformat() + "Z"

# Define realistic monthly patterns for major district/category combos
# These represent what real Karnataka crime data might look like
SPIKE_PATTERNS = [
    # Bengaluru Urban - Theft: seasonal spike in Dec (festivals) and March (year-end)
    {"district": "Bengaluru Urban", "crime_category": "Theft", "months": {
        "2024-07": 3, "2024-08": 4, "2024-09": 3, "2024-10": 5,
        "2024-11": 4, "2024-12": 9, "2025-01": 5, "2025-02": 4,
        "2025-03": 8, "2025-04": 3, "2025-05": 4, "2025-06": 3,
    }},
    # Bengaluru Urban - Cybercrime: steady rise with Q4 spike
    {"district": "Bengaluru Urban", "crime_category": "Cybercrime", "months": {
        "2024-07": 2, "2024-08": 3, "2024-09": 3, "2024-10": 4,
        "2024-11": 5, "2024-12": 7, "2025-01": 4, "2025-02": 5,
        "2025-03": 6, "2025-04": 4, "2025-05": 5, "2025-06": 4,
    }},
    # Mysuru - Drug: big spike in Aug (monsoon season patterns)
    {"district": "Mysuru", "crime_category": "Drug", "months": {
        "2024-07": 2, "2024-08": 8, "2024-09": 3, "2024-10": 2,
        "2024-11": 3, "2024-12": 2, "2025-01": 2, "2025-02": 3,
        "2025-03": 2, "2025-04": 2, "2025-05": 3, "2025-06": 2,
    }},
    # Mangaluru - Robbery: spike in Nov
    {"district": "Mangaluru", "crime_category": "Robbery", "months": {
        "2024-07": 1, "2024-08": 2, "2024-09": 2, "2024-10": 3,
        "2024-11": 7, "2024-12": 3, "2025-01": 2, "2025-02": 2,
        "2025-03": 3, "2025-04": 2, "2025-05": 2, "2025-06": 1,
    }},
    # Hubli-Dharwad - Assault: spike in Jan (New Year aftermath)
    {"district": "Hubli-Dharwad", "crime_category": "Assault", "months": {
        "2024-07": 2, "2024-08": 2, "2024-09": 3, "2024-10": 2,
        "2024-11": 3, "2024-12": 4, "2025-01": 8, "2025-02": 3,
        "2025-03": 2, "2025-04": 3, "2025-05": 2, "2025-06": 2,
    }},
    # Bengaluru Urban - Fraud: spike in Oct (festive season scams)
    {"district": "Bengaluru Urban", "crime_category": "Fraud", "months": {
        "2024-07": 2, "2024-08": 2, "2024-09": 3, "2024-10": 8,
        "2024-11": 4, "2024-12": 3, "2025-01": 2, "2025-02": 3,
        "2025-03": 3, "2025-04": 2, "2025-05": 2, "2025-06": 3,
    }},
    # Kalaburagi - Murder: general low but spike in Sep
    {"district": "Kalaburagi", "crime_category": "Murder", "months": {
        "2024-07": 1, "2024-08": 1, "2024-09": 5, "2024-10": 1,
        "2024-11": 1, "2024-12": 2, "2025-01": 1, "2025-02": 1,
        "2025-03": 1, "2025-04": 2, "2025-05": 1, "2025-06": 1,
    }},
    # Belagavi - Theft: spike in Dec
    {"district": "Belagavi", "crime_category": "Theft", "months": {
        "2024-07": 1, "2024-08": 2, "2024-09": 1, "2024-10": 2,
        "2024-11": 2, "2024-12": 6, "2025-01": 2, "2025-02": 1,
        "2025-03": 2, "2025-04": 1, "2025-05": 2, "2025-06": 1,
    }},
    # Shivamogga - Missing: spike in May (summer, runaway cases)
    {"district": "Shivamogga", "crime_category": "Missing", "months": {
        "2024-07": 1, "2024-08": 1, "2024-09": 1, "2024-10": 1,
        "2024-11": 2, "2024-12": 1, "2025-01": 1, "2025-02": 2,
        "2025-03": 2, "2025-04": 3, "2025-05": 7, "2025-06": 2,
    }},
    # Mysuru - Theft: gradual rise
    {"district": "Mysuru", "crime_category": "Theft", "months": {
        "2024-07": 2, "2024-08": 2, "2024-09": 3, "2024-10": 3,
        "2024-11": 4, "2024-12": 5, "2025-01": 4, "2025-02": 5,
        "2025-03": 5, "2025-04": 4, "2025-05": 6, "2025-06": 5,
    }},
]

# Build an index of existing entries to avoid duplicates
existing = {}
for entry in monthly:
    key = (entry["district"], entry["crime_category"], entry["report_month"])
    existing[key] = entry

# Insert/update entries
added = 0
updated = 0
for pattern in SPIKE_PATTERNS:
    for month, count in pattern["months"].items():
        key = (pattern["district"], pattern["crime_category"], month)
        if key in existing:
            existing[key]["case_count"] = count
            updated += 1
        else:
            new_entry = {
                "district": pattern["district"],
                "crime_category": pattern["crime_category"],
                "report_month": month,
                "case_count": count,
                "computed_at": now,
            }
            monthly.append(new_entry)
            existing[key] = new_entry
            added += 1

# Sort by district, category, month
monthly.sort(key=lambda x: (x["district"], x["crime_category"], x["report_month"]))

with open(monthly_path, "w") as f:
    json.dump(monthly, f, indent=2)

print(f"Done: {added} added, {updated} updated, {len(monthly)} total entries")
print(f"   Now {len(SPIKE_PATTERNS)} district/category combos have 12 months of data")
print(f"   Spikes injected for realistic anomaly detection")
