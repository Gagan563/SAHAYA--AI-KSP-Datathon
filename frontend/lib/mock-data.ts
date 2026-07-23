// ── SAHAYA AI — Mock Data (v2) ──
// Matches the /api/chat contract exactly.
// v2 adds: reasoning chains, profile/summary types, session_id, context_note

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  response?: ChatResponse;
}

export interface ChatResponse {
  type: "fact" | "narrative" | "network" | "profile" | "summary" | "error";
  answer: string;
  data: Record<string, unknown> | null;
  source: ResponseSource | null;
  graph: GraphData | null;
  reasoning?: string[] | null;
  session_id?: string;
  context_note?: string;
}

/** Source attribution shared by all response types. */
export interface ResponseSource {
  type: "database" | "rag";
  table?: string;
  verified_at?: string;
  documents?: Array<{ fir_id: string; title: string; relevance: number }>;
}

// ── Type-specific data shapes (for documentation / future strict typing) ──

/** data payload when type === "fact" */
export interface FactData {
  district?: string;
  category?: string;
  count?: number;
  period?: string;
  trend?: string;
  top5?: Array<{ district: string; count: number }>;
  spikes?: Array<{ district: string; category: string; count: number; spike_ratio: number }>;
}

/** data payload when type === "network" */
export interface NetworkData {
  total_suspects: number;
  total_links: number;
  cluster_count: number;
  high_risk_count: number;
  focus_suspect?: Record<string, unknown>;
}

/** data payload when type === "profile" */
export interface ProfileData {
  suspect_id: string;
  suspect_name: string;
  suspect: Record<string, unknown>;
  fir_count: number;
  fir_details?: Array<Record<string, unknown>>;
  repeat_mos: Array<{ pattern: string; count: number; is_category_match: boolean }>;
  cluster: { cluster_id: string; size: number; members: Array<{ id: string; name: string; risk: string }> } | null;
}

