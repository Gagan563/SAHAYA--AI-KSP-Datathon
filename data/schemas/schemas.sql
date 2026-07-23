-- ============================================================
-- SAHAYA AI — Catalyst Data Store Schema Definitions (v2)
-- ============================================================
-- These mirror the Catalyst Data Store tables.
-- Catalyst auto-generates ROWID, CREATORID, CREATEDTIME, MODIFIEDTIME.
-- Create these tables via the Catalyst Console > Data Store UI.
--
-- v2 Changes:
--   - FIR_Records: added investigation_status, modus_operandi fields
--   - NEW: Victims table
--   - NEW: FIR_Victim_Mapping join table
--   - NEW: Monthly_Hotspots for time-based trend analytics
--   - NEW: Conversation_Sessions for context-aware chat
-- ============================================================

-- 1. FIR Records
-- Stores all First Information Report entries
CREATE TABLE FIR_Records (
    fir_id                TEXT NOT NULL,   -- e.g. "FIR-2024-BLR-0042"
    date_filed            TEXT NOT NULL,   -- ISO date "2024-11-15"
    district              TEXT NOT NULL,   -- "Bengaluru Urban"
    station               TEXT NOT NULL,   -- "Cubbon Park PS"
    description           TEXT NOT NULL,   -- Brief crime description
    category              TEXT NOT NULL,   -- Theft|Robbery|Assault|Cybercrime|Drug|Murder|Fraud|Missing
    latitude              DOUBLE,          -- GPS lat
    longitude             DOUBLE,          -- GPS lon
    investigation_status  TEXT DEFAULT 'Open',  -- Open|Under Investigation|Chargesheeted|Closed
    modus_operandi        TEXT             -- Free-text MO tag for repeat-offender profiling
);

-- 2. Suspects
-- Profile of known suspects
CREATE TABLE Suspects (
    suspect_id      TEXT NOT NULL,   -- e.g. "S001"
    name            TEXT NOT NULL,   -- Full name
    aliases         TEXT,            -- Comma-separated aliases
    age             INT,
    gender          TEXT,            -- Male|Female|Other
    district        TEXT NOT NULL,   -- Home district
    known_address   TEXT,
    risk_score      TEXT DEFAULT 'Low' -- Low|Medium|High (set by Zia AutoML)
);

-- 3. FIR ↔ Suspect Mapping
-- Join table linking FIRs to Suspects with role
CREATE TABLE FIR_Suspect_Mapping (
    fir_id          TEXT NOT NULL,
    suspect_id      TEXT NOT NULL,
    role            TEXT NOT NULL    -- Primary|Accomplice|Witness
);

-- 4. Victims (NEW)
-- Profile of victims linked to FIRs
CREATE TABLE Victims (
    victim_id       TEXT NOT NULL,   -- e.g. "V001"
    name            TEXT NOT NULL,   -- Full name or alias
    age             INT,
    gender          TEXT,            -- Male|Female|Other
    district        TEXT             -- District of residence
);

-- 5. FIR ↔ Victim Mapping (NEW)
-- Join table linking FIRs to Victims, mirroring suspect mapping pattern
CREATE TABLE FIR_Victim_Mapping (
    fir_id          TEXT NOT NULL,
    victim_id       TEXT NOT NULL
);

-- 6. Hotspot Answers (Precomputed)
-- Aggregated crime statistics per district/category
-- Written by the batch analytics Circuit
CREATE TABLE Hotspot_Answers (
    district        TEXT NOT NULL,
    crime_category  TEXT NOT NULL,
    case_count      INT NOT NULL,
    period          TEXT NOT NULL,   -- e.g. "Q4 2024", "2024-H2"
    computed_at     TEXT NOT NULL,   -- ISO timestamp of last computation
    trend           TEXT DEFAULT 'Stable' -- Rising|Stable|Declining
);

