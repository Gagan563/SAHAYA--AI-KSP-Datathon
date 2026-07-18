# SAHAYA AI: Project Requirements

## Core Objective
To build a Hybrid Conversational Crime Intelligence Platform for the Karnataka State Police (KSP). The platform must be highly practical, cost-efficient, and scalable to support over 1,100 police stations across the state.

## Key Constraints & Goals
- **Platform:** 100% deployment on Zoho Catalyst services.
- **Scale & Cost:** Serverless-first approach to minimize idle costs while scaling seamlessly for 1,100+ stations.
- **Accuracy:** Zero hallucinations for factual data. Precomputation is mandatory for statistics.

## Feature Requirements
1. **Hybrid Conversational Engine (The Brain)**
   - **Fact Path:** Routing specific questions (e.g., crime counts, hotspot zones) directly to precomputed, heavily cached Data Store tables.
   - **Narrative Path:** Routing open-ended questions (e.g., MO summaries) to a Retrieval-Augmented Generation (RAG) system running over QuickML Knowledge Bases.

2. **Advanced Intelligence & ML ("The Movie Detective Board")**
   - **Network Analysis:** Identify connected suspects, recurring vehicles, and shared locations across disparate FIRs (using NetworkX via AppSail).
   - **Pattern Recognition:** Discover emerging crime hotspots and link seemingly unrelated cases.
   - **Risk Scoring:** Assign automated threat scores to repeat offenders using Zia AutoML.

3. **Localization & Accessibility**
   - Seamless Kannada-to-English translation.
   - Voice-to-text integration for officers in the field (Zia Services).

4. **Reporting & Auditing**
   - Automated generation of shareable, PDF Intelligence Dossiers using Catalyst SmartBrowz.
   - Deep explainability for every AI response (showing exactly which database table or FIR chunk the answer came from).
