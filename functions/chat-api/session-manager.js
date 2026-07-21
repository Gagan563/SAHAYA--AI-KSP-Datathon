/**
 * SAHAYA AI — Session Manager
 *
 * Provides context-aware conversation by maintaining session state.
 * Stores last N turns with resolved entities (suspect ID, district, FIR ID, category)
 * so follow-up queries like "show me his other cases" work correctly.
 *
 * Uses in-memory store for demo. In production, use Catalyst Cache or a
 * Conversation_Sessions Data Store table.
 */

const MAX_TURNS = 10;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// In-memory session store (replace with Catalyst Cache in production)
const sessions = new Map();

/**
 * Get or create a session.
 */
function getSession(sessionId) {
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  if (sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    session.lastAccess = Date.now();
    return session;
  }

  const session = {
    id: sessionId,
    turns: [],
    entities: {
      suspect_id: null,
      suspect_name: null,
      district: null,
      fir_id: null,
      category: null,
      cluster_id: null,
    },
    lastAccess: Date.now(),
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Add a turn to the session and extract/update resolved entities.
 */
function addTurn(session, query, response, extractedEntities = {}) {
  session.turns.push({
    query,
    responseType: response.type,
    timestamp: new Date().toISOString(),
    entities: { ...extractedEntities },
  });

  // Keep only last N turns
  if (session.turns.length > MAX_TURNS) {
    session.turns = session.turns.slice(-MAX_TURNS);
  }

  // Update session-level entities (most recent wins)
  Object.entries(extractedEntities).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      session.entities[key] = value;
    }
  });

  session.lastAccess = Date.now();
}

/**
 * Resolve pronouns and references in a message using session context.
 * Returns { resolvedMessage, resolvedEntities }
 *
 * Handles:
 *   - "his/her/their" → last mentioned suspect
 *   - "that case/this FIR" → last mentioned FIR
 *   - "the same district/same area" → last mentioned district
 *   - "that category/those crimes" → last mentioned category
 *   - "show more/tell me more" → re-use last query context
 */
function resolveReferences(message, session) {
  const msgLower = message.toLowerCase();
  const entities = session.entities;
  let resolvedMessage = message;
  const resolvedEntities = {};

  // Pronoun resolution for suspects
  const suspectPronouns = /\b(his|her|their|this suspect|that suspect|the suspect|same suspect|that person|this person)\b/i;
  if (suspectPronouns.test(msgLower) && entities.suspect_name) {
    resolvedMessage = resolvedMessage.replace(
      suspectPronouns,
      entities.suspect_name
    );
    resolvedEntities.suspect_id = entities.suspect_id;
    resolvedEntities.suspect_name = entities.suspect_name;
  }

  // FIR reference resolution
  const firRefs = /\b(that case|this case|the case|same case|that FIR|this FIR|the FIR|same FIR)\b/i;
  if (firRefs.test(msgLower) && entities.fir_id) {
    resolvedMessage = resolvedMessage.replace(firRefs, entities.fir_id);
    resolvedEntities.fir_id = entities.fir_id;
  }

  // District reference resolution
  const districtRefs = /\b(same district|that district|this district|that area|same area|there)\b/i;
  if (districtRefs.test(msgLower) && entities.district) {
    resolvedMessage = resolvedMessage.replace(districtRefs, entities.district);
    resolvedEntities.district = entities.district;
  }

  // Category reference resolution
  const categoryRefs = /\b(that category|those crimes|same type|that type|these cases)\b/i;
  if (categoryRefs.test(msgLower) && entities.category) {
    resolvedMessage = resolvedMessage.replace(categoryRefs, entities.category);
    resolvedEntities.category = entities.category;
  }

  // "More" queries — carry forward all context
  const moreRefs = /\b(show more|tell me more|more details|more about|elaborate|expand on that|go deeper)\b/i;
  if (moreRefs.test(msgLower)) {
    Object.assign(resolvedEntities, entities);
  }

  return { resolvedMessage, resolvedEntities };
}

/**
 * Extract entities from a response to store in session context.
 */
function extractEntitiesFromResponse(response, message) {
  const extracted = {};

  // Extract from response data
  if (response.data) {
    if (response.data.district) extracted.district = response.data.district;
    if (response.data.category) extracted.category = response.data.category;
    if (response.data.fir_id) extracted.fir_id = response.data.fir_id;

    // Suspect profile data
    if (response.data.focus_suspect) {
      extracted.suspect_id = response.data.focus_suspect.suspect_id;
      extracted.suspect_name = response.data.focus_suspect.name;
    }
    if (response.data.suspect_id) extracted.suspect_id = response.data.suspect_id;
    if (response.data.suspect_name) extracted.suspect_name = response.data.suspect_name;
  }

  // Extract from graph data
  if (response.graph && response.graph.nodes && response.graph.nodes.length > 0) {
    // If focused on a single suspect's network, store that suspect
    const focusNode = response.graph.nodes[0];
    if (!extracted.suspect_id && focusNode) {
      extracted.suspect_id = focusNode.id;
      extracted.suspect_name = focusNode.name;
    }
  }

  // Extract from source documents
  if (response.source && response.source.documents && response.source.documents.length > 0) {
    extracted.fir_id = response.source.documents[0].fir_id;
  }

  return extracted;
}

/**
 * Clean up expired sessions periodically.
 */
function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastAccess > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupSessions, 5 * 60 * 1000);

module.exports = {
  getSession,
  addTurn,
  resolveReferences,
  extractEntitiesFromResponse,
};