/** data payload when type === "summary" */
export interface SummaryData {
  fir_id: string;
  summary?: string;
  similar_cases: Array<{ fir_id: string; title: string; similarity: number; shared_mo: boolean }>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphNode {
  id: string;
  name: string;
  risk: "Low" | "Medium" | "High";
  district: string;
  group: number;
}

export interface GraphLink {
  source: string;
  target: string;
  fir_id?: string;
  label: string;
  weight?: number;
}

export interface HotspotEntry {
  district: string;
  crime_category: string;
  case_count: number;
  period: string;
  trend: "Rising" | "Stable" | "Declining";
  computed_at: string;
}

// ── Mock Chat Responses ──

export const MOCK_RESPONSES: Record<string, ChatResponse> = {
  fact_highest_theft: {
    type: "fact",
    answer:
      "Bengaluru Urban has the highest theft cases with 12 reported incidents in 2024-2025. The trend is currently rising, driven primarily by two-wheeler thefts and chain snatching near transit hubs. ⚠️ This is 2.4x the state average.",
    data: {
      district: "Bengaluru Urban",
      category: "Theft",
      count: 12,
      period: "2024-2025",
      trend: "Rising",
      top5: [
        { district: "Bengaluru Urban", count: 12 },
        { district: "Mysuru", count: 6 },
        { district: "Mangaluru", count: 4 },
        { district: "Hubli-Dharwad", count: 3 },
        { district: "Belagavi", count: 2 },
      ],
    },
    source: {
      type: "database",
      table: "Hotspot_Answers",
      verified_at: new Date().toISOString(),
    },
    reasoning: [
      "Query type: highest-by-category",
      "Data source: Hotspot_Answers table (precomputed, zero hallucination)",
      "Category filter: Theft",
      "Sorted by count descending to find highest-by-category",
      "⚠️ Spike detected: Bengaluru Urban/Theft is 2.4x the state average of 5.0",
      "Trend classification: Rising (based on count thresholds)",
      `Verified at: ${new Date().toISOString()}`,
    ],
    graph: null,
  },

  narrative_mo_pattern: {
    type: "narrative",
    answer:
      "Based on case records, the MG Road area has seen a recurring pattern of chain snatching incidents. The typical modus operandi involves two suspects on a motorcycle — the pillion rider executes the grab while the driver maintains low speed for quick escape. Targets are predominantly lone women pedestrians near metro station exits during evening hours (17:00-19:00). Three FIRs (FIR-2024-BLR-0042, FIR-2024-BLR-0058, FIR-2024-BLR-0071) share this exact MO pattern, and CCTV analysis suggests the same vehicle may be involved.\n\nModus Operandi: Two-wheeler chain snatching — pillion rider executes grab while rider maintains low speed\n\nEvidence: 1. FIR registered at Cubbon Park PS. 2. 3 witness statements collected. 3. CCTV footage analyzed. 4. Vehicle tracking in progress",
    data: {
      fir_id: "FIR-2024-BLR-0042",
      modus_operandi: "Two-wheeler chain snatching — pillion rider executes grab while rider maintains low speed",
    },
    source: {
      type: "rag",
      documents: [
        { fir_id: "FIR-2024-BLR-0042", title: "Chain snatching near MG Road Metro Station", relevance: 0.94 },
        { fir_id: "FIR-2024-BLR-0058", title: "Motorcycle theft at Brigade Road", relevance: 0.82 },
        { fir_id: "FIR-2024-BLR-0071", title: "Chain snatching at Commercial Street", relevance: 0.78 },
      ],
    },
    reasoning: [
      "Retrieval method: keyword + MO matching against 20 case narratives",
      "3 relevant documents found",
      'Key terms matched in top result: "chain", "snatching", "road"',
      'Most relevant passage: "On 2024-07-15, a case of theft was reported at Cubbon Park PS, Bengaluru Urban district..."',
      "Cross-reference: suspects in this case (S001, S002) also appear in 4 other FIR(s): FIR-2024-BLR-0058, FIR-2024-BLR-0063, FIR-2024-BLR-0071",
      'MO pattern match: "Two-wheeler chain snatching" also seen in 2 other case(s): FIR-2024-BLR-0058, FIR-2024-BLR-0071',
    ],
    graph: null,
  },

  network_crime_ring: {
    type: "network",
    answer:
      "Analysis reveals a connected crime ring of 4 suspects operating across Bengaluru Urban. The cluster has been linked to 6 FIRs primarily involving theft and chain snatching. Ravi Kumar (S001) emerges as the central node with highest degree centrality, suggesting a leadership role. Risk level: HIGH.",
    data: {
      total_suspects: 4,
      total_links: 5,
      cluster_count: 1,
      high_risk_count: 2,
    },
    source: {
      type: "database",
      table: "Suspect_Clusters",
      verified_at: new Date().toISOString(),
    },
    reasoning: [
      "Graph source: Suspect_Clusters table (precomputed via NetworkX connected-component analysis)",
      "Focus suspect: Ravi Kumar (S001), Risk: High",
      "Ravi Kumar ↔ Suresh Reddy (S002): co-accused in Theft case FIR-2024-BLR-0042 at Bengaluru Urban (2024-07-15)",
      "Ravi Kumar ↔ Manoj Gowda (S003): co-accused in Theft case FIR-2024-BLR-0058 at Bengaluru Urban (2024-08-22)",
      "Suresh Reddy ↔ Kiran Shetty (S004): co-accused in Robbery case FIR-2024-BLR-0063 at Bengaluru Urban (2024-09-10)",
      "Cluster size: 4 suspects, 5 shared FIRs, 2 high-risk member(s)",
    ],
    graph: {
      nodes: [
        { id: "S001", name: "Ravi Kumar", risk: "High", district: "Bengaluru Urban", group: 1 },
        { id: "S002", name: "Suresh Reddy", risk: "Medium", district: "Bengaluru Urban", group: 1 },
        { id: "S003", name: "Manoj Gowda", risk: "Medium", district: "Bengaluru Urban", group: 1 },
        { id: "S004", name: "Kiran Shetty", risk: "High", district: "Bengaluru Urban", group: 1 },
        { id: "S005", name: "Prakash Naik", risk: "Low", district: "Mysuru", group: 2 },
        { id: "S006", name: "Naveen Patil", risk: "Medium", district: "Mysuru", group: 2 },
        { id: "S007", name: "Deepak Rao", risk: "High", district: "Mangaluru", group: 3 },
        { id: "S008", name: "Anil Hegde", risk: "Medium", district: "Mangaluru", group: 3 },
        { id: "S009", name: "Ganesh Murthy", risk: "Low", district: "Hubli-Dharwad", group: 3 },
      ],
      links: [
        { source: "S001", target: "S002", fir_id: "FIR-2024-BLR-0042", label: "Co-accused in Theft" },
        { source: "S001", target: "S003", fir_id: "FIR-2024-BLR-0058", label: "Co-accused in Theft" },
        { source: "S002", target: "S004", fir_id: "FIR-2024-BLR-0063", label: "Co-accused in Robbery" },
        { source: "S003", target: "S004", fir_id: "FIR-2024-BLR-0071", label: "Co-accused in Theft" },
        { source: "S001", target: "S004", fir_id: "FIR-2024-BLR-0079", label: "Co-accused in Theft" },
        { source: "S005", target: "S006", fir_id: "FIR-2024-MYS-0015", label: "Co-accused in Drug" },
        { source: "S007", target: "S008", fir_id: "FIR-2024-MNG-0008", label: "Co-accused in Fraud" },
        { source: "S008", target: "S009", fir_id: "FIR-2024-HUB-0003", label: "Co-accused in Cybercrime" },
      ],
    },
  },

  profile_suspect: {
    type: "profile",
    answer:
      "**Suspect Profile: Ravi Kumar** (S001)\n\n• **Risk Level:** High\n• **Age:** 32 | **Gender:** Male\n• **District:** Bengaluru Urban\n• **Aliases:** Blade, Don\n• **Linked FIRs:** 4 (Primary in 2)\n• **Categories:** Theft, Robbery\n\n⚠️ **Repeat Pattern Detected:** \"Two-wheeler chain snatching\" (3x)\n\n🔗 **Crime Ring:** Member of CLU-001 with 4 suspects",
    data: {
      suspect_id: "S001",
      suspect_name: "Ravi Kumar",
      suspect: { suspect_id: "S001", name: "Ravi Kumar", age: 32, gender: "Male", district: "Bengaluru Urban", aliases: "Blade, Don", risk_score: "High" },
      fir_count: 4,
      repeat_mos: [
        { pattern: "Two-wheeler chain snatching — pillion rider executes grab while rider maintains low speed", count: 3, is_category_match: false },
        { pattern: "Theft (by category)", count: 3, is_category_match: true },
      ],
      cluster: { cluster_id: "CLU-001", size: 4, members: [
        { id: "S001", name: "Ravi Kumar", risk: "High" },
        { id: "S002", name: "Suresh Reddy", risk: "Medium" },
        { id: "S003", name: "Manoj Gowda", risk: "Medium" },
        { id: "S004", name: "Kiran Shetty", risk: "High" },
      ]},
    },
    source: {
      type: "database",
      table: "Suspects + FIR_Records + FIR_Suspect_Mapping",
      verified_at: new Date().toISOString(),
    },
    reasoning: [
      "Linked to 4 FIRs (high involvement)",
      "Primary suspect in 2 case(s)",
      'Repeat pattern detected: "Two-wheeler chain snatching — pillion rider executes grab while rider maintains low speed" across 3 FIRs',
      "Member of crime cluster CLU-001 (4 suspects)",
    ],
    graph: {
      nodes: [
        { id: "S001", name: "Ravi Kumar", risk: "High", district: "Bengaluru Urban", group: 1 },
        { id: "S002", name: "Suresh Reddy", risk: "Medium", district: "Bengaluru Urban", group: 1 },
        { id: "S003", name: "Manoj Gowda", risk: "Medium", district: "Bengaluru Urban", group: 1 },
        { id: "S004", name: "Kiran Shetty", risk: "High", district: "Bengaluru Urban", group: 1 },
      ],
      links: [
        { source: "S001", target: "S002", fir_id: "FIR-2024-BLR-0042", label: "Co-accused in Theft" },
        { source: "S001", target: "S003", fir_id: "FIR-2024-BLR-0058", label: "Co-accused in Theft" },
        { source: "S001", target: "S004", fir_id: "FIR-2024-BLR-0079", label: "Co-accused in Theft" },
      ],
    },
  },

  summary_case: {
    type: "summary",
    answer:
      '**Case Summary: FIR-2024-BLR-0042**\n"Theft case at Cubbon Park PS"\n\nOn 2024-07-15, a case of theft was reported at Cubbon Park PS, Bengaluru Urban district. Gold chain snatching incident near MG Road. The investigating team identified 2 suspect(s): Ravi Kumar, Suresh Reddy. MO: Two-wheeler chain snatching. Status: Under Investigation.\n\n**Similar Past Cases:**\n1. **FIR-2024-BLR-0058** — Theft case at Koramangala PS (82% match, Bengaluru Urban) ⚠️ Shared MO\n2. **FIR-2024-BLR-0071** — Theft case at Whitefield PS (68% match, Bengaluru Urban)\n3. **FIR-2024-MYS-0015** — Theft case at Devaraja PS (35% match, Mysuru)',
    data: {
      fir_id: "FIR-2024-BLR-0042",
      similar_cases: [
        { fir_id: "FIR-2024-BLR-0058", title: "Theft case at Koramangala PS", similarity: 0.82, shared_mo: true },
        { fir_id: "FIR-2024-BLR-0071", title: "Theft case at Whitefield PS", similarity: 0.68, shared_mo: false },
        { fir_id: "FIR-2024-MYS-0015", title: "Theft case at Devaraja PS", similarity: 0.35, shared_mo: false },
      ],
    },
    source: {
      type: "rag",
      documents: [
        { fir_id: "FIR-2024-BLR-0042", title: "Theft case at Cubbon Park PS", relevance: 1.0 },
        { fir_id: "FIR-2024-BLR-0058", title: "Theft case at Koramangala PS", relevance: 0.82 },
        { fir_id: "FIR-2024-BLR-0071", title: "Theft case at Whitefield PS", relevance: 0.68 },
      ],
    },
    reasoning: [
      "Auto-summary generated from Case_Narratives for FIR-2024-BLR-0042",
      "Similar cases found using word-trigram text similarity + category matching",
      "FIR-2024-BLR-0058: 82% similar (shared MO)",
      "FIR-2024-BLR-0071: 68% similar",
      "FIR-2024-MYS-0015: 35% similar",
    ],
    graph: null,
  },
};

// ── Mock Hotspot Data ──

export const MOCK_HOTSPOTS: HotspotEntry[] = [
  { district: "Bengaluru Urban", crime_category: "Theft", case_count: 12, period: "2024-2025", trend: "Rising", computed_at: new Date().toISOString() },
  { district: "Bengaluru Urban", crime_category: "Cybercrime", case_count: 8, period: "2024-2025", trend: "Rising", computed_at: new Date().toISOString() },
  { district: "Bengaluru Urban", crime_category: "Fraud", case_count: 6, period: "2024-2025", trend: "Stable", computed_at: new Date().toISOString() },
  { district: "Mysuru", crime_category: "Theft", case_count: 6, period: "2024-2025", trend: "Stable", computed_at: new Date().toISOString() },
  { district: "Mysuru", crime_category: "Drug", case_count: 4, period: "2024-2025", trend: "Rising", computed_at: new Date().toISOString() },
  { district: "Mangaluru", crime_category: "Robbery", case_count: 5, period: "2024-2025", trend: "Declining", computed_at: new Date().toISOString() },
  { district: "Hubli-Dharwad", crime_category: "Assault", case_count: 4, period: "2024-2025", trend: "Stable", computed_at: new Date().toISOString() },
  { district: "Belagavi", crime_category: "Theft", case_count: 3, period: "2024-2025", trend: "Declining", computed_at: new Date().toISOString() },
  { district: "Kalaburagi", crime_category: "Murder", case_count: 2, period: "2024-2025", trend: "Stable", computed_at: new Date().toISOString() },
  { district: "Shivamogga", crime_category: "Missing", case_count: 3, period: "2024-2025", trend: "Rising", computed_at: new Date().toISOString() },
];

// ── Suggested Queries ──

export const SUGGESTED_QUERIES = [
  { label: "Which district has the highest theft cases?", icon: "📊", intent: "fact" },
  { label: "Tell me about chain snatching patterns near MG Road", icon: "🔍", intent: "narrative" },
  { label: "Show suspect network connections", icon: "🕸️", intent: "network" },
  { label: "Profile of suspect Ravi Kumar", icon: "👤", intent: "profile" },
  { label: "Summarize FIR-2024-BLR-0042 and find similar cases", icon: "📝", intent: "summary" },
  { label: "Show emerging crime trends or spikes", icon: "⚠️", intent: "fact" },
];

// ── Mock initial messages ──

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Namaskara! 🙏 I'm **SAHAYA AI**, your Crime Intelligence Assistant for Karnataka State Police. I can help you with:\n\n• **Crime Statistics** — hotspot data, district comparisons, trend analysis, spike detection\n• **Case Narratives** — modus operandi patterns, case details, evidence summaries\n• **Suspect Networks** — criminal connections, risk profiles, gang visualization\n• **Suspect Profiles** — criminal history, repeat MO detection, risk reasoning\n• **Case Summaries** — auto-generated briefs with similar past cases\n\nI remember context — ask a follow-up like \"show his other cases\" after mentioning a suspect.\n\nYou can type in English or use the 🎤 microphone for Kannada voice input. How can I assist you today?",
    timestamp: new Date().toISOString(),
  },
];
