# SAHAYA AI

**Hybrid Conversational Crime Intelligence Platform for KSP**

SAHAYA AI is a conversational intelligence platform built for the KSP - Datathon in collaboration with Zoho. It uses a hybrid approach, combining precomputed data for facts and numbers with a live Retrieval-Augmented Generation (RAG) system for narrative and exploratory queries.

## 🏗️ Project Structure

```
SAHAYA--AI-KSP-Datathon/
├── frontend/                # Next.js 16 app (Tailwind v4 + Radix UI)
│   ├── app/                 # Pages: Chat, Dashboard, Network, Reports
│   ├── components/          # 12 UI components
│   │   ├── ChatWindow.tsx          # AI chat interface + voice
│   │   ├── MessageBubble.tsx       # Rich response rendering
│   │   ├── ExplainabilityPanel.tsx  # Reasoning chain viewer
│   │   ├── CrimeMap.tsx            # Leaflet geospatial map
│   │   ├── TimeHeatmap.tsx         # 7×24 spatiotemporal grid
│   │   ├── ForecastPanel.tsx       # Crime trend sparklines
│   │   ├── CorrelationChart.tsx    # Socio-economic scatter plot
│   │   ├── AnomalyAlerts.tsx       # Z-score anomaly cards
│   │   ├── NetworkGraph.tsx        # Force-directed suspect graph
│   │   ├── HotspotCard.tsx         # Crime stat cards
│   │   └── Sidebar.tsx             # Navigation + system status
│   ├── lib/                 # Hooks, utilities, mock data
│   └── public/data/         # Published JSON artifacts for dashboard
├── functions/               # Catalyst serverless functions
│   ├── chat-api/            # Advanced I/O function for /api/chat
│   │   ├── index.js                # Main controller with session middleware
│   │   ├── intent-classifier.js    # 5-intent NLP router
│   │   ├── fact-handler.js         # Stats + spike detection
│   │   ├── rag-handler.js          # RAG with passage matching (QuickML)
│   │   ├── network-handler.js      # Graph queries
│   │   ├── profile-handler.js      # Suspect dossier + MO profiling
│   │   ├── summary-handler.js      # Case summary + similar cases
│   │   └── session-manager.js      # Context-aware session state
│   └── circuit-worker/      # Batch analytics (Python + NetworkX)
│       ├── main.py                 # Pipeline orchestrator
│       ├── forecaster.py           # Moving avg + linear regression + anomaly detection
│       ├── graph_analysis.py       # Connected component detection
│       ├── hotspot_aggregator.py   # District + monthly + spike analysis
│       ├── risk_scorer.py          # Rule-based risk assessment
│       └── Dockerfile              # AppSail container
├── data/                    # Data foundation
│   ├── generator/           # Synthetic data generator (Node.js)
│   ├── samples/             # 11 generated JSON data files
│   ├── demographics/        # Karnataka district stats (real data)
│   └── schemas/             # SQL schema definitions
├── scripts/                 # Deployment & upload helpers
├── docs/                    # Architecture & requirements docs
├── catalyst.json            # Catalyst project config
└── README.md                # This file
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

### Advanced Visualization (6 modules)
- **Geospatial Crime Map** — Interactive Leaflet map of Karnataka with district markers, FIR pins, and pulsing spike alerts
- **Spatiotemporal Heatmap** — 7×24 grid (day-of-week × hour) revealing crime timing patterns with peak-time detection
- **Crime Trend Forecasting** — 3-month moving average + linear regression with confidence bands and sparkline charts
- **Socio-Economic Correlation** — Canvas scatter plot correlating crime rates against urbanization, literacy, unemployment, and population density (Pearson r)
- **Z-Score Anomaly Detection** — Leave-one-out anomaly baseline with severity badges (Critical / High / Elevated)
- **Suspect Network Graph** — Force-directed visualization of criminal connections and crime ring clusters

### Analytics
- **Crime Hotspot Detection** — Per-district, per-category analytics with regression-derived trend labels
- **Spike Detection** — Flags district/category exceeding 1.5x state average
- **Monthly Trend Analysis** — Calendar-month bucketing with shared regression (not position-based)
- **Risk Scoring** — Rule-based threat assessment (upgradeable to Zia AutoML)
- **Crime Ring Detection** — NetworkX connected-component analysis

### Profiling
- **Suspect Profiles** — Full dossier with linked FIRs, aliases, risk reasoning
- **Repeat MO Detection** — Flags modus operandi patterns appearing 2+ times across a suspect's FIRs
- **Case Summaries** — Auto-generated briefs from case narratives
- **Similar Case Retrieval** — Word-trigram Jaccard similarity + category boosting

### UX
- **Kannada Voice Input** — Mic button with STT integration (Zia Services)
- **Text-to-Speech** — 🔊 button on every AI response for read-aloud
- **Dark "Police Intelligence" Theme** — Premium glassmorphism UI
- **Interactive Dashboard** — 8 analytical sections, all data from single source of truth
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

The batch pipeline (`circuit-worker/main.py` + `forecaster.py`) persists these derived files:

| File | Schema | Description |
|---|---|---|
| `forecast_answers.json` | `[{ district, crime_category, historical_counts, trend_slope, trend_direction, forecasted_periods }]` | Calendar-month regression forecasts with confidence bands |
| `anomaly_alerts.json` | `[{ district, crime_category, month, count, mean, std_dev, z_score, severity }]` | Leave-one-out Z-score anomalies |
| `hotspot_answers.json` | `[{ district, crime_category, count, period, trend, computed_at }]` | Aggregated hotspots with regression-derived trend labels |
| `graph_data.json` | `{ nodes: [{ id, name, risk, district, group }], links: [{ source, target, fir_id, label }] }` | Prebuilt force-graph JSON |
| `spike_alerts.json` | `[{ district, crime_category, count, state_average, spike_ratio, alert }]` | Districts exceeding 1.5× state average |

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

## 📋 Demo Script (15 Steps)

### Dashboard Analytics (Steps 1-6)
1. **Open Dashboard** → Show stat cards (total cases, rising hotspots, crime rings, high-risk suspects)
2. **Scroll to Map** → Interactive Leaflet map with district markers, pulsing spike alerts, zoom to Bengaluru
3. **Spatiotemporal Analysis** → Point out peak crime time (e.g. "Wednesday 11PM-12AM")
4. **Forecasting** → Show sparklines — highlight rising trends with confidence bands
5. **Correlation** → Toggle metric selector — show urbanization vs crime rate with Pearson r
6. **Anomaly Detection** → Show Z-score alerts or "all within 2σ" — explain leave-one-out methodology

### Conversational AI (Steps 7-13)
7. **Ask a fact** → "Which district has the highest theft cases?" → See DB-verified badge + reasoning chain
8. **Ask about spikes** → "Show emerging crime trends" → See spike alerts with ratios
9. **Ask a narrative** → "Tell me about chain snatching patterns" → See RAG sources
10. **Ask about networks** → "Show suspect connections" → See force-directed graph panel
11. **Profile a suspect** → "Profile of Ravi Kumar" → See dossier + repeat MO alert + crime ring
12. **Follow up** → "Show his other cases" → Context resolves "his" to Ravi Kumar
13. **Summarize a case** → "Summarize FIR-2024-BLR-0042" → See auto-summary + similar cases

### Polish (Steps 14-15)
14. **Explainability** → Click "Why this answer?" → See step-by-step reasoning chain
15. **Voice** → Click 🎤 for Kannada input, 🔊 for TTS read-aloud

---

Built for the **KSP × Zoho Datathon** 🇮🇳
