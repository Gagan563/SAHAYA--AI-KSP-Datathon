/**
 * SAHAYA AI — RAG Handler (v2)
 *
 * Queries QuickML Knowledge Base for narrative/exploratory answers.
 * Now includes:
 *   - Reasoning chain explaining which passages and connections led to the answer
 *   - MO-based cross-referencing
 *   - Session entity extraction
 *
 * Uses unified data-loader: Catalyst SDK when deployed, local JSON in dev.
 */

const dataLoader = require("./data-loader");

let narratives = [];
let firRecords = [];
let mappings = [];

async function loadData(req) {
  narratives = await dataLoader.getNarratives(req);
  firRecords = await dataLoader.getFIRRecords(req);
  mappings = await dataLoader.getMappings(req);
}

/**
 * Keyword matching + MO matching to simulate RAG retrieval.
 * In production, this will call the QuickML Knowledge Base API.
 */
function findRelevantNarratives(query, topK = 3) {
  const queryWords = query.toLowerCase().split(/\s+/);

  const scored = narratives.map((doc) => {
    const text = `${doc.title} ${doc.narrative} ${doc.modus_operandi}`.toLowerCase();
    let score = 0;
    const matchedWords = [];
    queryWords.forEach((word) => {
      if (word.length > 2 && text.includes(word)) {
        score++;
        matchedWords.push(word);
      }
    });
    return { ...doc, relevance: score / queryWords.length, matchedWords };
  });

  return scored
    .filter((d) => d.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, topK);
}

/**
 * Find the specific passage in the narrative that matched the query.
 */
function findRelevantPassage(narrative, query) {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const sentences = narrative.split(/(?<=[.!?])\s+/);

  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const hits = queryWords.filter((w) => lower.includes(w)).length;
    return { sentence, hits };
  });

  const best = scored.sort((a, b) => b.hits - a.hits).slice(0, 2);
  return best.filter((s) => s.hits > 0).map((s) => s.sentence);
}

/**
 * Build reasoning chain for RAG response.
 */
function buildReasoningChain(query, relevant, topDoc) {
  const reasoning = [];

  reasoning.push(`Retrieval method: keyword + MO matching against ${narratives.length} case narratives`);
  reasoning.push(`${relevant.length} relevant documents found`);

  // Show which keywords matched in top document
  if (relevant[0]?.matchedWords?.length > 0) {
    reasoning.push(`Key terms matched in top result: "${relevant[0].matchedWords.join('", "')}"`);
  }

  // Show the specific passage that was most relevant
  const passages = findRelevantPassage(topDoc.narrative, query);
  if (passages.length > 0) {
    reasoning.push(`Most relevant passage: "${passages[0].substring(0, 150)}..."`);
  }

  // Cross-reference: check if suspects in this case connect to other cases
  const linkedSuspects = topDoc.suspects_linked || [];
  if (linkedSuspects.length > 0) {
    const crossFirs = mappings
      .filter((m) => linkedSuspects.includes(m.suspect_id) && m.fir_id !== topDoc.fir_id)
      .map((m) => m.fir_id);
    const uniqueFirs = [...new Set(crossFirs)];
    if (uniqueFirs.length > 0) {
      reasoning.push(
        `Cross-reference: suspects in this case (${linkedSuspects.join(", ")}) ` +
        `also appear in ${uniqueFirs.length} other FIR(s): ${uniqueFirs.slice(0, 3).join(", ")}` +
        (uniqueFirs.length > 3 ? ` and ${uniqueFirs.length - 3} more` : "")
      );
    }
  }

  // Check for MO patterns across cases
  if (topDoc.modus_operandi) {
    const sameMO = narratives.filter(
      (n) => n.fir_id !== topDoc.fir_id && n.modus_operandi === topDoc.modus_operandi
    );
    if (sameMO.length > 0) {
      reasoning.push(
        `MO pattern match: "${topDoc.modus_operandi}" also seen in ` +
        `${sameMO.length} other case(s): ${sameMO.map((n) => n.fir_id).join(", ")}`
      );
    }
  }

  return reasoning;
}

/**
 * Handle narrative/RAG queries.
 */
async function handleRAGQuery(req, message, intent) {
  await loadData(req);
  const relevant = findRelevantNarratives(message);

  if (relevant.length === 0) {
    return {
      type: "narrative",
      answer:
        "I couldn't find specific case narratives matching your query. Try asking about specific incidents, locations, or modus operandi patterns in our records.",
      data: null,
      source: { type: "rag", documents: [] },
      reasoning: [
        `Searched ${narratives.length} case narratives`,
        "No documents matched the query terms with sufficient relevance",
        "Suggestion: try more specific terms (location, crime type, suspect name)",
      ],
      graph: null,
    };
  }

  const topDoc = relevant[0];
  const reasoning = buildReasoningChain(message, relevant, topDoc);

  const answer = `Based on case records, here's what I found:\n\n${topDoc.narrative}\n\nModus Operandi: ${topDoc.modus_operandi}\n\nEvidence: ${topDoc.evidence_summary}`;

  return {
    type: "narrative",
    answer: answer,
    data: {
      fir_id: topDoc.fir_id,
      modus_operandi: topDoc.modus_operandi,
    },
    source: {
      type: "rag",
      documents: relevant.map((doc) => ({
        fir_id: doc.fir_id,
        title: doc.title,
        relevance: Math.round(doc.relevance * 100) / 100,
      })),
    },
    reasoning,
    graph: null,
    session_entities: {
      fir_id: topDoc.fir_id,
    },
  };
}

module.exports = { handleRAGQuery };
