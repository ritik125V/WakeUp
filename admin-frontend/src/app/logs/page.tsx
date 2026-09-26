'use client';

import React from 'react';
import { Terminal } from 'lucide-react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { LiveLogTerminal } from '@/components/LiveLogTerminal';

export default function AdminLogsPage() {
  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10 md:pl-64">
      <AdminNavbar isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6 py-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-neutral-400" /> Live System Logs & Cron Stream
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Real-time Socket.IO execution telemetry, worker loop cycles, and error traces</p>
        </div>

        <LiveLogTerminal />
      </main>
    </div>
  );
}
