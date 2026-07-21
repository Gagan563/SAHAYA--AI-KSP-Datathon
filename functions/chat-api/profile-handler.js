/**
 * SAHAYA AI — Suspect Profile Handler
 *
 * Handles "profile" intent: given a suspect name/ID, returns a comprehensive view:
 *   - Suspect info + risk score + risk reasoning
 *   - All linked FIRs with MO tags
 *   - Repeat MO pattern detection
 *   - Network cluster membership
 *   - Case summaries from narratives
 */

const fs = require("fs");
const path = require("path");

let suspects = [];
let mappings = [];
let firRecords = [];
let narratives = [];
let graphData = { nodes: [], links: [] };

try {
  suspects = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/samples/suspects.json"), "utf-8"));
  mappings = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/samples/fir_suspect_mapping.json"), "utf-8"));
  firRecords = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/samples/fir_records.json"), "utf-8"));
  narratives = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/samples/case_narratives.json"), "utf-8"));
  graphData = JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/samples/graph_data.json"), "utf-8"));
} catch (e) {
  console.warn("[SAHAYA] Profile handler: some mock data not found");
}

/**
 * Find a suspect by name, ID, or alias.
 */
function findSuspect(query) {
  const lower = query.toLowerCase();

  // Try exact ID match first
  const byId = suspects.find((s) => lower.includes(s.suspect_id.toLowerCase()));
  if (byId) return byId;

  // Try name match
  const byName = suspects.find((s) => lower.includes(s.name.toLowerCase()));
  if (byName) return byName;

  // Try alias match
  const byAlias = suspects.find(
    (s) => s.aliases && s.aliases.toLowerCase().split(", ").some((a) => lower.includes(a.toLowerCase()))
  );
  if (byAlias) return byAlias;

  return null;
}

/**
 * Get all FIRs linked to a suspect with full details.
 */
function getSuspectFIRs(suspectId) {
  const suspectMappings = mappings.filter((m) => m.suspect_id === suspectId);
  return suspectMappings.map((m) => {
    const fir = firRecords.find((f) => f.fir_id === m.fir_id);
    return {
      fir_id: m.fir_id,
      role: m.role,
      category: fir?.category || "Unknown",
      district: fir?.district || "Unknown",
      date_filed: fir?.date_filed || "Unknown",
      description: fir?.description || "",
      modus_operandi: fir?.modus_operandi || null,
      status: fir?.status || "Unknown",
    };
  });
}

/**
 * Detect repeat MO patterns across a suspect's FIRs.
 */
function detectRepeatMO(firDetails) {
  const moCount = {};
  firDetails.forEach((fir) => {
    if (fir.modus_operandi) {
      moCount[fir.modus_operandi] = (moCount[fir.modus_operandi] || 0) + 1;
    }
    // Also count by category as a fallback MO grouping
    moCount[`category:${fir.category}`] = (moCount[`category:${fir.category}`] || 0) + 1;
  });

  const repeats = [];
  Object.entries(moCount).forEach(([mo, count]) => {
    if (count >= 2) {
      repeats.push({
        pattern: mo.startsWith("category:") ? mo.replace("category:", "") + " (by category)" : mo,
        count,
        is_category_match: mo.startsWith("category:"),
      });
    }
  });

  return repeats.sort((a, b) => b.count - a.count);
}

/**
 * Get cluster info for a suspect from graph data.
 */
function getClusterInfo(suspectId) {
  const node = graphData.nodes.find((n) => n.id === suspectId);
  if (!node || node.group === 0) return null;

  const clusterMembers = graphData.nodes.filter((n) => n.group === node.group);
  const clusterLinks = graphData.links.filter(
    (l) =>
      clusterMembers.some((m) => m.id === l.source || m.id === (typeof l.source === "object" ? l.source.id : l.source)) &&
      clusterMembers.some((m) => m.id === l.target || m.id === (typeof l.target === "object" ? l.target.id : l.target))
  );

  return {
    cluster_id: `CLU-${String(node.group).padStart(3, "0")}`,
    size: clusterMembers.length,
    members: clusterMembers.map((m) => ({ id: m.id, name: m.name, risk: m.risk })),
    connections: clusterLinks.length,
  };
}

/**
 * Generate a risk reasoning explanation.
 */
