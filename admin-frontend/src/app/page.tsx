'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  Server,
  Activity,
  Layers,
  Layout,
  AlertTriangle,
  Lock,
  Mail,
  Key,
  CheckCircle2,
  Cpu,
  Database,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  adminLogin,
  fetchAdminOverview,
  fetchAdminDiagnostics,
  AdminMetrics,
  AdminWorkerStatus,
  SystemDiagnostics,
} from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Admin Data State
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [worker, setWorker] = useState<AdminWorkerStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        setIsAuthenticated(true);
        loadAdminData();
      }
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(loadAdminData, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadAdminData = async () => {
    setDataLoading(true);
    try {
      const [overviewData, diagData] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminDiagnostics(),
      ]);
      setMetrics(overviewData.metrics);
      setWorker(overviewData.worker);
      setDiagnostics(diagData.diagnostics);
    } catch (err) {
      console.error('Failed to load admin metrics or diagnostics:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await adminLogin(email, pin);
      setIsAuthenticated(true);
      loadAdminData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLoginError((err as any).response?.data?.error || err.message);
      } else {
        setLoginError('Invalid Email or Security PIN');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center font-mono">
        <Activity className="w-5 h-5 text-rose-500 animate-spin" />
      </div>
    );
  }

  // Render Login Modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-4 font-sans relative select-none">
        <div className="w-full max-w-md p-8 bg-neutral-950 rounded-2xl space-y-6 shadow-2xl border-none">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">System Admin Console</h1>
            <p className="text-xs text-neutral-400">Authenticate with Email & Security PIN</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-950/80 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-500" /> Admin Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@wakeup.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-900 text-white px-4 py-2.5 rounded-xl text-xs outline-none border-none focus:ring-1 focus:ring-rose-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-neutral-500" /> Security PIN
              </label>
              <input
                type="password"
                required
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-neutral-900 text-white px-4 py-2.5 rounded-xl text-xs outline-none border-none focus:ring-1 focus:ring-rose-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10"
            >
              {isSubmitting ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Authenticate Admin Session
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-center text-neutral-500 font-mono">
            Default Master PIN: <span className="text-rose-400">1234</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10 md:pl-64">
      <AdminNavbar onRefresh={loadAdminData} isRefreshing={dataLoading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6 py-6">
        {/* Cron Worker & Scheduler Status Box */}
        {worker && (
          <div className="p-5 bg-neutral-950 rounded-2xl space-y-4 border-none shadow-md">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-neutral-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Cron Worker & Scheduler Engine</h2>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold rounded-full">
                WORKER LOOP {worker.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">TICKER CYCLE</span>
                <span className="font-bold text-white font-mono">{worker.tickerIntervalMs / 1000}s Interval</span>
              </div>
              <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">MAX BATCH SIZE</span>
                <span className="font-bold text-white font-mono">{worker.batchSizeLimit} Items/Batch</span>
              </div>
              <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">CONCURRENCY</span>
                <span className="font-bold text-white font-mono">{worker.concurrency} Workers</span>
              </div>
              <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">CACHE ENGINE</span>
                <span className="font-bold text-emerald-400 font-mono text-[11px] truncate block">{worker.redisStatus}</span>
              </div>
              <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">NODE UPTIME</span>
                <span className="font-bold text-white font-mono">{Math.floor(worker.nodeUptimeSeconds / 60)}m {worker.nodeUptimeSeconds % 60}s</span>
              </div>
              <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-500 font-medium block">HEAP MEMORY</span>
                <span className="font-bold text-white font-mono">{worker.memoryUsageMb} MB</span>
              </div>
            </div>
          </div>
        )}

        {/* ON-DEMAND SYSTEM HEALTH & ANOMALY DIAGNOSTICS DETECTOR (ZERO BACKGROUND OVERHEAD) */}
        {diagnostics && (
          <div className="p-5 bg-neutral-950 rounded-2xl space-y-4 border-none shadow-md">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">System Health & Anomaly Detector</h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-mono">HEALTH SCORE:</span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                    diagnostics.healthScore >= 80
                      ? 'bg-emerald-950 text-emerald-400'
                      : diagnostics.healthScore >= 50
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-rose-950 text-rose-400 animate-pulse'
                  }`}
                >
                  {diagnostics.healthScore} / 100 ({diagnostics.overallStatus})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-medium">Memory Pressure</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      diagnostics.memory.status === 'NORMAL'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    {diagnostics.memory.status}
                  </span>
                </div>
                <p className="font-mono text-white font-bold text-sm">
                  {diagnostics.memory.heapUsedMb} MB <span className="text-neutral-500 text-xs font-normal">/ {diagnostics.memory.heapTotalMb} MB Heap</span>
                </p>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-medium">Database Latency Probe</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      diagnostics.database.status === 'FAST'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-amber-950 text-amber-300'
                    }`}
                  >
                    {diagnostics.database.status}
                  </span>
                </div>
                <p className="font-mono text-white font-bold text-sm">
                  {diagnostics.database.queryLatencyMs} ms <span className="text-neutral-500 text-xs font-normal">Indexed MongoDB Query</span>
                </p>
              </div>

              <div className="p-3.5 bg-neutral-900/60 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-medium">Services Failure Ratio</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      diagnostics.services.status === 'STABLE'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    {diagnostics.services.status}
                  </span>
                </div>
                <p className="font-mono text-white font-bold text-sm">
                  {diagnostics.services.failureRatePercent}% <span className="text-neutral-500 text-xs font-normal">Outage Rate ({diagnostics.services.down} Down)</span>
                </p>
              </div>
            </div>

            {/* Active Anomalies & Recommendations List */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">Real-time Anomaly Signals & Recommendations</span>
              <div className="space-y-2">
                {diagnostics.anomaliesDetected.map((anom) => (
                  <div
                    key={anom.id}
                    className={`p-3 rounded-xl flex items-start gap-3 text-xs border-none ${
                      anom.severity === 'critical'
                        ? 'bg-rose-950/60 text-rose-200'
                        : anom.severity === 'warn'
                        ? 'bg-amber-950/60 text-amber-200'
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
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-white">{anom.title}</h4>
                      <p className="text-neutral-400 leading-relaxed">{anom.description}</p>
                      <span className="text-[11px] font-mono text-rose-300 block pt-0.5">💡 Action: {anom.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Global Key Metrics Overview Cards linked to dedicated pages */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/users" className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-3 shadow-md transition-all border-none block group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Registered Users</span>
                <div className="p-2 bg-neutral-900 group-hover:bg-neutral-850 rounded-xl text-rose-400 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-white">{metrics.usersCount}</p>
                <span className="text-xs text-rose-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Manage Users <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            <Link href="/endpoints" className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-3 shadow-md transition-all border-none block group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Monitored Pages</span>
                <div className="p-2 bg-neutral-900 group-hover:bg-neutral-850 rounded-xl text-rose-400 transition-colors">
                  <Server className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">{metrics.endpointsCount}</p>
                  <span className="text-xs text-emerald-400 font-bold">{metrics.healthyEndpointsCount} UP</span>
                </div>
                <span className="text-xs text-rose-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Manage Pages <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            <Link href="/workflows" className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-3 shadow-md transition-all border-none block group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">API Workflows</span>
                <div className="p-2 bg-neutral-900 group-hover:bg-neutral-850 rounded-xl text-amber-400 transition-colors">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-white">{metrics.workflowsCount}</p>
                <span className="text-xs text-rose-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Manage Workflows <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            <Link href="/status-pages" className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-3 shadow-md transition-all border-none block group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Public Status Pages</span>
                <div className="p-2 bg-neutral-900 group-hover:bg-neutral-850 rounded-xl text-sky-400 transition-colors">
                  <Layout className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-white">{metrics.statusPagesCount}</p>
                <span className="text-xs text-rose-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Manage Status Pages <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            <Link href="/incidents" className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-3 shadow-md transition-all border-none block group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Incidents Log</span>
                <div className="p-2 bg-neutral-900 group-hover:bg-neutral-850 rounded-xl text-rose-400 transition-colors">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">{metrics.incidentsCount}</p>
                  <span className="text-xs text-rose-400 font-bold">{metrics.activeIncidentsCount} Active</span>
                </div>
                <span className="text-xs text-rose-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Audit Incidents <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* Real-time System Breakdown Visual Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-neutral-950 rounded-2xl space-y-4 shadow-md border-none">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" /> Services Health Breakdown
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Operational Services</span>
                    <span className="text-emerald-400 font-bold">{metrics.healthyEndpointsCount} / {metrics.endpointsCount}</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${metrics.endpointsCount ? (metrics.healthyEndpointsCount / metrics.endpointsCount) * 100 : 100}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Down / Outage Services</span>
                    <span className="text-rose-400 font-bold">{metrics.downEndpointsCount} / {metrics.endpointsCount}</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${metrics.endpointsCount ? (metrics.downEndpointsCount / metrics.endpointsCount) * 100 : 0}%` }}
                      className="h-full bg-rose-500 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Degraded Performance</span>
                    <span className="text-amber-300 font-bold">{metrics.degradedEndpointsCount} / {metrics.endpointsCount}</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${metrics.endpointsCount ? (metrics.degradedEndpointsCount / metrics.endpointsCount) * 100 : 0}%` }}
                      className="h-full bg-amber-400 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-neutral-950 rounded-2xl space-y-4 shadow-md border-none">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-rose-400" /> Database & Storage Infrastructure
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-neutral-900/60 rounded-xl flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Primary Storage</span>
                  <span className="text-emerald-400 font-mono font-bold">MongoDB Atlas (Indexed O(1))</span>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-xl flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Distributed Cache</span>
                  <span className="text-emerald-400 font-mono font-bold">Redis Cloud / Graceful Fallback</span>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-xl flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">Worker Engine</span>
                  <span className="text-white font-mono font-bold">Stateless Ticker (10,000ms Cycle)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
