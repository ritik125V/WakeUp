'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import {
  ArrowLeft,
  FileDown,
  ExternalLink,
  Download,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Sparkles,
  Layers,
  Edit,
  MinusCircle,
  Play,
  Activity,
  Search,
  Filter,
  BarChart3,
  Check,
} from 'lucide-react';
import {
  fetchWorkflowById,
  triggerWorkflow,
  WorkflowData,
} from '@/lib/api';
import {
  generateWorkflowPDFReport,
  openWorkflowPDFInNewTab,
  IStepTelemetryForPDF,
  IWorkflowRunSummaryForPDF,
} from '@/lib/pdfReportGenerator';

const API_SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function WorkflowReportPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [stepLogs, setStepLogs] = useState<IStepTelemetryForPDF[]>([]);
  const [summary, setSummary] = useState<IWorkflowRunSummaryForPDF | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'skipped'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const socketRef = useRef<Socket | null>(null);
  const hasTriggeredRun = useRef<boolean>(false);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const res = await fetchWorkflowById(workflowId);
      setWorkflow(res.workflow);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunExecution = async () => {
    try {
      setIsRunning(true);
      setStepLogs([]);
      setSummary(null);
      await triggerWorkflow(workflowId);
    } catch (err) {
      console.error('Failed to trigger workflow execution:', err);
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId]);

  useEffect(() => {
    if (!workflowId) return;

    const socket = io(API_SOCKET_URL);
    socketRef.current = socket;

    socket.emit('join:workflow', workflowId);

    socket.on('workflow:started', () => {
      setIsRunning(true);
      setStepLogs([]);
      setSummary(null);
    });

    socket.on('workflow:step_completed', (telemetry: IStepTelemetryForPDF) => {
      setStepLogs((prev) => {
        const existingIdx = prev.findIndex((s) => s.stepIndex === telemetry.stepIndex);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = telemetry;
          return updated;
        }
        return [...prev, telemetry];
      });
    });

    socket.on('workflow:finished', (finalData) => {
      setIsRunning(false);
      const runSummary: IWorkflowRunSummaryForPDF = {
        workflowName: workflow?.name || 'API Workflow Execution Report',
        startedAt: new Date(Date.now() - (finalData.totalTimeMs || 0)).toISOString(),
        finishedAt: finalData.finishedAt,
        totalTimeMs: finalData.totalTimeMs,
        totalSteps: finalData.totalSteps,
        successSteps: finalData.successSteps,
        failedSteps: finalData.failedSteps,
        overallStatus: finalData.overallStatus,
        steps: finalData.logs || [],
      };
      setSummary(runSummary);
    });

    // Auto trigger run ONLY ONCE on mount
    if (!hasTriggeredRun.current) {
      hasTriggeredRun.current = true;
      handleRunExecution();
    }

    return () => {
      socket.disconnect();
    };
  }, [workflowId]);

  const handleExportJSON = () => {
    if (!workflow) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(workflow, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataStr);
    anchor.setAttribute('download', `Workflow_${workflow.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const getMethodBadgeStyle = (method?: string) => {
    switch (method?.toUpperCase()) {
      case 'POST':
        return 'badge-post';
      case 'PUT':
        return 'badge-put';
      case 'DELETE':
        return 'badge-delete';
      default:
        return 'badge-get';
    }
  };

  if (loading || !workflow) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-2 text-rose-300 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-rose-400" /> Loading Report Workspace...
        </div>
      </div>
    );
  }

  const currentSummary: IWorkflowRunSummaryForPDF = summary || {
    workflowName: workflow.name,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    totalTimeMs: stepLogs.reduce((acc, curr) => acc + curr.latencyMs, 0),
    totalSteps: workflow.steps.length,
    successSteps: stepLogs.filter((s) => s.status === 'success').length,
    failedSteps: stepLogs.filter((s) => s.status === 'failed' || s.status === 'error').length,
    overallStatus: isRunning ? 'running' : stepLogs.some((s) => s.status === 'failed' || s.status === 'error') ? 'failed' : 'success',
    steps: stepLogs,
  };

  const progressPercentage = Math.round(
    (stepLogs.length / Math.max(workflow.steps.length, 1)) * 100
  );

  const maxStepLatency = Math.max(...stepLogs.map((s) => s.latencyMs || 0), 100);

  const filteredLogs = stepLogs.filter((step) => {
    const matchesSearch =
      step.stepName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.url.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'success') return matchesSearch && step.status === 'success';
    if (filterStatus === 'failed') return matchesSearch && (step.status === 'failed' || step.status === 'error');
    if (filterStatus === 'skipped') return matchesSearch && step.status === 'skipped';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-mono p-4 sm:p-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Full-Width Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-900 pb-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/workflows/${workflowId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Workflow Builder
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] rounded-md font-bold">
                <Activity className="w-3.5 h-3.5 text-rose-400" /> LIVE EXECUTION REPORT
              </span>
              {isRunning && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-500/30 text-[10px] rounded font-bold animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin text-rose-300" /> EXECUTING LIVE
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wide">
              {workflow.name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleRunExecution}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg border-none transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current flex-shrink-0" />
              )}
              <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Re-Run Flow'}</span>
              <span className="sm:hidden">{isRunning ? 'Running...' : 'Re-Run'}</span>
            </button>

            <button
              onClick={() => openWorkflowPDFInNewTab(currentSummary)}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-rose-300 text-xs font-bold rounded-lg border border-white/10 transition-all disabled:opacity-50 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Open PDF Tab</span>
              <span className="sm:hidden">Open PDF</span>
            </button>

            <button
              onClick={() => generateWorkflowPDFReport(currentSummary)}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-bold rounded-lg border border-white/10 transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-rose-300 flex-shrink-0" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs rounded-lg border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-rose-300 flex-shrink-0" />
              <span className="hidden sm:inline">Export JSON</span>
              <span className="sm:hidden">JSON</span>
            </button>

            <button
              onClick={() => router.push(`/workflows/${workflowId}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-lg border border-white/10 transition-all cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
              <span className="hidden sm:inline">Edit Builder</span>
              <span className="sm:hidden">Edit</span>
            </button>
          </div>
        </div>

        {/* Live Execution Progress Bar */}
        <div className="p-4 bg-neutral-950/80 rounded-xl border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" /> Live Execution Stream Progress
            </span>
            <span className="font-bold text-rose-300">{progressPercentage}% Complete</span>
          </div>

          <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 rounded-full shadow-lg shadow-rose-500/50"
            />
          </div>
        </div>

        {/* Full-Width Summary Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-neutral-950/80 rounded-xl space-y-1 shadow-md border border-white/10">
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Execution Status</span>
            <div className="flex items-center gap-1.5 font-bold text-sm">
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
                  <span className="text-rose-300">EXECUTING...</span>
                </>
              ) : currentSummary.overallStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">PASSED</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400">FAILED</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-neutral-950/80 rounded-xl space-y-1 shadow-md border border-white/10">
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Total Duration</span>
            <div className="font-bold text-sm text-white flex items-center gap-1">
              <Clock className="w-4 h-4 text-rose-400" />
              {currentSummary.totalTimeMs} ms
            </div>
          </div>

          <div className="p-4 bg-neutral-950/80 rounded-xl space-y-1 shadow-md border border-white/10">
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Passed Steps</span>
            <div className="font-bold text-sm text-emerald-400">
              {currentSummary.successSteps} / {currentSummary.totalSteps}
            </div>
          </div>

          <div className="p-4 bg-neutral-950/80 rounded-xl space-y-1 shadow-md border border-white/10">
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Failed / Skipped</span>
            <div className="font-bold text-sm text-rose-400">
              {currentSummary.failedSteps} Failed | {stepLogs.filter((s) => s.status === 'skipped').length} Skipped
            </div>
          </div>
        </div>

        {/* Step Latency Distribution Graph */}
        {stepLogs.length > 0 && (
          <div className="p-5 bg-neutral-950/90 rounded-xl border border-white/10 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-400" /> Step Latency Comparison (ms)
              </h3>
              <span className="text-[11px] text-neutral-400">Max: {maxStepLatency}ms</span>
            </div>

            <div className="space-y-2 pt-1">
              {stepLogs.map((step, idx) => {
                const ratio = Math.min((step.latencyMs / maxStepLatency) * 100, 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-300 font-bold truncate max-w-[300px]">
                        Step {step.stepIndex}: {step.stepName}
                      </span>
                      <span className="text-rose-300 font-bold">{step.latencyMs} ms</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        style={{ width: `${ratio}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          step.status === 'success'
                            ? 'bg-emerald-400'
                            : step.status === 'skipped'
                            ? 'bg-neutral-600'
                            : 'bg-rose-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Log Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-white/10'
              }`}
            >
              All ({stepLogs.length})
            </button>
            <button
              onClick={() => setFilterStatus('success')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-white/10'
              }`}
            >
              Passed ({stepLogs.filter((s) => s.status === 'success').length})
            </button>
            <button
              onClick={() => setFilterStatus('failed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'failed'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-white/10'
              }`}
            >
              Failed ({stepLogs.filter((s) => s.status === 'failed' || s.status === 'error').length})
            </button>
            <button
              onClick={() => setFilterStatus('skipped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'skipped'
                  ? 'bg-neutral-800 text-white shadow-md'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-white/10'
              }`}
            >
              Skipped ({stepLogs.filter((s) => s.status === 'skipped').length})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search step log URL or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 text-white pl-8 pr-3 py-1.5 rounded-lg text-xs border border-white/10 focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </div>

        {/* Detailed Step Execution Feed */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" /> Complete Step Execution Logs & Metrics
          </h2>

          <div className="space-y-4 w-full">
            {filteredLogs.length === 0 ? (
              <div className="p-12 bg-neutral-950/80 rounded-xl border border-white/10 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Streaming live step logs from Socket.IO runner engine...</span>
                  </>
                ) : (
                  <span>No execution logs match the selected filter query.</span>
                )}
              </div>
            ) : (
              filteredLogs.map((step, idx) => (
                <div key={idx} className="p-5 bg-neutral-950/80 rounded-xl space-y-3 border border-white/10 shadow-lg w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-2">
                    <div className="flex items-center gap-2.5">
                      {step.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : step.status === 'skipped' ? (
                        <MinusCircle className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <span className="font-bold text-white text-sm">
                        Step {step.stepIndex}: {step.stepName}
                      </span>
                      <span className={`px-2 py-0.5 font-bold text-[10px] rounded ${getMethodBadgeStyle(step.method)}`}>
                        {step.method}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-neutral-400 text-xs">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          step.status === 'success'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : step.status === 'skipped'
                            ? 'bg-neutral-900 text-neutral-400 border border-white/5'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {step.status === 'skipped' ? 'SKIPPED' : step.statusCode || 'ERR'}
                      </span>
                      <span className="text-neutral-300 font-bold">{step.latencyMs}ms</span>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-400 break-all">
                    URL: <span className="text-neutral-200 font-mono">{step.url}</span>
                  </div>

                  {step.errorMessage && (
                    <div className="p-3 bg-rose-950/40 text-rose-300 rounded-lg border border-rose-500/20 text-xs font-bold">
                      {step.errorMessage}
                    </div>
                  )}

                  {step.capturedCookies && Object.keys(step.capturedCookies).length > 0 && (
                    <div className="text-xs text-indigo-400 font-bold">
                      Cookies Captured: {Object.keys(step.capturedCookies).join(', ')}
                    </div>
                  )}

                  {step.extractedVars && Object.keys(step.extractedVars).length > 0 && (
                    <div className="text-xs text-emerald-400 font-bold">
                      Extracted Context Variables: {JSON.stringify(step.extractedVars)}
                    </div>
                  )}

                  {step.requestHeaders && Object.keys(step.requestHeaders).length > 0 && (
                    <details className="text-xs text-neutral-400 cursor-pointer pt-1">
                      <summary className="hover:text-white font-bold">Inspect Sent Request Headers</summary>
                      <pre className="mt-1.5 p-3 bg-neutral-900 rounded-lg text-neutral-300 overflow-x-auto max-h-36 leading-relaxed border border-white/5 whitespace-pre-wrap break-all max-w-full">
                        {JSON.stringify(step.requestHeaders, null, 2)}
                      </pre>
                    </details>
                  )}

                  {step.responseBody && (
                    <details className="text-xs text-neutral-400 cursor-pointer pt-1" open>
                      <summary className="hover:text-white font-bold">Inspect Response Body Snippet</summary>
                      <pre className="mt-1.5 p-3.5 bg-neutral-900 rounded-xl text-emerald-400 overflow-x-auto max-h-60 leading-relaxed border border-white/5 whitespace-pre-wrap break-all max-w-full">
                        {typeof step.responseBody === 'object'
                          ? JSON.stringify(step.responseBody, null, 2)
                          : String(step.responseBody)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

