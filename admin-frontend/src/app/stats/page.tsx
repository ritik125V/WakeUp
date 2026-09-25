'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Activity,
  Database,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  RefreshCw,
  Layers,
  Shield,
  Gauge,
  Info,
} from 'lucide-react';
import {
  fetchAdminOverview,
  fetchAdminDiagnostics,
  AdminMetrics,
  AdminWorkerStatus,
  SystemDiagnostics,
} from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group cursor-help ml-1 align-middle">
      <Info className="w-3.5 h-3.5 text-neutral-500 group-hover:text-rose-400 transition-colors inline-block" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-neutral-900 text-white text-[11px] font-sans rounded-xl shadow-2xl z-50 pointer-events-none leading-relaxed border-none text-left font-normal normal-case tracking-normal">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
      </span>
    </span>
  );
}

export default function SystemStatsPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [worker, setWorker] = useState<AdminWorkerStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAllStats = async () => {
    setLoading(true);
    try {
      const [overviewData, diagData] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminDiagnostics(),
      ]);
      setMetrics(overviewData.metrics);
      setWorker(overviewData.worker);
      setDiagnostics(diagData.diagnostics);
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStats();
    const interval = setInterval(loadAllStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10">
      <AdminNavbar onRefresh={loadAllStats} isRefreshing={loading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-rose-400" /> System Stats & Technical Architecture
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Real-time health diagnostics, worker performance metrics, and zero-overhead anomaly detection (Hover over <Info className="w-3 h-3 text-rose-400 inline" /> icons for explanations)
            </p>
          </div>

          <button
            onClick={loadAllStats}
            disabled={loading}
            className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-900 text-neutral-200 text-xs font-medium rounded-xl border-none flex items-center gap-2 transition-colors cursor-pointer w-fit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            <span>Run Health Probe</span>
          </button>
        </div>

        {/* 1. HEALTH SCORE & ANOMALY DETECTOR CARD */}
        {diagnostics && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-neutral-950 rounded-2xl space-y-5 border-none shadow-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-950/60 text-rose-400 rounded-xl">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Operational Health & Anomaly Detector
                    <InfoTooltip text="Evaluates memory pressure, database latency, service outages, and active incidents in real time without background CPU load." />
                  </h2>
                  <p className="text-xs text-neutral-400">On-demand evaluation probe (Zero continuous CPU / RAM background load)</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-neutral-400">STATUS:</span>
                <span
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-full uppercase tracking-wider ${
                    diagnostics.overallStatus === 'OPTIMAL'
                      ? 'bg-emerald-950 text-emerald-400'
                      : diagnostics.overallStatus === 'ELEVATED_LOAD'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-rose-950 text-rose-400 animate-pulse'
                  }`}
                >
                  {diagnostics.overallStatus} ({diagnostics.healthScore} / 100)
                </span>
              </div>
            </div>

            {/* Diagnostic Metrics Matrix with Healthy / Risky Dynamic Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Memory Heap Pressure Card */}
              {(() => {
                const heapUsedMb = diagnostics.memory.heapUsedMb;
                const heapTotalMb = Math.max(diagnostics.memory.heapTotalMb, 1);
                const memPct = Math.min(100, Math.round((heapUsedMb / heapTotalMb) * 100));
                const memColor = heapUsedMb >= 400 ? 'bg-rose-500' : heapUsedMb >= 250 ? 'bg-amber-400' : 'bg-emerald-500';
                const memStatusText = heapUsedMb >= 400 ? 'HIGH RISK' : heapUsedMb >= 250 ? 'ELEVATED' : 'HEALTHY';
                return (
                  <div className="p-4 bg-neutral-900/60 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">
                        Memory Heap Pressure
                        <InfoTooltip text="Memory dynamically allocated for active JavaScript objects & variables in Node.js. High heap usage (>80%) indicates memory leak risks." />
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          heapUsedMb >= 400
                            ? 'bg-rose-950 text-rose-300'
                            : heapUsedMb >= 250
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-emerald-950 text-emerald-400'
                        }`}
                      >
                        {memStatusText}
                      </span>
                    </div>

                    <div>
                      <p className="font-mono text-white font-bold text-lg">
                        {heapUsedMb} <span className="text-xs text-neutral-400 font-normal">/ {heapTotalMb} MB Heap ({memPct}%)</span>
                      </p>
                      {/* Dynamic Progress Bar */}
                      <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden mt-1.5">
                        <div style={{ width: `${memPct}%` }} className={`h-full ${memColor} rounded-full transition-all duration-500`} />
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-500 block">
                      RSS Memory: {diagnostics.memory.rssMb} MB
                      <InfoTooltip text="Resident Set Size (RSS): Total physical RAM occupied by your backend Node.js process (includes code, libraries, and memory heap)." />
                    </span>
                  </div>
                );
              })()}

              {/* Database Query Latency Card */}
              {(() => {
                const lat = diagnostics.database.queryLatencyMs;
                const latPct = Math.min(100, Math.round((lat / 250) * 100));
                const latColor = lat >= 250 ? 'bg-rose-500' : lat >= 100 ? 'bg-amber-400' : 'bg-emerald-500';
                const latStatusText = lat >= 250 ? 'SLOW RISK' : lat >= 100 ? 'DEGRADED' : 'HEALTHY';
                return (
                  <div className="p-4 bg-neutral-900/60 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">
                        DB Query Latency
                        <InfoTooltip text="Round-trip response time (in milliseconds) for an indexed MongoDB query probe. Lower is faster (<100ms is healthy)." />
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          lat >= 250
                            ? 'bg-rose-950 text-rose-300'
                            : lat >= 100
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-emerald-950 text-emerald-400'
                        }`}
                      >
                        {latStatusText}
                      </span>
                    </div>

                    <div>
                      <p className="font-mono text-white font-bold text-lg">
                        {lat} <span className="text-xs text-neutral-400 font-normal">ms Probe Latency</span>
                      </p>
                      {/* Dynamic Progress Bar */}
                      <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden mt-1.5">
                        <div style={{ width: `${latPct}%` }} className={`h-full ${latColor} rounded-full transition-all duration-500`} />
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-500 block">Indexed MongoDB Atlas Query</span>
                  </div>
                );
              })()}

              {/* Service Failure & Outage Ratio Card */}
              {(() => {
                const failPct = diagnostics.services.failureRatePercent;
                const failColor = failPct >= 40 ? 'bg-rose-500' : failPct >= 15 ? 'bg-amber-400' : 'bg-emerald-500';
                const failStatusText = failPct >= 40 ? 'CRITICAL SPIKE' : failPct >= 15 ? 'ELEVATED' : 'HEALTHY';
                return (
                  <div className="p-4 bg-neutral-900/60 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">
                        Outage Failure Ratio
                        <InfoTooltip text="Percentage of monitored API endpoints currently experiencing outages or degraded performance." />
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          failPct >= 40
                            ? 'bg-rose-950 text-rose-300'
                            : failPct >= 15
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-emerald-950 text-emerald-400'
                        }`}
                      >
                        {failStatusText}
                      </span>
                    </div>

                    <div>
                      <p className="font-mono text-white font-bold text-lg">
                        {failPct}% <span className="text-xs text-neutral-400 font-normal">Failure Rate</span>
                      </p>
                      {/* Dynamic Progress Bar */}
                      <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden mt-1.5">
                        <div style={{ width: `${failPct}%` }} className={`h-full ${failColor} rounded-full transition-all duration-500`} />
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-500 block">
                      {diagnostics.services.down} Down / {diagnostics.services.total} Monitored
                    </span>
                  </div>
                );
              })()}

              {/* Active Incident Risk Card */}
              {(() => {
                const activeCount = diagnostics.incidents.activeCount;
                const incPct = Math.min(100, Math.round((activeCount / 8) * 100));
                const incColor = activeCount > 4 ? 'bg-rose-500' : activeCount > 0 ? 'bg-amber-400' : 'bg-emerald-500';
                const incStatusText = activeCount > 4 ? 'SURGE RISK' : activeCount > 0 ? 'ACTIVE OUTAGES' : 'QUIET';
                return (
                  <div className="p-4 bg-neutral-900/60 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">
                        Active Incidents Risk
                        <InfoTooltip text="Number of ongoing service outages that have not yet been marked as resolved." />
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          activeCount > 4
                            ? 'bg-rose-950 text-rose-300'
                            : activeCount > 0
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-emerald-950 text-emerald-400'
                        }`}
                      >
                        {incStatusText}
                      </span>
                    </div>

                    <div>
                      <p className="font-mono text-white font-bold text-lg">
                        {activeCount} <span className="text-xs text-neutral-400 font-normal">Unresolved Outages</span>
                      </p>
                      {/* Dynamic Progress Bar */}
                      <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden mt-1.5">
                        <div style={{ width: `${incPct}%` }} className={`h-full ${incColor} rounded-full transition-all duration-500`} />
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-500 block">Active Traces in Incidents Log</span>
                  </div>
                );
              })()}
            </div>

            {/* Resource Utilization & Scaling Capacity Advisor */}
            {diagnostics.scaling && (
              <div className="p-4 bg-neutral-900/80 rounded-xl space-y-4 pt-4 border-t border-neutral-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-rose-400" /> Host CPU & RAM Capacity Advisor (Scaling Evaluation)
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-sans mt-0.5">{diagnostics.scaling.message}</p>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-mono font-bold rounded-full uppercase shrink-0 ${
                      diagnostics.scaling.verdict === 'SCALE_UP_RECOMMENDED'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse'
                        : diagnostics.scaling.verdict === 'MODERATE_LOAD'
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-emerald-950 text-emerald-400'
                    }`}
                  >
                    {diagnostics.scaling.verdict === 'SCALE_UP_RECOMMENDED'
                      ? '⚠️ RECOMMEND SCALING UP'
                      : diagnostics.scaling.verdict === 'MODERATE_LOAD'
                      ? '⚡ MODERATE LOAD'
                      : '✅ OPTIMAL (NO SCALING NEEDED)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* System CPU Load Bar */}
                  <div className="p-3.5 bg-black/60 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">System CPU Core Load (1m Avg)</span>
                      <span className="font-mono text-white font-bold">{diagnostics.scaling.cpuLoad1MinPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${diagnostics.scaling.cpuLoad1MinPercent}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          diagnostics.scaling.cpuLoad1MinPercent >= 80
                            ? 'bg-rose-500'
                            : diagnostics.scaling.cpuLoad1MinPercent >= 60
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500 block">
                      CPU Cores: {diagnostics.scaling.cpuCoresCount} | Process Execution Time: {diagnostics.scaling.processCpuTimeMs}ms
                    </span>
                  </div>

                  {/* System Total Memory Bar */}
                  <div className="p-3.5 bg-black/60 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">Total Host RAM Utilization</span>
                      <span className="font-mono text-white font-bold">{diagnostics.scaling.systemRamUsagePercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${diagnostics.scaling.systemRamUsagePercent}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          diagnostics.scaling.systemRamUsagePercent >= 85
                            ? 'bg-rose-500'
                            : diagnostics.scaling.systemRamUsagePercent >= 70
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500 block">
                      Used: {diagnostics.scaling.usedSystemRamMb} MB / Total Host: {diagnostics.scaling.totalSystemRamMb} MB (Free: {diagnostics.scaling.freeSystemRamMb} MB)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Anomaly Alerts List */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
                Detected Anomaly Signals & Fix Recommendations
              </h3>
              <div className="space-y-2.5">
                {diagnostics.anomaliesDetected.map((anom) => (
                  <div
                    key={anom.id}
                    className={`p-4 rounded-xl flex items-start gap-3.5 text-xs border-none ${
                      anom.severity === 'critical'
                        ? 'bg-rose-950/70 text-rose-200'
                        : anom.severity === 'warn'
                        ? 'bg-amber-950/70 text-amber-200'
                        : 'bg-neutral-900/80 text-neutral-300'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {anom.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : anom.severity === 'warn' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">{anom.title}</h4>
                      <p className="text-neutral-300 leading-relaxed">{anom.description}</p>
                      <div className="pt-1 text-[11px] font-mono text-rose-300 flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-rose-400" />
                        <span>Recommendation: {anom.recommendation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. CRON WORKER & SCHEDULER ENGINE PARAMETERS */}
        {worker && (
          <div className="p-6 bg-neutral-950 rounded-2xl space-y-4 border-none shadow-md">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Cron Worker & Scheduler Engine Parameters</h2>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold rounded-full">
                STATELESS WORKER {worker.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">TICKER INTERVAL</span>
                <span className="font-bold text-white font-mono">{worker.tickerIntervalMs / 1000}s Cycle</span>
              </div>
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">BATCH SIZE LIMIT</span>
                <span className="font-bold text-white font-mono">{worker.batchSizeLimit} Items/Batch</span>
              </div>
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">CONCURRENCY</span>
                <span className="font-bold text-white font-mono">{worker.concurrency} Workers</span>
              </div>
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">DISTRIBUTED CACHE</span>
                <span className="font-bold text-emerald-400 font-mono text-[11px] truncate block">{worker.redisStatus}</span>
              </div>
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">PROCESS UPTIME</span>
                <span className="font-bold text-white font-mono">{Math.floor(worker.nodeUptimeSeconds / 60)}m {worker.nodeUptimeSeconds % 60}s</span>
              </div>
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">NODE HEAP</span>
                <span className="font-bold text-white font-mono">{worker.memoryUsageMb} MB</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. TECHNICAL SPECIFICATIONS & DATABASE INDEXING */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-md border-none">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-rose-400" /> Database & Indexing Architecture
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <div className="flex justify-between text-neutral-300 font-bold">
                  <span>EndpointModel Compound Index</span>
                  <span className="text-emerald-400">O(1) / O(log N)</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Indexed on <code className="text-rose-300 bg-black px-1 py-0.5 rounded">&#123; nextCheckAt: 1, status: 1 &#125;</code> for instant batch polling.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <div className="flex justify-between text-neutral-300 font-bold">
                  <span>IncidentModel Compound Index</span>
                  <span className="text-emerald-400">O(1) Fallback</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Indexed on <code className="text-rose-300 bg-black px-1 py-0.5 rounded">&#123; endpointId: 1, resolved: 1 &#125;</code> to prevent duplicate incident creation when Redis is down.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <div className="flex justify-between text-neutral-300 font-bold">
                  <span>Resource Ownership Projections</span>
                  <span className="text-emerald-400">Lean Queries</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Uses Mongoose <code className="text-rose-300 bg-black px-1 py-0.5 rounded">.select()</code> & <code className="text-rose-300 bg-black px-1 py-0.5 rounded">.lean()</code> to avoid Mongoose document overhead.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-md border-none">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" /> Resiliency & Fallback Controls
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <div className="flex justify-between text-neutral-300 font-bold">
                  <span>Zero Hard Dependencies</span>
                  <span className="text-emerald-400 font-mono">Guarded</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Third-party services (Redis, external caches) do not block application startup or monitoring cycles.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <div className="flex justify-between text-neutral-300 font-bold">
                  <span>HTTP Connection Pooling</span>
                  <span className="text-emerald-400 font-mono">keepAlive: true</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  HTTP/HTTPS agents reuse sockets with tuned <code className="text-rose-300 font-mono">maxSockets</code> and strict timeouts (5,000ms).
                </p>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1">
                <div className="flex justify-between text-neutral-300 font-bold">
                  <span>Atomic Worker Concurrency</span>
                  <span className="text-emerald-400 font-mono">Lock Timestamps</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Worker loops use atomic operations to prevent duplicate health checks across horizontal worker instances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
