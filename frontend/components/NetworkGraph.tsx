"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { GraphData, GraphNode } from "@/lib/mock-data";

interface NetworkGraphProps {
  data: GraphData;
}

const RISK_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

const GROUP_COLORS = [
  "#00d4ff",
  "#a855f7",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
];

/**
 * NetworkGraph — Canvas-based force-directed graph visualization.
 * Uses a simple spring-force simulation for node layout.
 * Falls back to canvas rendering for SSR compatibility (no react-force-graph-2d import issues).
 */
export function NetworkGraph({ data }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const nodesRef = useRef<(GraphNode & { x: number; y: number; vx: number; vy: number })[]>([]);
  const animationRef = useRef<number>(0);

  // Initialize node positions
  useEffect(() => {
    if (!data?.nodes) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    nodesRef.current = data.nodes.map((node, i) => ({
      ...node,
      x: centerX + (Math.random() - 0.5) * 300,
      y: centerY + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));
  }, [data, dimensions]);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Force simulation + rendering
  const simulate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes = nodesRef.current;
    const { links } = data;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Physics
    const repulsion = 2000;
    const attraction = 0.005;
    const damping = 0.85;
    const centerGravity = 0.01;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const link of links) {
      const source = nodeMap.get(typeof link.source === "string" ? link.source : link.source);
      const target = nodeMap.get(typeof link.target === "string" ? link.target : link.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Center gravity + apply velocity
    for (const node of nodes) {
      node.vx += (centerX - node.x) * centerGravity;
      node.vy += (centerY - node.y) * centerGravity;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;

      // Bounds clamping
      node.x = Math.max(40, Math.min(dimensions.width - 40, node.x));
      node.y = Math.max(40, Math.min(dimensions.height - 40, node.y));
    }

    // ── Render ──
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw edges
    for (const link of links) {
      const source = nodeMap.get(typeof link.source === "string" ? link.source : link.source);
      const target = nodeMap.get(typeof link.target === "string" ? link.target : link.target);
      if (!source || !target) continue;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = "rgba(0, 212, 255, 0.15)";
      ctx.lineWidth = (link.weight || 1) * 1.5;
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      const riskColor = RISK_COLORS[node.risk] || RISK_COLORS.Low;
      const groupColor = GROUP_COLORS[(node.group - 1) % GROUP_COLORS.length] || GROUP_COLORS[0];
      const isHovered = hoveredNode?.id === node.id;
      const radius = isHovered ? 14 : 10;

      // Glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        node.x, node.y, radius,
        node.x, node.y, radius + 6
      );
      gradient.addColorStop(0, riskColor + "40");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = riskColor + "30";
      ctx.fill();
      ctx.strokeStyle = riskColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = riskColor;
      ctx.fill();

      // Label
      ctx.font = isHovered ? "bold 11px Inter, sans-serif" : "10px Inter, sans-serif";
      ctx.fillStyle = isHovered ? "#e2e8f0" : "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(node.name, node.x, node.y + radius + 14);

      // Risk badge
      if (isHovered) {
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.fillStyle = riskColor;
        ctx.fillText(node.risk.toUpperCase(), node.x, node.y + radius + 26);
      }
    }

    animationRef.current = requestAnimationFrame(simulate);
  }, [data, dimensions, hoveredNode]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [simulate]);

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const nodes = nodesRef.current;
    let found: GraphNode | null = null;
    for (const node of nodes) {
      const dx = mx - node.x;
      const dy = my - node.y;
      if (dx * dx + dy * dy < 256) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  }, []);

  return (
    <div ref={containerRef} className="graph-container w-full h-full relative">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        className="relative z-10"
        style={{ cursor: hoveredNode ? "pointer" : "default" }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass-card rounded-lg p-3 z-20">
        <p className="text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
          Risk Level
        </p>
        <div className="space-y-1.5">
          {Object.entries(RISK_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2 text-[10px]">
              <div
                className="w-3 h-3 rounded-full border-2"
                style={{ borderColor: color, backgroundColor: color + "30" }}
              />
              <span className="text-[var(--color-text-secondary)]">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hovered Node Info */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 glass-card rounded-lg p-3 z-20 min-w-[180px] animate-fade-in">
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">
            {hoveredNode.name}
          </p>
          <p className="text-[10px] font-mono text-[var(--color-accent-cyan)] mt-0.5">
            {hoveredNode.id}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded risk-${hoveredNode.risk.toLowerCase()}`}
            >
              {hoveredNode.risk} Risk
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {hoveredNode.district}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
