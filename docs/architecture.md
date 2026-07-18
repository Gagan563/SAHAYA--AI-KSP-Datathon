# SAHAYA AI: System Architecture

## Overview
A dual-path architecture combining a scheduled offline pipeline (for heavy ML/Graph compute) with a fast, lightweight online conversational layer.

## 1. Frontend & Client Layer
- **Framework:** Next.js + Tailwind CSS (Premium Dark Mode Dashboard).
- **Hosting:** Catalyst Web Client Hosting / Slate.
- **Visuals:** Integration of `react-force-graph` for visualizing criminal networks.

## 2. API & Routing Layer (Online)
- **Gateway:** Catalyst API Gateway.
- **Auth:** Catalyst Authentication (RBAC for Investigator vs. Supervisor).
- **Router Function:** Catalyst Advanced I/O Function that uses QuickML LLM Serving as an Intent Classifier to decide between the Fact Path and RAG Path.

## 3. Data & Storage Layer
- **Structured Data (Catalyst Data Store):** FIR records, suspect profiles, mapped relations, and precomputed hotspot tables.
- **Unstructured Data (Catalyst NoSQL):** Raw FIR text, modus operandi descriptions.
- **Knowledge Base:** QuickML KB synced with NoSQL for RAG.
- **Files:** Catalyst Stratus for PDF exports and images.

## 4. The Intelligence Engine (Offline Circuit)
Orchestrated via **Catalyst Circuits** and **Job Scheduling**:
1. Pulls raw FIRs from Data Store.
2. Runs Graph clustering (NetworkX in **AppSail**).
3. Evaluates suspect threat levels (**Zia AutoML**).
4. Writes the aggregated insights back to the `Precomputed_Answers` Data Store tables.

## 5. Value-Add Services
- **Zia Voice / Translate:** Kannada support.
- **SmartBrowz:** Headless browser PDF rendering for official KSP reports.
- **Catalyst Pipelines:** CI/CD for all code.
