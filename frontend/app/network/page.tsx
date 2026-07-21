"use client";

import { Network } from "lucide-react";
import { NetworkGraph } from "@/components/NetworkGraph";
import { MOCK_RESPONSES } from "@/lib/mock-data";

export default function NetworkPage() {
  const graphData = MOCK_RESPONSES.network_crime_ring.graph;

  if (!graphData) return null;

  return (
    <div className="min-h-screen p-8 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
          <Network className="w-7 h-7 text-[var(--color-accent-cyan)]" />
          Suspect Network Analysis
        </h1>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
          Interactive visualization of criminal connections and suspect clusters
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-6 mb-6">
        <div className="glass-card rounded-lg px-4 py-2">
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase">Suspects</span>
          <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
            {graphData.nodes.length}
          </p>
        </div>
        <div className="glass-card rounded-lg px-4 py-2">
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase">Connections</span>
          <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
            {graphData.links.length}
          </p>
        </div>
        <div className="glass-card rounded-lg px-4 py-2">
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase">High Risk</span>
          <p className="text-lg font-bold font-mono text-[var(--color-accent-red)]">
            {graphData.nodes.filter((n) => n.risk === "High").length}
          </p>
        </div>
        <div className="glass-card rounded-lg px-4 py-2">
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase">Clusters</span>
          <p className="text-lg font-bold font-mono text-[var(--color-accent-purple)]">
            {new Set(graphData.nodes.map((n) => n.group)).size}
          </p>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 min-h-[500px]">
        <NetworkGraph data={graphData} />
      </div>
    </div>
  );
}
