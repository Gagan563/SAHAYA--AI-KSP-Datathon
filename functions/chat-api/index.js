/**
 * SAHAYA AI — Chat API
 * Catalyst Advanced I/O Serverless Function
 *
 * Handles POST /api/chat with intent routing:
 *   - Fact path     → queries Hotspot_Answers / Suspect_Clusters from Data Store
 *   - RAG path      → queries QuickML Knowledge Base for narrative answers
 *   - Network path  → returns suspect graph data for visualization
 *   - Profile path  → suspect profile with MO history, risk reasoning, cluster info
 *   - Summary path  → case summary + similar cases for a given FIR
 *
 * Session-aware: maintains conversation context for follow-up queries.
 * Currently runs with mock data. Wire to Catalyst SDK when project is linked.
 */

const express = require("express");
const { classifyIntent } = require("./intent-classifier");
const { handleFactQuery } = require("./fact-handler");
const { handleRAGQuery } = require("./rag-handler");
const { handleNetworkQuery } = require("./network-handler");
const { handleProfileQuery } = require("./profile-handler");
const { handleSummaryQuery } = require("./summary-handler");
const {
  getSession,
  addTurn,
  resolveReferences,
  extractEntitiesFromResponse,
} = require("./session-manager");

const app = express();
app.use(express.json());

// CORS for frontend dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/**
 * POST /api/chat
 * Request:  { message: string, session_id?: string, language?: "en" | "kn" }
 * Response: { type, answer, data, source, reasoning, graph, session_id }
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, session_id, language = "en" } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        type: "error",
        answer: "Please provide a valid message.",
        data: null,
        source: null,
        reasoning: null,
        graph: null,
        session_id: null,
      });
    }

    // Step 0: Get or create session
    const session = getSession(session_id);

    // Step 1: Resolve pronouns/references using session context
    const { resolvedMessage, resolvedEntities } = resolveReferences(message, session);
    const wasResolved = resolvedMessage !== message;

    if (wasResolved) {
      console.log(`[SAHAYA] Resolved: "${message}" → "${resolvedMessage}"`);
    }

    // Step 2: Classify intent (on resolved message)
    const intent = classifyIntent(resolvedMessage);
    console.log(`[SAHAYA] Intent: ${intent.type} | Confidence: ${intent.confidence} | Query: "${resolvedMessage}"`);

    // Step 3: Route to handler
    let response;
    switch (intent.type) {
      case "fact":
        response = await handleFactQuery(resolvedMessage, intent);
        break;
      case "network":
        response = await handleNetworkQuery(resolvedMessage, intent);
        break;
      case "profile":
        response = await handleProfileQuery(resolvedMessage, intent, session.entities);
        break;
      case "summary":
        response = await handleSummaryQuery(resolvedMessage, intent, session.entities);
        break;
      case "narrative":
      default:
        response = await handleRAGQuery(resolvedMessage, intent);
        break;
    }

    // Step 4: Extract entities from response and update session
    const extracted = {
      ...resolvedEntities,
      ...extractEntitiesFromResponse(response, resolvedMessage),
      ...(response.session_entities || {}),
    };
    addTurn(session, message, response, extracted);

    // Step 5: Attach session ID and context resolution note
    response.session_id = session.id;
    if (wasResolved) {
      response.context_note = `(Resolved from context: "${message}" → "${resolvedMessage}")`;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SAHAYA] Error:", error);
    return res.status(500).json({
      type: "error",
      answer: "An internal error occurred. Please try again.",
      data: null,
      source: null,
      reasoning: null,
      graph: null,
      session_id: null,
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "sahaya-chat-api", timestamp: new Date().toISOString() });
});

// For Catalyst Advanced I/O, export the app
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[SAHAYA] Chat API running on port ${PORT}`);
  });
}