function explainRisk(suspect, firDetails, repeatMOs, clusterInfo) {
  const reasons = [];
  const firCount = firDetails.length;
  const primaryCount = firDetails.filter((f) => f.role === "Primary").length;

  if (firCount >= 3) reasons.push(`Linked to ${firCount} FIRs (high involvement)`);
  else if (firCount >= 2) reasons.push(`Linked to ${firCount} FIRs`);
  else reasons.push(`Linked to ${firCount} FIR`);

  if (primaryCount > 0) reasons.push(`Primary suspect in ${primaryCount} case(s)`);

  if (repeatMOs.length > 0) {
    const topMO = repeatMOs[0];
    reasons.push(`Repeat pattern detected: "${topMO.pattern}" across ${topMO.count} FIRs`);
  }

  if (clusterInfo) {
    reasons.push(`Member of crime cluster ${clusterInfo.cluster_id} (${clusterInfo.size} suspects)`);
  }

  return reasons;
}

/**
 * Handle suspect profile queries.
 */
async function handleProfileQuery(message, intent, sessionEntities = {}) {
  const now = new Date().toISOString();

  // Try to find suspect from message or session context
  let suspect = findSuspect(message);
  if (!suspect && sessionEntities.suspect_id) {
    suspect = suspects.find((s) => s.suspect_id === sessionEntities.suspect_id);
  }

  if (!suspect) {
    return {
      type: "profile",
      answer: "I couldn't identify a specific suspect. Please mention a suspect name, alias, or ID (e.g., 'profile of Ravi Kumar' or 'show profile S001').",
      data: null,
      source: null,
      reasoning: null,
      graph: null,
      session_entities: {},
    };
  }

  // Gather all profile data
  const firDetails = getSuspectFIRs(suspect.suspect_id);
  const repeatMOs = detectRepeatMO(firDetails);
  const clusterInfo = getClusterInfo(suspect.suspect_id);
  const riskReasons = explainRisk(suspect, firDetails, repeatMOs, clusterInfo);

  // Get related narratives
  const relatedNarratives = narratives.filter(
    (n) => n.suspects_linked && n.suspects_linked.includes(suspect.suspect_id)
  );

  // Build answer
  const moSummary = repeatMOs.length > 0
    ? `\n\n⚠️ **Repeat Pattern Detected:** ${repeatMOs.map((m) => `"${m.pattern}" (${m.count}x)`).join(", ")}`
    : "";

  const answer = `**Suspect Profile: ${suspect.name}** (${suspect.suspect_id})\n\n` +
    `• **Risk Level:** ${suspect.risk_score}\n` +
    `• **Age:** ${suspect.age} | **Gender:** ${suspect.gender}\n` +
    `• **District:** ${suspect.district}\n` +
    `• **Aliases:** ${suspect.aliases || "None known"}\n` +
    `• **Linked FIRs:** ${firDetails.length} (Primary in ${firDetails.filter((f) => f.role === "Primary").length})\n` +
    `• **Categories:** ${[...new Set(firDetails.map((f) => f.category))].join(", ")}` +
    moSummary +
    (clusterInfo ? `\n\n🔗 **Crime Ring:** Member of ${clusterInfo.cluster_id} with ${clusterInfo.size} suspects` : "");

  // Build sub-graph for this suspect
  let suspectGraph = null;
  if (clusterInfo) {
    const nodeIds = new Set(clusterInfo.members.map((m) => m.id));
    suspectGraph = {
      nodes: graphData.nodes.filter((n) => nodeIds.has(n.id)),
      links: graphData.links.filter(
        (l) => nodeIds.has(l.source) && nodeIds.has(l.target)
      ),
    };
  }

  return {
    type: "profile",
    answer,
    data: {
      suspect_id: suspect.suspect_id,
      suspect_name: suspect.name,
      suspect: suspect,
      fir_count: firDetails.length,
      fir_details: firDetails,
      repeat_mos: repeatMOs,
      cluster: clusterInfo,
      related_narratives: relatedNarratives.map((n) => ({
        fir_id: n.fir_id,
        title: n.title,
        summary: n.narrative.substring(0, 200) + "...",
      })),
    },
    source: {
      type: "database",
      table: "Suspects + FIR_Records + FIR_Suspect_Mapping",
      verified_at: now,
    },
    reasoning: riskReasons,
    graph: suspectGraph,
    session_entities: {
      suspect_id: suspect.suspect_id,
      suspect_name: suspect.name,
      district: suspect.district,
    },
  };
}

module.exports = { handleProfileQuery, findSuspect };