-- 7. Monthly Hotspots (NEW — Precomputed)
-- Monthly breakdown for time-based trend analytics and spike detection
-- Written by the batch analytics Circuit
CREATE TABLE Monthly_Hotspots (
    district        TEXT NOT NULL,
    crime_category  TEXT NOT NULL,
    report_month    TEXT NOT NULL,   -- "2024-11" format
    case_count      INT NOT NULL,
    computed_at     TEXT NOT NULL    -- ISO timestamp
);

-- 8. Suspect Clusters (Precomputed)
-- Connected components from graph analysis
-- Written by the batch analytics Circuit
CREATE TABLE Suspect_Clusters (
    cluster_id      TEXT NOT NULL,   -- e.g. "CLU-001"
    cluster_name    TEXT,            -- Human-readable label
    suspect_ids     TEXT NOT NULL,   -- JSON array: ["S001","S003","S007"]
    fir_ids         TEXT NOT NULL,   -- JSON array: ["FIR-2024-BLR-0042",...]
    cluster_size    INT NOT NULL,
    risk_level      TEXT DEFAULT 'Low', -- Highest risk in cluster
    primary_category TEXT,           -- Dominant crime type
    districts       TEXT,            -- JSON array of involved districts
    computed_at     TEXT NOT NULL    -- ISO timestamp
);

-- 9. Case Narratives (RAG corpus mirror)
-- Stored here for the serverless API; the same rows can be synced to
-- Catalyst NoSQL / QuickML Knowledge Base for richer retrieval.
CREATE TABLE Case_Narratives (
    fir_id                  TEXT NOT NULL,
    title                   TEXT NOT NULL,
    narrative               TEXT NOT NULL,
    modus_operandi          TEXT,
    evidence_summary        TEXT,
    investigating_officer   TEXT,
    suspects_linked         TEXT, -- JSON array: ["S001","S002"]
    status                  TEXT,
    created_at              TEXT,
    updated_at              TEXT
);

-- 10. Conversation Sessions (NEW)
-- Stores session state for context-aware follow-up queries
-- In production, consider Catalyst Cache for lower latency
CREATE TABLE Conversation_Sessions (
    session_id      TEXT NOT NULL,   -- UUID-like session identifier
    turns           TEXT NOT NULL,   -- JSON array of last N turns [{query, responseType, entities}]
    entities        TEXT NOT NULL,   -- JSON: current resolved entities {suspect_id, district, fir_id, ...}
    last_access     TEXT NOT NULL,   -- ISO timestamp
    ttl_minutes     INT DEFAULT 30  -- Auto-expire sessions after this many minutes
);

-- 10. Spike Alerts (NEW — Precomputed)
-- Districts/categories that exceed 1.5× the state average
-- Written by the batch analytics Circuit (hotspot_aggregator.py)
CREATE TABLE Spike_Alerts (
    district        TEXT NOT NULL,
    crime_category  TEXT NOT NULL,
    case_count      INT NOT NULL,    -- Actual count for this district/category
    state_average   DOUBLE NOT NULL, -- Average count across all districts for this category
    spike_ratio     DOUBLE NOT NULL, -- count / state_average (e.g. 2.3 = 2.3× average)
    alert           TEXT NOT NULL,   -- Human-readable alert string
    computed_at     TEXT NOT NULL    -- ISO timestamp
);

-- ============================================================
-- Batch-Generated JSON Artifacts (NOT stored in Data Store)
-- ============================================================
-- These files are written to data/samples/ by the batch pipeline
-- and consumed directly by the chat-api handlers:
--
-- graph_data.json
--   Schema: { nodes: [{ id, name, risk, district, group }],
--             links: [{ source, target, fir_id, label }] }
--   Purpose: Prebuilt force-graph JSON for frontend visualization
--
-- monthly_deltas (computed in memory, not persisted)
--   Schema: [{ district, crime_category, month, prev_month,
--              count, prev_count, change, pct_change, direction }]
--   Purpose: Month-over-month change for trend detection queries
-- ============================================================
