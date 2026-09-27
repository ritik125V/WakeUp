'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Activity,
  Plus,
  RefreshCw,
  Globe,
  ShieldCheck,
  Trash2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  fetchGroupedEndpoints,
  fetchEndpointIncidents,
  deleteEndpoint,
  EndpointData,
  IncidentData,
} from '@/lib/api';
import { RegisterModal } from '@/components/RegisterModal';
import { IncidentTimeline } from '@/components/IncidentTimeline';
import { IncidentDetailModal } from '@/components/IncidentDetailModal';
import { NextCheckCountdown } from '@/components/NextCheckCountdown';
import { DashboardSkeleton } from '@/components/Skeleton';

export default function Home() {
  const router = useRouter();
  const [groupedData, setGroupedData] = useState<Record<string, EndpointData[]>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [incidentsMap, setIncidentsMap] = useState<Record<string, IncidentData[]>>({});

  // Floating reload pill toast
  const [showReloadPill, setShowReloadPill] = useState<boolean>(false);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentData | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchGroupedEndpoints();
      setGroupedData(data.projects || {});
      setTotalCount(data.totalEndpoints || 0);

      const allEndpoints: EndpointData[] = Object.values(data.projects || {}).flat();
      const incMap: Record<string, IncidentData[]> = {};

      await Promise.all(
        allEndpoints.map(async (ep) => {
          try {
            const incRes = await fetchEndpointIncidents(ep._id);
            incMap[ep._id] = incRes.incidents;
          } catch {
            incMap[ep._id] = [];
          }
        })
      );

      setIncidentsMap(incMap);
    } catch (err) {
      console.error('Failed to load endpoints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wakeup_auth_token') : null;
    setIsLoggedIn(!!token);
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setShowReloadPill(false);
    loadData();
  };

  const handleCycleComplete = () => {
    setShowReloadPill(true);
  };

  const handleDeleteEndpoint = async (endpointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this monitored endpoint?')) return;
    try {
      await deleteEndpoint(endpointId);
      loadData();
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  };

  const allEndpointsList = Object.values(groupedData).flat();
  const healthyCount = allEndpointsList.filter((e) => e.status === 'healthy' || e.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 px-3.5 sm:px-6 py-4 sm:py-8 font-sans relative">
        <div className="max-w-5xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 px-3.5 sm:px-6 py-4 sm:py-8 font-sans relative touch-manipulation">
      {/* Floating Micro Refresh Pill */}
      <AnimatePresence>
        {showReloadPill && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={handleRefresh}
            className="fixed top-5 right-5 z-50 px-3.5 py-2 bg-neutral-900 text-white text-xs font-sans rounded-full shadow-2xl flex items-center gap-2 cursor-pointer hover:bg-neutral-800 transition-all border-none touch-press"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            <span>New Data Available • Reload</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Sleek Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Monitored Endpoints</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Real-time uptime monitoring and health checks</p>
          </div>

          <button
            onClick={() => (isLoggedIn ? setIsRegisterOpen(true) : router.push('/login'))}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#f5f0e8] hover:bg-[#e8e2d8] text-black font-bold text-xs rounded-md transition-all border-none cursor-pointer self-start sm:self-auto shadow-sm touch-press"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>{isLoggedIn ? 'Register Endpoint' : 'Log in to Register Endpoint'}</span>
          </button>
        </div>

        {/* Streamlined Stats Summary Bar */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 bg-[#121214] rounded-lg flex items-center justify-between border-none touch-card">
            <div>
              <span className="text-[11px] sm:text-xs text-neutral-400 font-semibold uppercase tracking-wider block">Total Endpoints</span>
              <p className="text-xl sm:text-2xl font-extrabold text-[#f5f0e8] mt-1">{totalCount}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-[#1a1a1e] rounded-md text-neutral-300">
              <Globe className="w-5 h-5 text-neutral-300" />
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-[#121214] rounded-lg flex items-center justify-between border-none touch-card">
            <div>
              <span className="text-[11px] sm:text-xs text-neutral-400 font-semibold uppercase tracking-wider block">Healthy Services</span>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">{healthyCount}</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-[#1a1a1e] rounded-md text-emerald-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Monitored Backend Services */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-[#f5f0e8] uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-neutral-400" /> Monitored Services
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-[#1a1a1e] hover:bg-[#242429] transition-colors rounded-md border-none cursor-pointer touch-press"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-neutral-200' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-[#121214] rounded-lg">
              <Activity className="w-4 h-4 animate-spin text-neutral-300" />
              <span>Loading endpoints...</span>
            </div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="p-16 bg-[#121214] rounded-lg text-center space-y-3">
              <Globe className="w-8 h-8 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">
                {isLoggedIn ? 'No endpoints registered' : 'Log in to register an endpoint'}
              </h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                {isLoggedIn
                  ? 'Add your backend URL to enable automated health checks and incident tracking.'
                  : 'Log in or sign up with Security PIN to register backend endpoints for real-time uptime monitoring.'}
              </p>
              <button
                onClick={() => (isLoggedIn ? setIsRegisterOpen(true) : router.push('/login'))}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f5f0e8] hover:bg-[#e8e2d8] text-black text-xs font-bold rounded-md border-none transition-colors shadow-sm touch-press"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>{isLoggedIn ? 'Register Endpoint' : 'Log in to Register Endpoint'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedData).map(([projectName, endpoints]) => (
                <div
                  key={projectName}
                  className="p-5 bg-[#121214] rounded-lg space-y-4 border-none"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-[#1a1a1e] px-2.5 py-1 rounded-md">
                        {projectName}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">
                        {endpoints.length} {endpoints.length === 1 ? 'URL' : 'URLs'}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md ${
                        endpoints.every((e) => e.status === 'healthy' || e.status === 'pending')
                          ? 'bg-emerald-950/60 text-emerald-400'
                          : endpoints.some((e) => e.status === 'degraded')
                          ? 'bg-amber-950/60 text-amber-400'
                          : 'bg-rose-950/60 text-rose-300'
                      }`}
                    >
                      {endpoints.every((e) => e.status === 'healthy' || e.status === 'pending')
                        ? '100% Operational'
                        : endpoints.some((e) => e.status === 'degraded')
                        ? 'Degraded Performance'
                        : 'Outage Detected'}
                    </span>
                  </div>

                  {/* Endpoints in group */}
                  <div className="space-y-3">
                    {endpoints.map((ep) => {
                      const epIncidents = incidentsMap[ep._id] || [];
                      return (
                        <div
                          key={ep._id}
                          onClick={() => router.push(`/endpoint/${ep._id}`)}
                          className="p-4 bg-[#1a1a1e] hover:bg-[#242429] rounded-lg space-y-3 cursor-pointer transition-colors group border-none touch-card"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors truncate">
                                {ep.url}
                              </span>
                              <ExternalLink className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#121214] text-neutral-400 rounded-md shrink-0">
                                {ep.method}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <NextCheckCountdown
                                lastCheckedAt={ep.lastCheckedAt}
                                checkIntervalMinutes={ep.checkIntervalMinutes}
                                onCycleComplete={handleCycleComplete}
                              />

                              <button
                                onClick={(e) => handleDeleteEndpoint(ep._id, e)}
                                title="Delete endpoint"
                                className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-[#121214] rounded-md transition-colors border-none opacity-0 group-hover:opacity-100 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* 30-Day Grid */}
                          <IncidentTimeline incidents={epIncidents} endpointStatus={ep.status} />

                          {/* Incident Previews */}
                          {epIncidents.length > 0 && (
                            <div className="pt-2 border-t border-neutral-900 space-y-1.5">
                              <span className="text-[10px] text-neutral-500 uppercase font-mono font-medium block">Recent Incidents:</span>
                              <div className="space-y-1">
                                {epIncidents.slice(0, 2).map((inc) => (
                                  <div
                                    key={inc._id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedIncident(inc);
                                    }}
                                    className="p-2 bg-[#121214] hover:bg-[#242429] rounded-md flex items-center justify-between text-xs transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${inc.resolved ? 'bg-amber-400' : 'bg-rose-500'}`} />
                                      <span className="text-neutral-300 font-medium truncate">{inc.errorMessage}</span>
                                    </div>
                                    <span className="text-neutral-500 text-[11px] font-mono flex items-center gap-1 shrink-0">
                                      {new Date(inc.startedAt).toLocaleDateString()} <ChevronRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={loadData}
      />

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />
    </div>
  );
}
