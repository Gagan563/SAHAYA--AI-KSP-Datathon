# Case_Narratives — Catalyst NoSQL Schema

This is a **Catalyst NoSQL** (Table) document. Each document represents the full narrative of one FIR case, used for RAG ingestion via QuickML Knowledge Base.

## Table Name
`Case_Narratives`

## Document Structure

```json
{
  "fir_id": "FIR-2024-BLR-0042",
  "title": "Chain snatching near MG Road Metro Station",
  "narrative": "On November 15, 2024, at approximately 18:30 hours, the complainant Smt. Lakshmi Devi (age 45) was walking near the MG Road Metro Station exit when two unidentified males on a black Pulsar motorcycle (partial plate KA-01-XX-####) approached from behind. The pillion rider snatched a gold chain (approx. 25g, valued at ₹1,25,000) from the complainant's neck. The suspects fled towards Trinity Circle. CCTV footage from the metro station captured the incident. The complainant sustained minor injuries to the neck area.",
  "modus_operandi": "Two-wheeler chain snatching — pillion rider executes grab while rider maintains low speed for quick escape. Target: lone women pedestrians near transit hubs during evening hours.",
  "evidence_summary": "1. CCTV footage (Metro Station Camera #3, 18:28-18:32). 2. Partial vehicle registration. 3. Complainant statement. 4. Medical report from Victoria Hospital.",
  "investigating_officer": "SI Ramesh Kumar, Cubbon Park PS",
  "suspects_linked": ["S012", "S015"],
  "status": "Under Investigation",
  "created_at": "2024-11-15T10:30:00+05:30",
  "updated_at": "2024-11-20T14:15:00+05:30"
}
```

## Field Descriptions

| Field | Type | Description |
|---|---|---|
| `fir_id` | String (key) | Unique FIR identifier, matches `FIR_Records.fir_id` |
| `title` | String | Short human-readable case title |
| `narrative` | String | Full case narrative — this is the primary text ingested by RAG |
| `modus_operandi` | String | Describes the criminal method used |
| `evidence_summary` | String | Summary of evidence collected |
| `investigating_officer` | String | Name and station of IO |
| `suspects_linked` | Array | Suspect IDs linked to this case |
| `status` | String | Case status (FIR Filed / Under Investigation / Chargesheeted / Closed) |
| `created_at` | String | ISO 8601 timestamp |
| `updated_at` | String | ISO 8601 timestamp |

## Notes
- The `narrative` field is the primary content used for QuickML Knowledge Base ingestion.
- Keep narratives between 100–500 words for optimal RAG chunk sizing.
- All PII in synthetic data is fictional.
