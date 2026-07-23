"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

/**
 * Interactive Crime Map using Leaflet.js
 * Shows: district markers (sized by crime count, colored by severity),
 * pulsing red zones for spike districts, and FIR location pins.
 *
 * Dynamically imported (no SSR) to avoid window reference errors.
 */

// Types for our data
interface FIRRecord {
  fir_id: string;
  district: string;
  category: string;
  latitude: number;
  longitude: number;
  date_filed: string;
  time_of_incident?: string;
  hour_of_day?: number;
  day_of_week?: string;
}

interface DistrictStats {
  name: string;
  lat: number;
  lon: number;
  totalCrimes: number;
  categories: Record<string, number>;
  isSpike: boolean;
}

type LeafletModule = typeof import("leaflet");

// Karnataka district coordinates
const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Bengaluru Urban": [12.9716, 77.5946],
  "Bengaluru Rural": [13.1986, 77.7066],
  "Mysuru": [12.2958, 76.6394],
  "Mangaluru": [12.8745, 74.8423],
  "Hubli-Dharwad": [15.3647, 75.124],
  "Belagavi": [15.8497, 74.4977],
  "Kalaburagi": [17.329, 76.8343],
  "Shivamogga": [13.9299, 75.5681],
  "Tumakuru": [13.3379, 77.117],
  "Davangere": [14.4644, 75.9218],
};

function getSeverityColor(count: number, maxCount: number): string {
  const ratio = count / maxCount;
  if (ratio > 0.7) return "#ef4444"; // red
  if (ratio > 0.4) return "#f59e0b"; // amber
  return "#22c55e"; // green
}

function renderMockData(L: LeafletModule, map: LeafletMap) {
  // Fallback with hardcoded data if JSON import fails
  const mockDistricts = [
    { name: "Bengaluru Urban", lat: 12.9716, lon: 77.5946, count: 22, spike: true },
    { name: "Mysuru", lat: 12.2958, lon: 76.6394, count: 12, spike: false },
    { name: "Mangaluru", lat: 12.8745, lon: 74.8423, count: 8, spike: false },
    { name: "Hubli-Dharwad", lat: 15.3647, lon: 75.124, count: 9, spike: false },
    { name: "Belagavi", lat: 15.8497, lon: 74.4977, count: 7, spike: false },
    { name: "Kalaburagi", lat: 17.329, lon: 76.8343, count: 6, spike: false },
  ];

  for (const d of mockDistricts) {
    const color = d.spike ? "#ef4444" : d.count > 10 ? "#f59e0b" : "#22c55e";
    const radius = 15 + (d.count / 22) * 35;

    L.circleMarker([d.lat, d.lon], {
      radius,
      fillColor: color,
      color: d.spike ? "#ef4444" : color,
      weight: d.spike ? 3 : 1.5,
      fillOpacity: 0.35,
    })
      .bindPopup(`<strong>${d.name}</strong><br/>${d.count} crimes`)
      .addTo(map);
  }
}

