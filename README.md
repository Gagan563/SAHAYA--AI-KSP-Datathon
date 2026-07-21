# SAHAYA AI

**Hybrid Conversational Crime Intelligence Platform for KSP**

SAHAYA AI is a conversational intelligence platform built for the KSP - Datathon in collaboration with Zoho. It uses a hybrid approach, combining precomputed data for facts and numbers with a live Retrieval-Augmented Generation (RAG) system for narrative and exploratory queries.

## 🏗️ Project Structure

```
SAHAYA--AI-KSP-Datathon/
├── frontend/              # Next.js 16 app (Tailwind v4 + Radix UI)
│   ├── app/               # Pages: Chat, Dashboard, Network, Reports
│   ├── components/        # Reusable UI components
│   └── lib/               # Mock data, utilities
├── functions/             # Catalyst serverless functions
│   ├── chat-api/          # Advanced I/O function for /api/chat
│   │   ├── index.js       # Main controller with session middleware
│   │   ├── intent-classifier.js  # 5-intent regex router
│   │   ├── fact-handler.js       # Stats + spike detection
│   │   ├── rag-handler.js        # RAG with passage matching
│   │   ├── network-handler.js    # Graph queries
│   │   ├── profile-handler.js    # Suspect dossier + MO profiling
│   │   ├── summary-handler.js    # Case summary + similar cases
│   │   └── session-manager.js    # Context-aware session state
│   └── circuit-worker/    # Batch analytics (NetworkX, Python)
│       ├── main.py             # Pipeline orchestrator
│       ├── graph_analysis.py   # Connected component detection
│       ├── hotspot_aggregator.py # District + monthly + spike analysis
│       └── risk_scorer.py      # Rule-based risk assessment
├── data/                  # Data foundation
│   ├── generator/         # Synthetic data generator (Node.js)
│   ├── samples/           # Generated JSON data files
│   └── schemas/           # SQL schema definitions
├── docs/                  # Architecture & requirements docs
├── catalyst.json          # Catalyst project config (placeholder)
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (required by Next.js 16)
- Python 3.11+ (for batch analytics)
- npm

### 1. Generate Synthetic Data
```bash
cd data/generator
node generate-data.js
```
Creates 80 FIRs (with MO + investigation_status), 40 suspects, 98 victims, 146 FIR↔Suspect mappings, 98 FIR↔Victim mappings, 20 case narratives, 78 monthly hotspot entries, and prebuilt graph data in `data/samples/`.

### 2. Run Frontend (Development)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 3. Run Chat API (Local)
```bash
cd functions/chat-api
npm install
node index.js
```
API runs on [http://localhost:3001](http://localhost:3001).

### 4. Run Batch Analytics
```bash
cd functions/circuit-worker
pip install -r requirements.txt
python main.py
```

## 🎯 Features

### Core Intelligence
- **Hybrid Chat Engine** — Fact path (precomputed DB) + Narrative path (RAG)
- **5-Intent Classifier** — Automatic routing: fact, narrative, network, profile, summary
- **Context-Aware Conversations** — Session state tracks entities; follow-ups like "show his other cases" resolve automatically
- **Explainability + Reasoning** — Every answer shows its source AND a "Why this answer?" reasoning chain

### Analytics
- **Suspect Network Graph** — Force-directed visualization of criminal connections
- **Crime Hotspot Detection** — Per-district, per-category analytics with trends
- **Spike Detection** — Flags district/category exceeding 1.5x state average
- **Monthly Trend Analysis** — Time-based bucketing with month-over-month deltas
- **Risk Scoring** — Rule-based (upgradeable to Zia AutoML) threat assessment
- **Crime Ring Detection** — NetworkX connected-component analysis

### Profiling
- **Suspect Profiles** — Full dossier with linked FIRs, aliases, risk reasoning
- **Repeat MO Detection** — Flags modus operandi patterns appearing 2+ times across a suspect's FIRs
- **Case Summaries** — Auto-generated briefs from case narratives
- **Similar Case Retrieval** — Word-trigram Jaccard similarity + category boosting

### UX
- **Kannada Voice Input** — Mic button with STT integration
- **Text-to-Speech** — 🔊 button on every AI response for read-aloud (Web Speech API)
- **Dark "Police Intelligence" Theme** — Premium glassmorphism UI
- **Interactive Dashboard** — Stat cards, bar charts, trend indicators
- **PDF Export** — SmartBrowz-based report generation

## 🔌 Zoho Catalyst Setup

> **Note:** The project currently runs with mock data locally. To connect to Zoho Catalyst:

1. Install Catalyst CLI: `npm install -g zcatalyst-cli`
2. Login: `catalyst login`
3. Initialize: `catalyst init` (link to your project)
4. Create Data Store tables per `data/schemas/schemas.sql`
5. Create NoSQL table per `data/schemas/case_narratives_schema.md`
6. Deploy chat function: `catalyst deploy --only functions`
7. Deploy frontend: `catalyst deploy --only client`

## 📊 `/api/chat` Contract (v2)

```jsonc
// REQUEST
POST /api/chat
{
  "message": "Which district has the highest theft cases?",
  "session_id": "optional — returned in every response",
  "language": "en"
}

