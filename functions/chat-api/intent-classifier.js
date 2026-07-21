/**
 * SAHAYA AI — Intent Classifier (v2)
 *
 * Lightweight keyword + regex intent router.
 * Classifies user queries into: fact | narrative | network | profile | summary
 *
 * Checks session context first for pronoun/reference resolution.
 * In production, this can be replaced with QuickML LLM-based classification.
 */

// Keyword patterns for each intent type
const FACT_PATTERNS = [
  /\b(how many|count|total|number of|statistics|stats)\b/i,
  /\b(highest|lowest|most|least|top|maximum|minimum)\b/i,
  /\b(hotspot|hot spot|crime rate|frequency)\b/i,
  /\b(which district|which area|which station)\b/i,
  /\b(trend|rising|declining|increasing|decreasing)\b/i,
  /\b(compare|comparison|versus|vs)\b/i,
  /\b(percentage|percent|ratio)\b/i,
  /\b(last quarter|this year|last year|monthly|yearly|weekly|last month|this month)\b/i,
  /\b(spike|surge|jump|drop|fell|rose)\b/i,
  /\b(theft cases|robbery cases|assault cases|murder cases|drug cases|fraud cases|cybercrime cases|missing persons?)\b/i,
];

const NETWORK_PATTERNS = [
  /\b(network|connection|linked|connected|associated|ring|gang|syndicate|cluster)\b/i,
  /\b(suspect.*graph|crime.*ring|criminal.*network)\b/i,
  /\b(co-accused|accomplice|associate|co.?offender)\b/i,
  /\b(who.*connected|who.*linked|related suspects)\b/i,
  /\b(show.*graph|show.*network|visuali[sz]e|map.*connections)\b/i,
  /\b(crime ring|gang members|organized crime)\b/i,
];

const NARRATIVE_PATTERNS = [
  /\b(tell me about|describe|explain|what happened|narrate)\b/i,
  /\b(modus operandi|method|how did|pattern of)\b/i,
  /\b(case.*details|case.*history|investigation|evidence)\b/i,
  /\b(similar cases|like this|pattern|recurring)\b/i,
  /\b(FIR.*details|case.*narrative|incident.*report)\b/i,
];

const PROFILE_PATTERNS = [
  /\b(profile|profil|background|dossier|rap sheet|criminal record)\b/i,
  /\b(who is|about suspect|suspect info|suspect details)\b/i,
  /\b(repeat offender|habitual|recidivist|history of)\b/i,
  /\b(MO history|modus operandi history|crime history)\b/i,
  /\b(his cases|her cases|their cases|other cases)\b/i,
  /\b(risk score|risk level|threat level|risk assessment)\b/i,
  /\b(show.*suspect|lookup.*suspect)\b/i,
];

const SUMMARY_PATTERNS = [
  /\b(summary|summarize|summarise|brief|overview|synopsis)\b/i,
  /\b(case summary|case brief|FIR summary)\b/i,
  /\b(similar.*past|past.*similar|related.*cases|matching.*cases)\b/i,
  /\b(cases like|similar to|resembles|matches)\b/i,
  /\b(auto.?summary|generate.*summary)\b/i,
];

/**
 * Classify the intent of a user message.
 * Returns { type: 'fact'|'narrative'|'network'|'profile'|'summary', confidence, matchedPatterns }
 */
function classifyIntent(message) {
  const scores = {
    fact: 0,
    network: 0,
    narrative: 0,
    profile: 0,
    summary: 0,
  };
  const matched = {
    fact: [],
    network: [],
    narrative: [],
    profile: [],
    summary: [],
  };

  const patternSets = {
    fact: FACT_PATTERNS,
    network: NETWORK_PATTERNS,
    narrative: NARRATIVE_PATTERNS,
    profile: PROFILE_PATTERNS,
    summary: SUMMARY_PATTERNS,
  };

  // Score each pattern category
  Object.entries(patternSets).forEach(([intentType, patterns]) => {
    patterns.forEach((pattern) => {
      const match = message.match(pattern);
      if (match) {
        scores[intentType]++;
        matched[intentType].push(match[0]);
      }
    });
  });

  // Determine winner
  const entries = Object.entries(scores);
  const maxScore = Math.max(...entries.map(([, s]) => s));
  let type = "narrative"; // Default to RAG
  let confidence = 0.5;

  if (maxScore > 0) {
    const sorted = entries.sort(([, a], [, b]) => b - a);
    type = sorted[0][0];

    const margin = sorted[0][1] - (sorted[1]?.[1] || 0);
    confidence = Math.min(0.5 + margin * 0.12 + sorted[0][1] * 0.08, 0.99);
  }

  return {
    type,
    confidence: Math.round(confidence * 100) / 100,
    matchedPatterns: matched[type],
    allScores: scores,
  };
}

module.exports = { classifyIntent };
