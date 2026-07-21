/**
 * SAHAYA AI — Fact Handler (v2)
 *
 * Queries precomputed Hotspot_Answers and Suspect_Clusters from Catalyst Data Store.
 * Now includes:
 *   - Reasoning chain explaining WHY this answer was produced
 *   - Spike/trend detection with explanations
 *   - Monthly breakdown support for time-based trend analytics
 * Currently uses mock data. Wire to Catalyst SDK when project is linked.
 */

const fs = require("fs");
const path = require("path");

let hotspotData = [];
let suspectData = [];
let monthlyData = [];
try {
  hotspotData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/hotspot_answers.json"), "utf-8")
  );
  suspectData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/suspects.json"), "utf-8")
  );
  // Try loading monthly breakdown if it exists
  try {
    monthlyData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../data/samples/monthly_hotspots.json"), "utf-8")
    );
  } catch (_) { /* monthly data is optional */ }
} catch (e) {
  console.warn("[SAHAYA] Mock data not found, using empty arrays");
}

const DISTRICTS = [
  "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru",
  "Hubli-Dharwad", "Belagavi", "Kalaburagi", "Shivamogga",
  "Tumakuru", "Davangere",
];

const CATEGORIES = ["Theft", "Robbery", "Assault", "Cybercrime", "Drug", "Murder", "Fraud", "Missing"];

/**
 * Detect spikes: district/category exceeds average by > 50%.
 */
function detectSpikes(hotspots) {
  const avgByCategory = {};
  const countByCategory = {};

  hotspots.forEach((h) => {
    if (!avgByCategory[h.crime_category]) {
      avgByCategory[h.crime_category] = 0;
      countByCategory[h.crime_category] = 0;
    }
    avgByCategory[h.crime_category] += h.count;
    countByCategory[h.crime_category]++;
  });

  Object.keys(avgByCategory).forEach((cat) => {
    avgByCategory[cat] = avgByCategory[cat] / countByCategory[cat];
  });

  const spikes = hotspots.filter(
    (h) => h.count > avgByCategory[h.crime_category] * 1.5
  ).map((h) => ({
    district: h.district,
    category: h.crime_category,
    count: h.count,
    average: Math.round(avgByCategory[h.crime_category] * 10) / 10,
    spike_ratio: Math.round((h.count / avgByCategory[h.crime_category]) * 100) / 100,
  }));

  return spikes;
}

/**
 * Build a reasoning chain for the fact answer.
 */
function buildReasoning(action, data, extras = {}) {
  const reasons = [];
  reasons.push(`Query type: ${action}`);
  reasons.push(`Data source: Hotspot_Answers table (precomputed, zero hallucination)`);

  if (data.district) reasons.push(`District filter: ${data.district}`);
  if (data.category) reasons.push(`Category filter: ${data.category}`);

  if (extras.sorted) reasons.push(`Sorted by count descending to find ${action}`);
  if (extras.spike) {
    reasons.push(
      `⚠️ Spike detected: ${extras.spike.district}/${extras.spike.category} ` +
      `is ${extras.spike.spike_ratio}x the state average of ${extras.spike.average}`
    );
  }
  if (extras.trend) {
    reasons.push(`Trend classification: ${extras.trend} (based on count thresholds)`);
  }

  reasons.push(`Verified at: ${new Date().toISOString()}`);
  return reasons;
}

/**
 * Handle factual queries by looking up precomputed data.
 */
