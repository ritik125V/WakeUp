'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft,
  Server,
  Zap,
  Trash2,
  Settings,
  AlertTriangle,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  apiClient,
  EndpointData,
  IncidentData,
  deleteEndpoint,
} from '@/lib/api';
import { IncidentTimeline } from '@/components/IncidentTimeline';
import { NextCheckCountdown } from '@/components/NextCheckCountdown';
import { EditConfigModal } from '@/components/EditConfigModal';
import { LiveTestModal, LiveTestResult } from '@/components/LiveTestModal';
import { IncidentAccordion } from '@/components/IncidentAccordion';
import { EndpointDetailSkeleton } from '@/components/Skeleton';

export default function EndpointDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const endpointId = resolvedParams.id;
  const router = useRouter();

  const [endpoint, setEndpoint] = useState<EndpointData | null>(null);
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [liveTesting, setLiveTesting] = useState(false);
  const [liveResult, setLiveResult] = useState<LiveTestResult | null>(null);

  // Floating reload pill toast
  const [showReloadPill, setShowReloadPill] = useState(false);

  const loadData = async () => {
    try {
      const epRes = await apiClient.get<{ endpoint: EndpointData; incidents: IncidentData[] }>(`/endpoints/${endpointId}`);
      setEndpoint(epRes.data.endpoint);
      setIncidents(epRes.data.incidents || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load endpoint details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [endpointId]);

  const handleCycleComplete = () => {
    setShowReloadPill(true);
  };

  const handleReloadPage = () => {
    setShowReloadPill(false);
    loadData();
  };

  // Perform Live Health Check directly from Browser
  const handleLiveBrowserCheck = async () => {
    if (!endpoint) return;
    setLiveTesting(true);
    setLiveResult(null);

    const startTime = Date.now();
    try {
      const response = await axios.get(endpoint.url, {
        timeout: 10000,
        headers: { Accept: 'application/json, text/plain, */*' },
        validateStatus: () => true,
      });

      const responseTimeMs = Date.now() - startTime;
      const expectedCode = endpoint.expectedStatusCode ?? 200;

      const headersObj: Record<string, string> = {};
      Object.entries(response.headers).forEach(([k, v]) => {
        headersObj[k] = String(v);
      });

      const isError = expectedCode !== 200
        ? response.status !== expectedCode
        : (response.status < 200 || response.status >= 300);

      setLiveResult({
        status: response.status,
        statusText: response.statusText || (response.status === 200 ? 'OK' : 'RESPONSE_RECEIVED'),
        responseTimeMs,
        headers: headersObj,
        data: response.data,
        isError,
      });
    } catch (err: unknown) {
      const responseTimeMs = Date.now() - startTime;
      let errMsg = 'CORS constraint or network error';
      if (axios.isAxiosError(err)) {
        errMsg = err.message;
      } else if (err instanceof Error) {
        errMsg = err.message;
      }

      setLiveResult({
        status: 0,
        statusText: 'CLIENT_FETCH_ERROR',
        responseTimeMs,
        headers: {},
        data: null,
        isError: true,
        errorMessage: `${errMsg} (Note: Direct browser calls require target API to allow CORS headers)`,
      });
    } finally {
      setLiveTesting(false);
      setIsLiveModalOpen(true);
    }
  };

  // Handle Endpoint Deletion
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this endpoint and its incident history?')) return;
    try {
      await deleteEndpoint(endpointId);
      router.push('/');
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 p-6 sm:p-10 font-sans">
        <EndpointDetailSkeleton />
      </div>
    );
  }

  if (error || !endpoint) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6 font-mono">
        <div className="p-6 max-w-md bg-neutral-950 rounded-lg text-center space-y-3 font-mono border-none">
          <AlertTriangle className="w-8 h-8 text-rose-300 mx-auto" />
          <h2 className="text-sm font-bold text-white">Endpoint Not Found</h2>
          <p className="text-xs text-neutral-400">{error || 'Endpoint record could not be found.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col items-center justify-start p-4 sm:p-8 font-mono relative">
      {/* Small Floating Micro Refresh Pill */}
      <AnimatePresence>
        {showReloadPill && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={handleReloadPage}
            className="fixed top-5 right-5 z-50 px-3.5 py-1.5 bg-neutral-900 text-rose-300 text-xs font-mono rounded-full shadow-2xl flex items-center gap-2 cursor-pointer hover:bg-neutral-800 transition-all border-none"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-300" />
            <span>New Data • Reload</span>
          </motion.div>
        )}
      </AnimatePresence>      <div className="w-full max-w-4xl space-y-6 sm:space-y-8 my-4">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors touch-press"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-300" /> Back to Dashboard
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-900 text-[11px] font-mono text-neutral-300 rounded-md">
              <Activity className="w-3.5 h-3.5 text-neutral-300" />
              ENDPOINT MONITOR
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                endpoint.status === 'healthy'
                  ? 'bg-emerald-950/60 text-emerald-400'
                  : endpoint.status === 'degraded'
                  ? 'bg-amber-950/60 text-amber-400'
                  : 'bg-rose-950/60 text-rose-300'
              }`}
            >
              {endpoint.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Header Summary Card (No Borders) */}
        <div className="p-5 sm:p-6 bg-[#121214] rounded-lg space-y-4 border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-white font-bold bg-[#1a1a1e] px-2.5 py-0.5 rounded-md uppercase">
                {endpoint.projectName}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#f5f0e8] mt-1.5 break-all">{endpoint.url}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1a1e] hover:bg-[#242429] text-neutral-200 text-xs font-bold rounded-md transition-all border-none touch-press cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-400" /> Edit Config
              </button>

              <button
                onClick={handleLiveBrowserCheck}
                disabled={liveTesting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f5f0e8] hover:bg-[#e8e2d8] text-black text-xs font-bold rounded-md transition-all disabled:opacity-50 border-none touch-press shadow-sm cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-black" />
                {liveTesting ? 'Testing Browser API...' : 'Test API (Browser)'}
              </button>
            </div>
          </div>

          {/* Compact Inline NextCheckCountdown */}
          <div className="pt-3 flex items-center justify-between border-t border-neutral-900">
            <NextCheckCountdown
              lastCheckedAt={endpoint.lastCheckedAt}
              checkIntervalMinutes={endpoint.checkIntervalMinutes}
              onCycleComplete={handleCycleComplete}
            />

            <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
              <span>Expected Code: <strong className="text-white">HTTP {endpoint.expectedStatusCode}</strong></span>
              {endpoint.lastResponseTimeMs && (
                <span>Latency: <strong className="text-neutral-200">{endpoint.lastResponseTimeMs}ms</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* 30-Day Health Grid */}
        <div className="p-5 sm:p-6 bg-[#121214] rounded-lg space-y-3 border-none">
          <IncidentTimeline incidents={incidents} endpointStatus={endpoint.status} />
        </div>

        {/* Incidents Log Table */}
        <div className="p-5 sm:p-6 bg-[#121214] rounded-lg space-y-4 border-none">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <h2 className="text-sm font-extrabold uppercase text-[#f5f0e8] tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> INCIDENT LOGS ({incidents.length})
            </h2>

            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1e] hover:bg-rose-950/60 text-neutral-400 hover:text-rose-300 text-xs rounded-md transition-all border-none touch-press cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Endpoint
            </button>
          </div>

          <IncidentAccordion incidents={incidents} />
        </div>
      </div>

      {/* Edit Configuration Modal */}
      <EditConfigModal
        isOpen={isEditOpen}
        endpoint={endpoint}
        onClose={() => setIsEditOpen(false)}
        onSaveSuccess={loadData}
      />

      {/* Full Detail Live API Inspector Modal */}
      <LiveTestModal
        isOpen={isLiveModalOpen}
        url={endpoint.url}
        result={liveResult}
        onClose={() => setIsLiveModalOpen(false)}
      />
    </div>
  );
}
