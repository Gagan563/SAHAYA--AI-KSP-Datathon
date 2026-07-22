"""
SAHAYA AI — Batch Analytics: Risk Scorer
Stub for Zia AutoML risk scoring. Returns rule-based scores until AutoML is configured.
"""

import json
from collections import defaultdict


def compute_risk_scores(suspects, mappings, clusters):
    """
    Compute risk scores for suspects based on:
    1. Number of FIRs they appear in
    2. Whether they're in a crime cluster
    3. Their role frequency (Primary vs Accomplice)
    4. Cluster size and density

    In production, this will call Zia AutoML for ML-based scoring.
    """
    # Count FIR appearances per suspect
    fir_count = defaultdict(int)
    primary_count = defaultdict(int)
    for m in mappings:
        fir_count[m["suspect_id"]] += 1
        if m["role"] == "Primary":
            primary_count[m["suspect_id"]] += 1

    # Map suspect to cluster info
    suspect_cluster = {}
    for cluster in clusters:
        for sid in cluster["suspect_ids"]:
            suspect_cluster[sid] = {
                "cluster_size": cluster["cluster_size"],
                "density": cluster.get("density", 0),
                "is_leader": cluster.get("leader_suspect") == sid,
            }

    # Score each suspect
    scored_suspects = []
    for suspect in suspects:
        sid = suspect["suspect_id"]
        firs = fir_count.get(sid, 0)
        primaries = primary_count.get(sid, 0)
        cluster_info = suspect_cluster.get(sid, None)

        # Rule-based scoring (0-100)
        score = 0
        score += min(firs * 10, 30)          # Up to 30 points for FIR count
        score += min(primaries * 15, 30)     # Up to 30 points for primary role
        if cluster_info:
            score += min(cluster_info["cluster_size"] * 5, 20)  # Up to 20 for cluster size
            if cluster_info["is_leader"]:
                score += 15                  # 15 points for being cluster leader
            score += cluster_info["density"] * 5  # Small bonus for dense clusters

        # Map to category
        if score >= 50:
            risk_level = "High"
        elif score >= 25:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        scored_suspect = {**suspect}
        scored_suspect["risk_score"] = risk_level
        scored_suspect["risk_numeric"] = round(min(score, 100), 1)
        scored_suspect["fir_count"] = firs
        scored_suspect["primary_count"] = primaries
        scored_suspect["in_cluster"] = cluster_info is not None
        scored_suspect["is_leader"] = cluster_info["is_leader"] if cluster_info else False

        scored_suspects.append(scored_suspect)

    # Sort by risk score descending
    scored_suspects.sort(key=lambda s: s["risk_numeric"], reverse=True)
    return scored_suspects


if __name__ == "__main__":
    import os

    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "samples")

    with open(os.path.join(data_dir, "suspects.json")) as f:
        suspects = json.load(f)
    with open(os.path.join(data_dir, "fir_suspect_mapping.json")) as f:
        mappings = json.load(f)

    # Load clusters if available
    clusters = []
    clusters_path = os.path.join(data_dir, "suspect_clusters.json")
    if os.path.exists(clusters_path):
        with open(clusters_path) as f:
            clusters = json.load(f)

    print("🎯 Computing risk scores...")
    scored = compute_risk_scores(suspects, mappings, clusters)

    high = [s for s in scored if s["risk_score"] == "High"]
    med = [s for s in scored if s["risk_score"] == "Medium"]
    low = [s for s in scored if s["risk_score"] == "Low"]

    print(f"  High risk: {len(high)}")
    print(f"  Medium risk: {len(med)}")
    print(f"  Low risk: {len(low)}")

    print("\n🚨 Top 10 highest risk suspects:")
    for s in scored[:10]:
        leader_tag = " ★ LEADER" if s.get("is_leader") else ""
        print(f"  {s['suspect_id']} {s['name']}: {s['risk_score']} "
              f"(score={s['risk_numeric']}, FIRs={s['fir_count']}, "
              f"primary={s['primary_count']}){leader_tag}")

    with open(os.path.join(data_dir, "suspects_scored.json"), "w") as f:
        json.dump(scored, f, indent=2)

    print("\n✅ Written suspects_scored.json")