// RESPONSE — all types share this envelope
{
  "type": "fact | narrative | network | profile | summary | error",
  "answer": "Bengaluru Urban has the highest...",
  "data": { /* type-specific, see table below */ },
  "source": {
    "type": "database | rag",
    "table": "Hotspot_Answers",           // present when source.type === "database"
    "verified_at": "ISO timestamp",       // present when source.type === "database"
    "documents": [{ "fir_id": "...", "title": "...", "relevance": 0.94 }]  // present when source.type === "rag"
  },
  "reasoning": [
    "Query type: highest-by-category",
    "Data source: Hotspot_Answers table (precomputed, zero hallucination)"
  ],
  "graph": {                              // present for network/profile types, null otherwise
    "nodes": [{ "id": "S001", "name": "Ravi Kumar", "risk": "High", "district": "Bengaluru Urban", "group": 1 }],
    "links": [{ "source": "S001", "target": "S002", "fir_id": "FIR-2024-BLR-0042", "label": "Co-accused in Theft" }]
  },
  "session_id": "sess_xxx_yyy",
  "context_note": "(Resolved from context: 'his cases' → 'Ravi Kumar's cases')"
}
```

### Response Types

| Type | Trigger Examples | Data Source | `data` payload |
|---|---|---|---|
| `fact` | "how many theft cases", "highest", "any spikes" | `Hotspot_Answers` | `{ district, category, count, trend, top5?, spikes? }` |
| `narrative` | "tell me about chain snatching", "modus operandi" | `Case_Narratives` (RAG) | `{ fir_id, modus_operandi }` |
| `network` | "show suspect connections", "crime ring" | `Suspect_Clusters` | `{ total_suspects, total_links, cluster_count, high_risk_count }` |
| `profile` | "profile of Ravi Kumar", "his cases", "risk score" | `Suspects` + `FIR_Records` | `{ suspect_id, suspect_name, fir_count, repeat_mos, cluster }` |
| `summary` | "summarize FIR-2024-BLR-0042", "similar cases" | `Case_Narratives` | `{ fir_id, summary, similar_cases }` |

## 📊 Data Schema

| Table | Records | Key Fields |
|---|---|---|
| `FIR_Records` | 80 | fir_id, category, district, investigation_status, modus_operandi |
| `Suspects` | 40 | suspect_id, name, aliases, risk_score |
| `Victims` | ~98 | victim_id, name, age, gender |
| `FIR_Suspect_Mapping` | ~146 | fir_id, suspect_id, role (Primary/Accomplice/Witness) |
| `FIR_Victim_Mapping` | ~98 | fir_id, victim_id |
| `Case_Narratives` | 20 | fir_id, narrative, modus_operandi, evidence_summary |
| `Hotspot_Answers` | ~47 | district, crime_category, count, trend |
| `Monthly_Hotspots` | ~78 | district, crime_category, month, count |
| `Suspect_Clusters` | 6 | cluster_id, suspect_ids, fir_ids, risk_level |
| `Conversation_Sessions` | runtime | session_id, turns, entities |

### Batch-Generated Artifacts

The batch pipeline (`circuit-worker/main.py`) also persists these derived files:

| File | Schema | Description |
|---|---|---|
| `spike_alerts.json` | `[{ district, crime_category, count, state_average, spike_ratio, alert }]` | Districts exceeding 1.5× state average |
| `graph_data.json` | `{ nodes: [{ id, name, risk, district, group }], links: [{ source, target, fir_id, label }] }` | Prebuilt force-graph JSON for frontend visualization |

## 🏆 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, Tailwind CSS v4, Radix UI, TypeScript |
| Chat API | Node.js + Express (Catalyst Advanced I/O) |
| Analytics | Python + NetworkX (Catalyst AppSail) |
| Database | Catalyst Data Store (SQL) + NoSQL |
| RAG | QuickML Knowledge Base |
| ML | Zia AutoML (risk scoring) |
| Voice | Zia Speech/Translate (Kannada) + Web Speech API (TTS) |
| Reports | SmartBrowz (PDF) |
| Orchestration | Catalyst Circuits + Job Scheduling |

## 📋 Demo Script

1. **Open Dashboard** → Show hotspot cards and district comparison (53 cases, 6 crime rings)
2. **Ask a fact** → "Which district has the highest theft cases?" → See DB-verified badge + reasoning chain
3. **Ask about spikes** → "Show emerging crime trends" → See spike alerts with ratios
4. **Ask a narrative** → "Tell me about chain snatching patterns" → See RAG sources + MO cross-references
5. **Ask about networks** → "Show suspect connections" → See force-directed graph panel
6. **Profile a suspect** → "Profile of Ravi Kumar" → See dossier + repeat MO alert + crime ring
7. **Follow up** → "Show his other cases" → Context resolves "his" to Ravi Kumar
8. **Summarize a case** → "Summarize FIR-2024-BLR-0042" → See auto-summary + similar cases
9. **Click "Why this answer?"** → See step-by-step reasoning chain
10. **Use Kannada mic** → Click 🎤 and speak → See transcription + response
11. **Listen to response** → Click 🔊 → Hear TTS read-aloud
12. **Export** → Click "Save as PDF" for report generation

---

Built for the **KSP × Zoho Datathon** 🇮🇳
