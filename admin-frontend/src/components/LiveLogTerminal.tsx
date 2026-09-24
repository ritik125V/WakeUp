'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal, Trash2, Pause, Play, Search } from 'lucide-react';
import { SystemLogEntry, fetchAdminLogs } from '@/lib/api';

export function LiveLogTerminal() {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch of incident logs on demand
    fetchAdminLogs()
      .then((data) => {
        setLogs(data.logs || []);
      })
      .catch(() => {});

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('admin:log-stream', (newLog: SystemLogEntry) => {
      if (!isPaused) {
        setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isPaused]);

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const msg = log.message?.toLowerCase() || '';
    const cat = log.category?.toLowerCase() || '';
    const level = log.level?.toLowerCase() || '';
    return msg.includes(q) || cat.includes(q) || level.includes(q);
  });

  return (
    <div className="p-5 bg-neutral-950 rounded-2xl space-y-3 font-mono shadow-md border-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live System & Cron Worker Telemetry Stream</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black text-white pl-8 pr-2.5 py-1 rounded-lg text-xs outline-none border-none font-mono"
            />
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-medium rounded-lg border-none flex items-center gap-1 cursor-pointer shrink-0"
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={clearLogs}
            className="p-1 text-neutral-500 hover:text-rose-400 rounded-lg border-none cursor-pointer shrink-0"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto space-y-1.5 p-3 bg-black rounded-xl text-xs font-mono select-text">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-600 text-[11px]">
            {searchQuery ? 'No log entries match your search query' : 'Waiting for live telemetry stream events...'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-[10px] text-neutral-600 shrink-0">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 uppercase ${
                  log.category === 'CRON_WORKER'
                    ? 'bg-rose-950 text-rose-300'
                    : log.category === 'INCIDENT'
                    ? 'bg-amber-950 text-amber-300'
                    : log.category === 'AUTH'
                    ? 'bg-blue-950 text-blue-300'
                    : 'bg-neutral-900 text-emerald-400'
                }`}
              >
                {log.category}
              </span>
              <span
                className={`break-all ${
                  log.level === 'error'
                    ? 'text-rose-400 font-bold'
                    : log.level === 'warn'
                    ? 'text-amber-300'
                    : log.level === 'success'
                    ? 'text-emerald-400'
                    : 'text-neutral-300'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}

