'use client';

import React, { useState } from 'react';
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
  GitBranch,
  Menu,
  X,
} from 'lucide-react';

export function AdminNavbar({
  onRefresh,
  isRefreshing,
  isLive = true,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLive?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    { href: '/workflows?tab=runs', label: 'Commit Audit Logs', icon: GitBranch },
    { href: '/status-pages', label: 'Status Pages', icon: Layout },
    { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { href: '/logs', label: 'Live Stream Logs', icon: Terminal },
  ];

  return (
    <>
      {/* Mobile Top Bar (Small Screens Only) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-neutral-950 border-b border-neutral-900 font-sans sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-white" />
          <span className="text-sm font-bold text-white">WakeUp Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-900 border-none cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Desktop & Mobile Slide-Out Fixed Left Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-neutral-950 border-r border-neutral-900/60 p-4 flex flex-col justify-between font-sans transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand & Control Plane Title */}
          <div className="border-b border-neutral-900/80 pb-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-neutral-900 text-white rounded-xl">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight group-hover:text-neutral-300 transition-colors">
                    WakeUp Admin
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-900 text-emerald-400 text-[9px] font-mono font-bold rounded-full">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> {isLive ? 'LIVE' : 'SYNCED'}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium">Control Plane</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Vertical Navigation Links */}
          <nav className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-3 block mb-2">
              Management Nav
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-3 border-none ${
                    isActive
                      ? 'bg-neutral-900 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Controls */}
        <div className="pt-4 border-t border-neutral-900/80 space-y-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border-none flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync System State'}</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full px-3.5 py-2 bg-neutral-900/40 hover:bg-neutral-900 text-neutral-400 hover:text-white text-xs font-semibold rounded-xl border-none flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-400" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