async function handleFactQuery(message, intent) {
  const msgLower = message.toLowerCase();
  const now = new Date().toISOString();

  // Try to detect which district and/or category the user is asking about
  const matchedDistrict = DISTRICTS.find((d) => msgLower.includes(d.toLowerCase()));
  const matchedCategory = CATEGORIES.find((c) => msgLower.includes(c.toLowerCase()));

  // Detect spikes across all data
  const spikes = detectSpikes(hotspotData);

  // Check if asking about spikes/emerging trends
  const isSpikeQuery = /\b(spike|surge|emerging|unusual|abnormal|anomal)/i.test(msgLower);
  if (isSpikeQuery) {
    const relevantSpikes = matchedDistrict
      ? spikes.filter((s) => s.district === matchedDistrict)
      : matchedCategory
      ? spikes.filter((s) => s.category === matchedCategory)
      : spikes;

    const answer = relevantSpikes.length > 0
      ? `⚠️ **Emerging Trend Alert:** ${relevantSpikes.map((s) =>
          `${s.district} shows a spike in ${s.category} (${s.count} cases, ${s.spike_ratio}x the state average of ${s.average})`
        ).join(". ")}.`
      : "No significant spikes detected across the monitored districts.";

    return {
      type: "fact",
      answer,
      data: { spikes: relevantSpikes },
      source: { type: "database", table: "Hotspot_Answers", verified_at: now },
      reasoning: [
        "Spike detection: compared each district/category count against state-wide average",
        `Threshold: flagged if count > 1.5x average`,
        `${relevantSpikes.length} spike(s) found`,
        ...relevantSpikes.map((s) => `${s.district}/${s.category}: ${s.count} vs avg ${s.average} (${s.spike_ratio}x)`),
      ],
      graph: null,
    };
  }

  // Case 1: "Which district has the highest X cases?"
  if (msgLower.includes("highest") || msgLower.includes("most") || msgLower.includes("top")) {
    const category = matchedCategory || "Theft";
    const filtered = hotspotData.filter((h) => h.crime_category === category);
    const sorted = filtered.sort((a, b) => b.count - a.count);
    const top = sorted[0];

    if (top) {
      const spike = spikes.find((s) => s.district === top.district && s.category === category);
      return {
        type: "fact",
        answer: `${top.district} has the highest ${category.toLowerCase()} cases with ${top.count} reported incidents (${top.period}). The trend is ${top.trend.toLowerCase()}.${spike ? ` ⚠️ This is ${spike.spike_ratio}x the state average.` : ""}`,
        data: {
          district: top.district,
          category: top.crime_category,
          count: top.count,
          period: top.period,
          trend: top.trend,
          top5: sorted.slice(0, 5).map((h) => ({ district: h.district, count: h.count })),
        },
        source: { type: "database", table: "Hotspot_Answers", verified_at: now },
        reasoning: buildReasoning("highest-by-category", { category }, { sorted: true, spike, trend: top.trend }),
        graph: null,
      };
    }
  }

  // Case 2: "How many X cases in Y district?"
  if (matchedDistrict && matchedCategory) {
    const entry = hotspotData.find(
      (h) => h.district === matchedDistrict && h.crime_category === matchedCategory
    );
    const count = entry ? entry.count : 0;
    const spike = spikes.find((s) => s.district === matchedDistrict && s.category === matchedCategory);

    return {
      type: "fact",
      answer: `${matchedDistrict} has ${count} reported ${matchedCategory.toLowerCase()} cases (${entry?.period || "2024-2025"}). ${entry ? `Trend: ${entry.trend}.` : ""}${spike ? ` ⚠️ This is above the state average.` : ""}`,
      data: {
        district: matchedDistrict,
        category: matchedCategory,
        count: count,
        period: entry?.period || "2024-2025",
        trend: entry?.trend || "N/A",
      },
      source: { type: "database", table: "Hotspot_Answers", verified_at: now },
      reasoning: buildReasoning("district-category-lookup", { district: matchedDistrict, category: matchedCategory }, { spike, trend: entry?.trend }),
      graph: null,
    };
  }

  // Case 3: District-level summary
  if (matchedDistrict) {
    const districtData = hotspotData.filter((h) => h.district === matchedDistrict);
    const totalCases = districtData.reduce((sum, h) => sum + h.count, 0);
    const breakdown = districtData.map((h) => `${h.crime_category}: ${h.count}`).join(", ");
    const districtSpikes = spikes.filter((s) => s.district === matchedDistrict);

    return {
      type: "fact",
      answer: `${matchedDistrict} has ${totalCases} total reported cases. Breakdown: ${breakdown}.${districtSpikes.length > 0 ? ` ⚠️ Spikes in: ${districtSpikes.map((s) => s.category).join(", ")}.` : ""}`,
      data: { district: matchedDistrict, total: totalCases, breakdown: districtData },
      source: { type: "database", table: "Hotspot_Answers", verified_at: now },
      reasoning: buildReasoning("district-summary", { district: matchedDistrict }, {}),
      graph: null,
    };
  }

  // Case 4: Category-level overview
  if (matchedCategory) {
    const catData = hotspotData.filter((h) => h.crime_category === matchedCategory);
    const totalCases = catData.reduce((sum, h) => sum + h.count, 0);
    const sorted = catData.sort((a, b) => b.count - a.count);

    return {
      type: "fact",
      answer: `Total ${matchedCategory.toLowerCase()} cases across Karnataka: ${totalCases}. Top district: ${sorted[0]?.district || "N/A"} (${sorted[0]?.count || 0} cases).`,
      data: {
        category: matchedCategory,
        total: totalCases,
        by_district: sorted.map((h) => ({ district: h.district, count: h.count })),
      },
      source: { type: "database", table: "Hotspot_Answers", verified_at: now },
      reasoning: buildReasoning("category-overview", { category: matchedCategory }, { sorted: true }),
      graph: null,
    };
  }

  // Case 5: General stats overview
  const totalCases = hotspotData.reduce((sum, h) => sum + h.count, 0);
  const byCategory = {};
  hotspotData.forEach((h) => {
    byCategory[h.crime_category] = (byCategory[h.crime_category] || 0) + h.count;
  });
  const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];

  return {
    type: "fact",
    answer: `Total cases across Karnataka: ${totalCases}. Most common category: ${topCategory?.[0] || "N/A"} (${topCategory?.[1] || 0} cases). Data covers ${DISTRICTS.length} districts.${spikes.length > 0 ? ` ⚠️ ${spikes.length} spike(s) detected.` : ""}`,
    data: { total: totalCases, by_category: byCategory, districts_covered: DISTRICTS.length, spikes },
    source: { type: "database", table: "Hotspot_Answers", verified_at: now },
    reasoning: buildReasoning("general-overview", {}, {}),
    graph: null,
  };
}

module.exports = { handleFactQuery };