export function CrimeMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadAndRenderData = useCallback(async (L: LeafletModule, map: LeafletMap) => {
    // Load FIR data from public/data/ at runtime
    const firData: FIRRecord[] = await fetch("/data/fir_records.json").then(r => r.json()).catch(() => []);
    
    if (!firData.length) {
      // Fallback mock data if import fails
      renderMockData(L, map);
      return;
    }

    // Aggregate by district
    const districtMap = new Map<string, DistrictStats>();
    
    for (const fir of firData) {
      const existing = districtMap.get(fir.district);
      if (existing) {
        existing.totalCrimes++;
        existing.categories[fir.category] = (existing.categories[fir.category] || 0) + 1;
      } else {
        const coords = DISTRICT_COORDS[fir.district] || [fir.latitude, fir.longitude];
        districtMap.set(fir.district, {
          name: fir.district,
          lat: coords[0],
          lon: coords[1],
          totalCrimes: 1,
          categories: { [fir.category]: 1 },
          isSpike: false,
        });
      }
    }

    const districts = Array.from(districtMap.values());
    const maxCount = Math.max(...districts.map(d => d.totalCrimes));
    const avgCount = districts.reduce((s, d) => s + d.totalCrimes, 0) / districts.length;

    // Mark spike districts
    districts.forEach(d => {
      d.isSpike = d.totalCrimes > avgCount * 1.5;
    });

    // Add individual FIR pins (small dots)
    for (const fir of firData) {
      const categoryColors: Record<string, string> = {
        Theft: "#3b82f6", Robbery: "#ef4444", Assault: "#f59e0b",
        Cybercrime: "#8b5cf6", Drug: "#10b981", Murder: "#dc2626",
        Fraud: "#f97316", Missing: "#6b7280",
      };
      
      L.circleMarker([fir.latitude, fir.longitude], {
        radius: 3,
        fillColor: categoryColors[fir.category] || "#6b7280",
        color: "transparent",
        fillOpacity: 0.6,
      })
        .bindPopup(`
          <div style="font-family: system-ui; font-size: 12px; color: #e2e8f0; background: #1e293b; padding: 8px; border-radius: 6px; min-width: 180px;">
            <strong>${fir.fir_id}</strong><br/>
            <span style="color: ${categoryColors[fir.category] || '#6b7280'}">${fir.category}</span><br/>
            ${fir.district} • ${fir.date_filed}<br/>
            ${fir.time_of_incident ? `Time: ${fir.time_of_incident}` : ""}
          </div>
        `, { className: 'dark-popup' })
        .addTo(map);
    }

    // Add district circle markers
    for (const district of districts) {
      const radius = 15 + (district.totalCrimes / maxCount) * 35;
      const color = getSeverityColor(district.totalCrimes, maxCount);

      const circle = L.circleMarker([district.lat, district.lon], {
        radius,
        fillColor: color,
        color: district.isSpike ? "#ef4444" : color,
        weight: district.isSpike ? 3 : 1.5,
        fillOpacity: 0.35,
        className: district.isSpike ? "pulse-marker" : "",
      }).addTo(map);

      // Popup with crime breakdown
      const categoryList = Object.entries(district.categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `<div style="display:flex;justify-content:space-between;"><span>${cat}</span><strong>${count}</strong></div>`)
        .join("");

      circle.bindPopup(`
        <div style="font-family: system-ui; font-size: 13px; color: #e2e8f0; background: #0f172a; padding: 12px; border-radius: 8px; min-width: 200px; border: 1px solid #334155;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px; color: ${color};">${district.name}</div>
          <div style="font-size: 20px; font-weight: 800; margin-bottom: 6px;">${district.totalCrimes} <span style="font-size: 12px; color: #94a3b8;">total crimes</span></div>
          ${district.isSpike ? '<div style="background:#7f1d1d;color:#fca5a5;padding:4px 8px;border-radius:4px;font-size:11px;margin-bottom:8px;">⚠ SPIKE ALERT — Above 1.5× average</div>' : ''}
          <div style="border-top:1px solid #334155;padding-top:8px;margin-top:4px;">
            ${categoryList}
          </div>
        </div>
      `, { className: 'dark-popup', maxWidth: 250 });

      // Label
      L.marker([district.lat, district.lon], {
        icon: L.divIcon({
          className: 'district-label',
          html: `<div style="color:#e2e8f0;font-size:11px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;pointer-events:none;">${district.name}<br/><span style="color:${color};font-size:14px;font-weight:800;">${district.totalCrimes}</span></div>`,
          iconSize: [100, 30],
          iconAnchor: [50, -radius - 5],
        }),
      }).addTo(map);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || mapInstanceRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapRef.current) return;

      // Create the map centered on Karnataka
      const map = L.map(mapRef.current, {
        center: [14.5, 76.0],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Dark tile layer matching our theme
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Load FIR data and add markers
      loadAndRenderData(L, map);
      setIsLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loadAndRenderData]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[var(--color-border-default)]" style={{ height: 480 }}>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-2 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm border-b border-[var(--color-border-default)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          🗺️ Crime Hotspot Map — Karnataka
        </h3>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span> Low
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Medium
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse"></span> Spike
          </span>
        </div>
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-primary)] z-[999]">
          <div className="text-[var(--color-text-muted)] animate-pulse">Loading map...</div>
        </div>
      )}

      {/* Pulse animation style */}
      <style jsx global>{`
        .pulse-marker {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip {
          background: #0f172a !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
      `}</style>
    </div>
  );
}
