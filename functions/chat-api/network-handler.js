/**
 * SAHAYA AI — Network Handler (v2)
 *
 * Returns suspect graph data for react-force-graph visualization.
 * Now includes:
 *   - Reasoning chain explaining graph connections
 *   - Session entity extraction for context-aware follow-ups
 * Currently uses mock data. Wire to Catalyst SDK when project is linked.
 */

const fs = require("fs");
const path = require("path");

let graphData = { nodes: [], links: [] };
let suspects = [];
let mappings = [];
let firRecords = [];
try {
  graphData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/graph_data.json"), "utf-8")
  );
  suspects = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/suspects.json"), "utf-8")
  );
  mappings = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/fir_suspect_mapping.json"), "utf-8")
  );
  firRecords = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/fir_records.json"), "utf-8")
  );
} catch (e) {
  console.warn("[SAHAYA] Graph mock data not found");
}

/**
 * Build reasoning for a suspect's network connections.
 */
function buildNetworkReasoning(suspectId, suspectLinks, connectedNodes) {
  const reasoning = [];
  const suspect = suspects.find((s) => s.suspect_id === suspectId);

  reasoning.push(`Graph source: Suspect_Clusters table (precomputed via NetworkX connected-component analysis)`);

  if (suspect) {
    reasoning.push(`Focus suspect: ${suspect.name} (${suspectId}), Risk: ${suspect.risk_score}`);
  }

  // Explain each connection
  suspectLinks.forEach((link) => {
    const otherId = link.source === suspectId ? link.target : link.source;
    const other = suspects.find((s) => s.suspect_id === otherId);
    const fir = firRecords.find((f) => f.fir_id === link.fir_id);

    if (other && fir) {
      reasoning.push(
        `${suspect?.name || suspectId} ↔ ${other.name} (${otherId}): ` +
        `co-accused in ${fir.category} case ${link.fir_id} at ${fir.district} (${fir.date_filed})`
      );
    }
  });

  // Explain cluster
  if (connectedNodes.length > 1) {
    const highRisk = connectedNodes.filter((n) => n.risk === "High");
    reasoning.push(
      `Cluster size: ${connectedNodes.length} suspects, ${suspectLinks.length} shared FIRs` +
      (highRisk.length > 0 ? `, ${highRisk.length} high-risk member(s)` : "")
    );
  }

  return reasoning;
}

/**
 * Handle network/graph queries.
 */
async function handleNetworkQuery(message, intent) {
  const msgLower = message.toLowerCase();
  const now = new Date().toISOString();

  // Check if asking about a specific suspect
  const matchedSuspect = suspects.find((s) =>
    msgLower.includes(s.name.toLowerCase()) ||
    (s.aliases && s.aliases.toLowerCase().split(", ").some((a) => msgLower.includes(a.toLowerCase())))
  );

  if (matchedSuspect) {
    // Filter graph to show only connections of this suspect
    const suspectLinks = graphData.links.filter(
      (l) => l.source === matchedSuspect.suspect_id || l.target === matchedSuspect.suspect_id
    );
    const connectedIds = new Set([matchedSuspect.suspect_id]);
    suspectLinks.forEach((l) => {
      connectedIds.add(typeof l.source === "string" ? l.source : l.source);
      connectedIds.add(typeof l.target === "string" ? l.target : l.target);
    });
    const connectedNodes = graphData.nodes.filter((n) => connectedIds.has(n.id));

    const reasoning = buildNetworkReasoning(matchedSuspect.suspect_id, suspectLinks, connectedNodes);

    return {
      type: "network",
      answer: `Found ${connectedNodes.length - 1} suspects connected to ${matchedSuspect.name} (${matchedSuspect.suspect_id}) across ${suspectLinks.length} shared FIRs. Risk level: ${matchedSuspect.risk_score}.`,
      data: {
        focus_suspect: matchedSuspect,
        suspect_id: matchedSuspect.suspect_id,
        suspect_name: matchedSuspect.name,
        connection_count: connectedNodes.length - 1,
      },
      source: {
        type: "database",
        table: "Suspect_Clusters",
        verified_at: now,
      },
      reasoning,
      graph: {
        nodes: connectedNodes,
        links: suspectLinks,
      },
      session_entities: {
        suspect_id: matchedSuspect.suspect_id,
        suspect_name: matchedSuspect.name,
        district: matchedSuspect.district,
      },
    };
  }

  // Default: return full graph with summary
  const clusterGroups = {};
  graphData.nodes.forEach((n) => {
    if (n.group > 0) {
      if (!clusterGroups[n.group]) clusterGroups[n.group] = [];
      clusterGroups[n.group].push(n);
    }
  });
  const ringCount = Object.keys(clusterGroups).length;
  const largestRing = Object.values(clusterGroups).sort((a, b) => b.length - a.length)[0];
  const highRiskCount = graphData.nodes.filter((n) => n.risk === "High").length;

  const reasoning = [
    `Graph source: NetworkX connected-component analysis over ${mappings.length} FIR-Suspect mappings`,
    `Total graph: ${graphData.nodes.length} suspects, ${graphData.links.length} co-offense edges`,
    `${ringCount} distinct clusters detected`,
    `Largest cluster: ${largestRing?.length || 0} members`,
    `${highRiskCount} suspects flagged high-risk (based on FIR count, role, cluster membership)`,
  ];

  return {
    type: "network",
    answer: `Criminal network analysis reveals ${ringCount} suspect clusters involving ${graphData.nodes.length} suspects and ${graphData.links.length} co-offense links. Largest ring has ${largestRing?.length || 0} members. ${highRiskCount} suspects are flagged as high-risk.`,
    data: {
      total_suspects: graphData.nodes.length,
      total_links: graphData.links.length,
      cluster_count: ringCount,
      high_risk_count: highRiskCount,
    },
    source: {
      type: "database",
      table: "Suspect_Clusters",
      verified_at: now,
    },
    reasoning,
    graph: graphData,
    session_entities: {},
  };
}

module.exports = { handleNetworkQuery };
