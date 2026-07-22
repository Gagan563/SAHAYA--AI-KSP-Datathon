"use client";

import dynamic from "next/dynamic";

// Wrapper that handles the dynamic/no-SSR import of Leaflet CrimeMap
const CrimeMapInner = dynamic(
  () => import("@/components/CrimeMap").then((mod) => mod.CrimeMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] flex items-center justify-center"
        style={{ height: 480 }}
      >
        <div className="text-[var(--color-text-muted)] animate-pulse text-sm">
          Loading crime map...
        </div>
      </div>
    ),
  }
);

export function CrimeMapWrapper() {
  return <CrimeMapInner />;
}
