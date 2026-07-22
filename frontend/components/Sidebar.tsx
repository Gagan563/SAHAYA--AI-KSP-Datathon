"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  LayoutDashboard,
  Network,
  FileText,
  Shield,
  Settings,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Chat", icon: MessageSquare, id: "nav-chat" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "nav-dashboard" },
  { href: "/network", label: "Network Graph", icon: Network, id: "nav-network" },
  { href: "/reports", label: "Reports", icon: FileText, id: "nav-reports" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 glass-panel flex flex-col z-50">
      {/* Logo & Branding */}
      <div className="p-6 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-3">
          <div className="ksp-logo-ring w-10 h-10 flex items-center justify-center bg-[var(--color-bg-tertiary)]">
            <Shield className="w-5 h-5 text-[var(--color-accent-cyan)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text tracking-tight">
              SAHAYA AI
            </h1>
            <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest">
              KSP Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              id={item.id}
              className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-sm border border-transparent ${
                isActive
                  ? "active"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.label === "Chat" && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-[var(--color-border-default)]">
        <div className="glass-card rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Activity className="w-3 h-3 text-[var(--color-accent-green)]" />
            <span>System Online</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-green)]" />
            <span>Catalyst Connected</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-amber)]" />
            <span>Last sync: 5m ago</span>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-[var(--color-border-default)]">
        <button
          id="btn-settings"
          className="sidebar-link flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] w-full border border-transparent"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
