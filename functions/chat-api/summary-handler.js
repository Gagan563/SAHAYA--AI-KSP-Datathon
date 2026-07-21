/**
 * SAHAYA AI — Summary Handler
 *
 * Handles case summary + similar case retrieval:
 *   - Given an FIR ID, generates a short case summary from Case_Narratives
 *   - Finds top 3 most similar past cases using text similarity
 *   - Returns FIR IDs, titles, and similarity scores
 */

const fs = require("fs");
const path = require("path");

let narratives = [];
let firRecords = [];
try {
  narratives = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/case_narratives.json"), "utf-8")
  );
  firRecords = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../data/samples/fir_records.json"), "utf-8")
  );
} catch (e) {
  console.warn("[SAHAYA] Summary handler: mock data not found");
}

/**
 * Generate a 2-3 sentence auto-summary from a case narrative.
 */
function generateSummary(narrative) {
  if (!narrative) return "No narrative available for this case.";

  const text = narrative.narrative;
  // Extract key sentences (first sentence + MO + status)
  const sentences = text.split(/(?<=[.!?])\s+/);
  const keyParts = [];

  // First 1-2 sentences (incident description)
  keyParts.push(sentences.slice(0, 2).join(" "));

  // MO
  if (narrative.modus_operandi) {
    keyParts.push(`MO: ${narrative.modus_operandi}.`);
  }

  // Status
  keyParts.push(`Status: ${narrative.status}.`);

  return keyParts.join(" ");
}

/**
 * Compute simple text similarity between two documents using Jaccard on word trigrams.
 */
function textSimilarity(text1, text2) {
  const getGrams = (text, n = 3) => {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
    const grams = new Set();
    for (let i = 0; i <= words.length - n; i++) {
      grams.add(words.slice(i, i + n).join(" "));
    }
    return grams;
  };

  const grams1 = getGrams(text1);
  const grams2 = getGrams(text2);

  if (grams1.size === 0 || grams2.size === 0) return 0;

  let intersection = 0;
  for (const g of grams1) {
    if (grams2.has(g)) intersection++;
  }

  return intersection / (grams1.size + grams2.size - intersection);
}

/**
 * Find similar past cases to a given narrative.
 */
function findSimilarCases(targetNarrative, topK = 3) {
  const targetText = `${targetNarrative.narrative} ${targetNarrative.modus_operandi}`;

  const scored = narratives
    .filter((n) => n.fir_id !== targetNarrative.fir_id) // Exclude self
    .map((n) => {
      const compareText = `${n.narrative} ${n.modus_operandi}`;
      const similarity = textSimilarity(targetText, compareText);

      // Boost similarity if same category
      const targetFir = firRecords.find((f) => f.fir_id === targetNarrative.fir_id);
      const compareFir = firRecords.find((f) => f.fir_id === n.fir_id);
      const categoryBoost = targetFir && compareFir && targetFir.category === compareFir.category ? 0.15 : 0;

      return {
        fir_id: n.fir_id,
        title: n.title,
        similarity: Math.min(similarity + categoryBoost, 1.0),
        category: compareFir?.category || "Unknown",
        district: compareFir?.district || "Unknown",
        shared_mo: n.modus_operandi === targetNarrative.modus_operandi,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

/**
 * Handle summary/similar-case queries.
 */
async function handleSummaryQuery(message, intent, sessionEntities = {}) {
  const now = new Date().toISOString();
  const msgLower = message.toLowerCase();

  // Try to find FIR ID from message or session context
  const firIdMatch = message.match(/FIR[-\s]?\d{4}[-\s]?[A-Z]{3}[-\s]?\d{3,4}/i);
  let firId = firIdMatch ? firIdMatch[0].toUpperCase() : sessionEntities.fir_id;

  // Check if asking for "similar cases" without specific FIR
  const isSimilarQuery = /similar|like this|matching|resembles/i.test(msgLower);

  // If we have an FIR, look up its narrative
  let targetNarrative = null;
  if (firId) {
    targetNarrative = narratives.find((n) => n.fir_id === firId);
  }

  // If no specific FIR but asking for similar cases, use the first relevant narrative
  if (!targetNarrative && isSimilarQuery) {
    // Try keyword match to find a relevant narrative
    const queryWords = msgLower.split(/\s+/).filter((w) => w.length > 3);
    for (const narrative of narratives) {
      const text = `${narrative.title} ${narrative.narrative}`.toLowerCase();
      const matchCount = queryWords.filter((w) => text.includes(w)).length;
      if (matchCount >= 2) {
        targetNarrative = narrative;
        firId = narrative.fir_id;
        break;
      }
    }
  }

  // If still no narrative, return a general summary
  if (!targetNarrative) {
    // Try to generate a summary based on any category or district mentioned
    const fir = firId ? firRecords.find((f) => f.fir_id === firId) : null;
    if (fir) {
      return {
        type: "summary",
        answer: `**Case Summary: ${firId}**\n\n${fir.description}\n\nCategory: ${fir.category} | District: ${fir.district} | Status: ${fir.status}\nFiled: ${fir.date_filed}`,
        data: { fir_id: firId, fir: fir },
        source: {
          type: "database",
          table: "FIR_Records",
          verified_at: now,
        },
        reasoning: [`Summary generated from FIR_Records table for ${firId}`],
        graph: null,
        session_entities: { fir_id: firId, district: fir.district, category: fir.category },
      };
    }

    return {
      type: "summary",
      answer: "Please specify an FIR ID (e.g., 'summarize FIR-2024-BLR-0042') or ask about similar cases to a specific incident.",
      data: null,
      source: null,
      reasoning: null,
      graph: null,
      session_entities: {},
    };
  }

  // Generate summary
  const summary = generateSummary(targetNarrative);

  // Find similar cases
  const similarCases = findSimilarCases(targetNarrative);

  const reasoning = [
    `Auto-summary generated from Case_Narratives for ${firId}`,
    `Similar cases found using word-trigram text similarity + category matching`,
    ...similarCases.map(
      (sc) =>
        `${sc.fir_id}: ${Math.round(sc.similarity * 100)}% similar` +
        (sc.shared_mo ? " (shared MO)" : "")
    ),
  ];

  const answer = `**Case Summary: ${firId}**\n"${targetNarrative.title}"\n\n${summary}\n\n` +
    `**Similar Past Cases:**\n` +
    similarCases
      .map(
        (sc, i) =>
          `${i + 1}. **${sc.fir_id}** — ${sc.title} (${Math.round(sc.similarity * 100)}% match, ${sc.district})` +
          (sc.shared_mo ? " ⚠️ Shared MO" : "")
      )
      .join("\n");

  return {
    type: "summary",
    answer,
    data: {
      fir_id: firId,
      summary: summary,
      narrative: targetNarrative,
      similar_cases: similarCases,
    },
    source: {
      type: "rag",
      documents: [
        { fir_id: firId, title: targetNarrative.title, relevance: 1.0 },
        ...similarCases.map((sc) => ({
          fir_id: sc.fir_id,
          title: sc.title,
          relevance: sc.similarity,
        })),
      ],
    },
    reasoning,
    graph: null,
    session_entities: { fir_id: firId },
  };
}

module.exports = { handleSummaryQuery };
