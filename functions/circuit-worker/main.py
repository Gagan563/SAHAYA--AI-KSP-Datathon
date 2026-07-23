"""
SAHAYA AI — Batch Analytics: Main Entry Point (v2)
Orchestrates the full analytics pipeline:
1. Load data (from Catalyst Data Store or local JSON files)
2. Run graph analysis (NetworkX)
3. Aggregate hotspot data (district + monthly)
4. Detect spikes / emerging trends
5. Compute risk scores
6. Write results back

For Catalyst deployment, this runs inside AppSail (Docker container)
and is triggered by a Catalyst Circuit on schedule.
"""

import json
import os
import sys
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

from graph_analysis import build_suspect_graph, detect_crime_rings, build_graph_json
from hotspot_aggregator import (
    aggregate_hotspots,
    aggregate_monthly_hotspots,
    detect_spikes,
    compute_monthly_deltas,
    get_district_summary,
)
from risk_scorer import compute_risk_scores


def load_data(data_dir):
    """Load data from local JSON files (mock mode)."""
    with open(os.path.join(data_dir, "fir_records.json")) as f:
        fir_records = json.load(f)
    with open(os.path.join(data_dir, "suspects.json")) as f:
        suspects = json.load(f)
    with open(os.path.join(data_dir, "fir_suspect_mapping.json")) as f:
        mappings = json.load(f)
    return fir_records, suspects, mappings


def save_results(data_dir, hotspots, monthly_hotspots, spikes, clusters, scored_suspects, graph_json):
    """Save results to local JSON files."""
    outputs = {
        "hotspot_answers.json": hotspots,
        "monthly_hotspots.json": monthly_hotspots,
        "spike_alerts.json": spikes,
        "suspect_clusters.json": clusters,
        "suspects_scored.json": scored_suspects,
        "graph_data.json": graph_json,
    }
    for filename, data in outputs.items():
        filepath = os.path.join(data_dir, filename)
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
        print(f"  📁 Saved {filepath}")


def run_pipeline(data_dir):
    """Run the full analytics pipeline."""
    start = datetime.utcnow()
    print("=" * 60)
    print("🚀 SAHAYA AI — Batch Analytics Pipeline (v2)")
    print(f"   Started at: {start.isoformat()}Z")
    print("=" * 60)

    # Step 1: Load data
    print("\n📥 Loading data...")
    fir_records, suspects, mappings = load_data(data_dir)
    print(f"  FIRs: {len(fir_records)}, Suspects: {len(suspects)}, Mappings: {len(mappings)}")

    # Step 2: Graph analysis
    print("\n🔗 Running graph analysis...")
    G = build_suspect_graph(fir_records, mappings)
    print(f"  Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    clusters = detect_crime_rings(G, min_size=2)
    print(f"  Detected {len(clusters)} crime rings")

    suspects_lookup = {s["suspect_id"]: s for s in suspects}
    graph_json = build_graph_json(G, suspects_lookup)

    # Step 3: Hotspot aggregation (district totals)
    print("\n📊 Aggregating hotspot data...")
    hotspots = aggregate_hotspots(fir_records)
    print(f"  Generated {len(hotspots)} hotspot entries")

    summaries = get_district_summary(hotspots)
    print(f"  Top district: {summaries[0]['district']} ({summaries[0]['total_cases']} cases)")

    # Step 3b: Monthly hotspot breakdown
    print("\n📅 Aggregating monthly hotspots...")
    monthly_hotspots = aggregate_monthly_hotspots(fir_records)
    print(f"  Generated {len(monthly_hotspots)} monthly entries")

    # Step 3c: Spike detection
    print("\n⚠️ Detecting spikes...")
    spikes = detect_spikes(hotspots, threshold=1.5)
    print(f"  Found {len(spikes)} spike(s)")
    for s in spikes[:5]:
        print(f"    {s['alert']}")

    # Step 3d: Monthly deltas
    deltas = compute_monthly_deltas(monthly_hotspots)
    big_moves = [d for d in deltas if abs(d["pct_change"]) > 50]
    print(f"  {len(big_moves)} significant month-over-month changes (>50%)")

    # Step 4: Risk scoring
    print("\n🎯 Computing risk scores...")
    scored_suspects = compute_risk_scores(suspects, mappings, clusters)
    high_risk = [s for s in scored_suspects if s["risk_score"] == "High"]
    print(f"  High risk: {len(high_risk)}, Total scored: {len(scored_suspects)}")

    # Step 5: Save results
    print("\n💾 Saving results...")
    save_results(data_dir, hotspots, monthly_hotspots, spikes, clusters, scored_suspects, graph_json)

    elapsed = (datetime.utcnow() - start).total_seconds()
    print(f"\n✅ Pipeline completed in {elapsed:.2f}s")
    print("=" * 60)

    return {
        "status": "success",
        "elapsed_seconds": elapsed,
        "fir_count": len(fir_records),
        "suspect_count": len(suspects),
        "cluster_count": len(clusters),
        "hotspot_count": len(hotspots),
        "monthly_hotspot_count": len(monthly_hotspots),
        "spike_count": len(spikes),
        "high_risk_count": len(high_risk),
    }


def resolve_data_dir():
    """Prefer packaged AppSail data, then fall back to the repo data folder."""
    candidates = [
        os.path.join(os.path.dirname(__file__), "data", "samples"),
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "samples"),
        os.getenv("SAHAYA_DATA_DIR", ""),
    ]

    for candidate in candidates:
        if candidate and os.path.isdir(candidate):
            return candidate

    return candidates[0]


class AnalyticsHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/", "/health"):
            self._send_json(200, {
                "status": "ok",
                "service": "sahaya-circuit-worker",
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })
            return

        if self.path.startswith("/run"):
            data_dir = resolve_data_dir()
            if not os.path.isdir(data_dir):
                self._send_json(500, {
                    "status": "error",
                    "message": f"Data directory not found: {data_dir}",
                })
                return

            try:
                self._send_json(200, run_pipeline(data_dir))
            except Exception as exc:
                self._send_json(500, {
                    "status": "error",
                    "message": str(exc),
                })
            return

        self._send_json(404, {
            "status": "not_found",
            "message": "Use /health for status or /run to execute the analytics pipeline.",
        })

    def log_message(self, format, *args):
        print(f"[AppSail] {self.address_string()} - {format % args}")


def serve_appsail():
    port = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT", os.getenv("PORT", "9000")))
    server = HTTPServer(("0.0.0.0", port), AnalyticsHandler)
    print(f"[AppSail] SAHAYA circuit-worker listening on port {port}")
    server.serve_forever()


if __name__ == "__main__":
    if os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("SAHAYA_APPSAIL_SERVER") == "1":
        serve_appsail()
        sys.exit(0)

    data_dir = resolve_data_dir()
    if not os.path.isdir(data_dir):
        print(f"❌ Data directory not found: {data_dir}")
        sys.exit(1)

    result = run_pipeline(data_dir)
    print(f"\n📋 Summary: {json.dumps(result, indent=2)}")
