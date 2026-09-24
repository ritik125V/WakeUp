'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Activity,
  Users,
  Server,
  Layers,
  Layout,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Radio,
  Terminal,
  Cpu,
} from 'lucide-react';

export function AdminNavbar({
  onRefresh,
  isRefreshing,
  isLive,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLive?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/');
  };

  const navItems = [
    { href: '/', label: 'Overview', icon: Activity },
    { href: '/stats', label: 'System Stats', icon: Cpu },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/endpoints', label: 'Monitored Pages', icon: Server },
    { href: '/workflows', label: 'Workflows', icon: Layers },
    { href: '/status-pages', label: 'Status Pages', icon: Layout },
    { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { href: '/logs', label: 'Live Stream Logs', icon: Terminal },
  ];

  return (
    <header className="w-full bg-neutral-950 border-none shadow-md mb-6 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Live Socket Indicator */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-950/80 text-rose-400 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">WakeUp Admin Control Plane</span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold rounded-full">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> {isLive ? 'REALTIME LIVE' : 'SYNCED'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">Full CRUD & Operations Management</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border-none ${
                  isActive
                    ? 'bg-rose-600 text-white font-semibold shadow-lg shadow-rose-600/10'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Refresh & Logout */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-medium rounded-xl border-none flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
              <span>Sync</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium rounded-xl border-none flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
