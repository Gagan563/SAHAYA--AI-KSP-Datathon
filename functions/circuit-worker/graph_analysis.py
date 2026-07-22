"""
SAHAYA AI — Batch Analytics: Graph Analysis
Uses NetworkX to detect connected suspect components (crime rings).
"""

import json
import networkx as nx
from collections import defaultdict


def build_suspect_graph(fir_records, mappings):
    """
    Build an undirected graph where:
    - Nodes = suspects
    - Edges = co-occurrence in the same FIR
    """
    G = nx.Graph()

    # Group mappings by FIR
    fir_to_suspects = defaultdict(list)
    for m in mappings:
        fir_to_suspects[m["fir_id"]].append(m["suspect_id"])

    # Add nodes (all suspects that appear in any mapping)
    all_suspects = set()
    for m in mappings:
        all_suspects.add(m["suspect_id"])
    for sid in all_suspects:
        G.add_node(sid)

    # Add edges for co-accused suspects
    for fir_id, suspect_ids in fir_to_suspects.items():
        for i in range(len(suspect_ids)):
            for j in range(i + 1, len(suspect_ids)):
                if G.has_edge(suspect_ids[i], suspect_ids[j]):
                    # Increment shared FIR count
                    G[suspect_ids[i]][suspect_ids[j]]["weight"] += 1
                    G[suspect_ids[i]][suspect_ids[j]]["fir_ids"].append(fir_id)
                else:
                    G.add_edge(
                        suspect_ids[i],
                        suspect_ids[j],
                        weight=1,
                        fir_ids=[fir_id],
                    )

    return G


def detect_crime_rings(G, min_size=2):
    """
    Detect connected components (crime rings) in the suspect graph.
    Returns list of clusters with metadata.
    """
    components = list(nx.connected_components(G))
    clusters = []

    for idx, component in enumerate(components):
        if len(component) < min_size:
            continue

        subgraph = G.subgraph(component)

        # Collect all FIR IDs involved
        all_fir_ids = set()
        for u, v, data in subgraph.edges(data=True):
            all_fir_ids.update(data.get("fir_ids", []))

        # Compute centrality to find ring leader
        degree_centrality = nx.degree_centrality(subgraph)
        leader = max(degree_centrality, key=degree_centrality.get)

        clusters.append({
            "cluster_id": f"CLU-{idx + 1:03d}",
            "suspect_ids": sorted(list(component)),
            "fir_ids": sorted(list(all_fir_ids)),
            "cluster_size": len(component),
            "edge_count": subgraph.number_of_edges(),
            "density": round(nx.density(subgraph), 3),
            "leader_suspect": leader,
            "leader_centrality": round(degree_centrality[leader], 3),
        })

    # Sort by size descending
    clusters.sort(key=lambda c: c["cluster_size"], reverse=True)
    return clusters


def build_graph_json(G, suspects_lookup):
    """
    Convert NetworkX graph to react-force-graph JSON format.
    """
    nodes = []
    for node in G.nodes():
        suspect = suspects_lookup.get(node, {})
        nodes.append({
            "id": node,
            "name": suspect.get("name", node),
            "risk": suspect.get("risk_score", "Low"),
            "district": suspect.get("district", "Unknown"),
            "group": 0,  # Will be set by component detection
        })

    links = []
    for u, v, data in G.edges(data=True):
        links.append({
            "source": u,
            "target": v,
            "weight": data.get("weight", 1),
            "fir_ids": data.get("fir_ids", []),
            "label": f"{data.get('weight', 1)} shared FIR(s)",
        })

    # Assign group IDs based on connected components
    for idx, component in enumerate(nx.connected_components(G)):
        for node_id in component:
            for n in nodes:
                if n["id"] == node_id:
                    n["group"] = idx + 1

    return {"nodes": nodes, "links": links}


if __name__ == "__main__":
    import os

    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "samples")

    with open(os.path.join(data_dir, "fir_records.json")) as f:
        fir_records = json.load(f)
    with open(os.path.join(data_dir, "fir_suspect_mapping.json")) as f:
        mappings = json.load(f)
    with open(os.path.join(data_dir, "suspects.json")) as f:
        suspects = json.load(f)

    suspects_lookup = {s["suspect_id"]: s for s in suspects}

    print("🔧 Building suspect graph...")
    G = build_suspect_graph(fir_records, mappings)
    print(f"  Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")

    print("🔍 Detecting crime rings...")
    clusters = detect_crime_rings(G)
    print(f"  Found {len(clusters)} clusters")
    for c in clusters:
        leader_name = suspects_lookup.get(c["leader_suspect"], {}).get("name", "?")
        print(f"    {c['cluster_id']}: {c['cluster_size']} suspects, "
              f"{len(c['fir_ids'])} FIRs, density={c['density']}, "
              f"leader={leader_name}")

    print("📊 Building graph JSON...")
    graph_json = build_graph_json(G, suspects_lookup)

    # Save outputs
    with open(os.path.join(data_dir, "suspect_clusters.json"), "w") as f:
        json.dump(clusters, f, indent=2)
    with open(os.path.join(data_dir, "graph_data.json"), "w") as f:
        json.dump(graph_json, f, indent=2)

    print("✅ Done! Written suspect_clusters.json and graph_data.json")
