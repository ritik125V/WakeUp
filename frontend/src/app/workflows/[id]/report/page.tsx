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
  AlertTriangle,
  Copy,
  Terminal,
  FileCode,
  History,
  GitBranch,
  GitCommit,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchWorkflowById,
  triggerWorkflow,
  executeWorkflowInBrowser,
  fetchWorkflowRunHistory,
  WorkflowData,
} from '@/lib/api';
import {
  generateWorkflowPDFReport,
  openWorkflowPDFInNewTab,
  IStepTelemetryForPDF,
  IWorkflowRunSummaryForPDF,
} from '@/lib/pdfReportGenerator';
import {
  generateAiDebugPrompt,
  downloadAiDebugReportMarkdown,
  openAiDebugReportInNewTab,
} from '@/lib/aiDebugExporter';
import { ApiResponseDrawer } from '@/components/ApiResponseDrawer';
import { getLocalWorkflowById, getLocalRunHistory } from '@/lib/workflowLocalStorage';

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
  const [activeMainTab, setActiveMainTab] = useState<'analysis' | 'details'>('analysis');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const handleCopyText = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isRunHistoryOpen, setIsRunHistoryOpen] = useState<boolean>(false);
  const [pastRuns, setPastRuns] = useState<any[]>([]);
  const [loadingPastRuns, setLoadingPastRuns] = useState<boolean>(false);

  const loadPastRuns = () => {
    try {
      setLoadingPastRuns(true);
      const localHistory = getLocalRunHistory(workflowId);
      setPastRuns(localHistory || []);
    } catch (err) {
      console.error('Failed to load local workflow run history:', err);
    } finally {
      setLoadingPastRuns(false);
    }
  };

  const handleOpenHistory = () => {
    setIsRunHistoryOpen(true);
    loadPastRuns();
  };

  const socketRef = useRef<Socket | null>(null);
  const hasTriggeredRun = useRef<boolean>(false);

  const loadWorkflow = () => {
    try {
      setLoading(true);
      // Load workflow strictly from LocalStorage (zero database calls)
      const localWf = getLocalWorkflowById(workflowId);
      setWorkflow(localWf);
    } catch (err) {
      console.error('Failed to load workflow from LocalStorage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunExecution = async (currentWf?: WorkflowData | null) => {
    const targetWf = currentWf || workflow;
    if (!targetWf) return;

    try {
      setIsRunning(true);
      setStepLogs([]);
      setSummary(null);

      // Execute workflow 100% in browser directly from LocalStorage (zero DB calls)
      const resSummary = await executeWorkflowInBrowser(targetWf, (telemetry) => {
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
      setSummary(resSummary);
    } catch (err) {
      console.error('Failed to execute workflow in browser:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId]);

  useEffect(() => {
    if (!workflow) return;

    // Trigger run once workflow data is loaded
    if (!hasTriggeredRun.current) {
      hasTriggeredRun.current = true;
      handleRunExecution(workflow);
    }
  }, [workflow]);

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

    return () => {
      socket.disconnect();
    };
  }, [workflowId, workflow]);

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
    <div className="min-h-screen bg-black text-neutral-100 font-mono px-4 sm:px-8 py-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Full-Width Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-2">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/workflows/${workflowId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Workflow Builder
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#161619] text-neutral-300 text-[10px] rounded-md font-bold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> LIVE EXECUTION REPORT
              </span>
              {isRunning && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 text-amber-300 text-[10px] rounded-md font-bold animate-pulse uppercase tracking-wider">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-300" /> EXECUTING LIVE
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wide">
              {workflow.name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => handleRunExecution()}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f5f0e8] hover:bg-[#e6e1d9] text-black font-bold text-xs rounded-md border-none transition-all shadow-md disabled:opacity-50 cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#161619] hover:bg-[#202025] text-neutral-300 hover:text-white text-xs font-bold rounded-md border-none transition-all disabled:opacity-50 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span className="hidden sm:inline">Open PDF Tab</span>
              <span className="sm:hidden">Open PDF</span>
            </button>

            <button
              onClick={() => generateWorkflowPDFReport(currentSummary)}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#161619] hover:bg-[#202025] text-neutral-300 hover:text-white text-xs font-bold rounded-md border-none transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#161619] hover:bg-[#202025] text-neutral-300 hover:text-white text-xs rounded-md border-none transition-all cursor-pointer font-bold"
            >
              <Download className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="hidden sm:inline">Export JSON</span>
              <span className="sm:hidden">JSON</span>
            </button>

            <button
              onClick={() => router.push(`/workflows/${workflowId}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#161619] hover:bg-[#202025] text-neutral-300 hover:text-white text-xs rounded-md border-none transition-all cursor-pointer font-bold"
            >
              <Edit className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="hidden sm:inline">Edit Builder</span>
              <span className="sm:hidden">Edit</span>
            </button>
          </div>
        </div>

        {/* Execution Progress Bar (Solid White Bar, No Icons) */}
        <div className="p-4 bg-[#121214] rounded-xl border-none space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider">
              Progress
            </span>
            <span className="font-bold text-neutral-300">{progressPercentage}% Complete</span>
          </div>

          <div className="w-full h-2.5 bg-[#1a1a1e] rounded-full overflow-hidden border-none">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
              className="h-full bg-white rounded-full shadow-sm"
            />
          </div>
        </div>

        {/* Primary 2-Tab Navigation Bar: 1. Analysis & Performance | 2. Request & Response Details */}
        {(() => {
          const failedStepsList = stepLogs.filter((s) => s.status === 'failed' || s.status === 'error');

          const generateAnalysisText = () => {
            let out = `📊 WakeUp Workflow Execution Analysis Report\n`;
            out += `==========================================\n`;
            out += `Workflow: ${workflow.name}\n`;
            out += `Overall Status: ${currentSummary.overallStatus.toUpperCase()}\n`;
            out += `Total Duration: ${currentSummary.totalTimeMs} ms\n`;
            out += `Passed Steps: ${currentSummary.successSteps} / ${currentSummary.totalSteps}\n`;
            out += `Failed Steps: ${currentSummary.failedSteps}\n\n`;
            out += `Step Latency Breakdown:\n`;
            stepLogs.forEach((step) => {
              out += `  - Step ${step.stepIndex} (${step.stepName}): ${step.latencyMs} ms [${step.status.toUpperCase()}]\n`;
            });
            return out;
          };

          return (
            <div className="space-y-6">
              {/* Tab Selector Bar */}
              <div className="flex items-center gap-2 border-b border-neutral-900 pb-3 pt-2">
                <button
                  onClick={() => setActiveMainTab('analysis')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs transition-all cursor-pointer border-none ${
                    activeMainTab === 'analysis'
                      ? 'bg-[#f5f0e8] text-black shadow-md'
                      : 'bg-[#161619] text-neutral-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>1. Analysis & Performance</span>
                </button>

                <button
                  onClick={() => setActiveMainTab('details')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs transition-all cursor-pointer border-none ${
                    activeMainTab === 'details'
                      ? 'bg-[#f5f0e8] text-black shadow-md'
                      : 'bg-[#161619] text-neutral-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>2. Request & Response Details ({stepLogs.length})</span>
                  {failedStepsList.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-950 text-rose-300 text-[10px] rounded font-bold">
                      {failedStepsList.length} Failed
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: ANALYSIS & PERFORMANCE */}
              {activeMainTab === 'analysis' && (
                <div className="space-y-6">
                  {/* Summary Metrics Cards inside Analysis Tab */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-[#121214] rounded-xl space-y-1 shadow-md border-none">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Execution Status</span>
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        {isRunning ? (
                          <>
                            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                            <span className="text-amber-300">EXECUTING...</span>
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

                    <div className="p-4 bg-[#121214] rounded-xl space-y-1 shadow-md border-none">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Total Duration</span>
                      <div className="font-bold text-sm text-white flex items-center gap-1">
                        <Clock className="w-4 h-4 text-amber-400" />
                        {currentSummary.totalTimeMs} ms
                      </div>
                    </div>

                    <div className="p-4 bg-[#121214] rounded-xl space-y-1 shadow-md border-none">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Passed Steps</span>
                      <div className="font-bold text-sm text-emerald-400">
                        {currentSummary.successSteps} / {currentSummary.totalSteps}
                      </div>
                    </div>

                    <div className="p-4 bg-[#121214] rounded-xl space-y-1 shadow-md border-none">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Failed / Skipped</span>
                      <div className="font-bold text-sm text-rose-400">
                        {currentSummary.failedSteps} Failed | {stepLogs.filter((s) => s.status === 'skipped').length} Skipped
                      </div>
                    </div>
                  </div>

                  {/* Performance Analysis Header & Copy Button */}
                  <div className="p-5 bg-[#121214] rounded-lg border-none flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-amber-950 text-amber-300 text-[10px] font-bold rounded-md uppercase">
                          Performance Telemetry
                        </span>
                        {currentSummary.overallStatus === 'success' ? (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] font-bold rounded-md">
                            100% Passed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-950 text-rose-400 text-[10px] font-bold rounded-md">
                            {failedStepsList.length} Failures Detected
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-white">Execution Latency & Performance Breakdown</h2>
                      <p className="text-xs text-neutral-400">
                        Step-by-step latency comparison, execution status rates, and total round-trip timing.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyText(generateAnalysisText(), 'analysis-report')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f5f0e8] hover:bg-[#e6e1d9] text-black font-bold text-xs rounded-md border-none transition-all shadow-md cursor-pointer"
                      >
                        {copiedKey === 'analysis-report' ? (
                          <>
                            <Check className="w-4 h-4 text-black" /> Copied Analysis!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-black" /> Copy Analysis Report
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Step Latency Comparison Visual Bar Chart */}
                  {stepLogs.length > 0 && (
                    <div className="p-5 bg-[#121214] rounded-lg border-none space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-amber-400" /> Step Latency Comparison (ms)
                        </h3>
                        <span className="text-[11px] text-neutral-400">Max Latency: {maxStepLatency} ms</span>
                      </div>

                      <div className="space-y-3 pt-1">
                        {stepLogs.map((step, idx) => {
                          const ratio = Math.min((step.latencyMs / maxStepLatency) * 100, 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-neutral-200 font-bold truncate max-w-md">
                                  Step {step.stepIndex}: {step.stepName} ({step.method} {step.url})
                                </span>
                                <span className="text-amber-300 font-bold">{step.latencyMs} ms</span>
                              </div>
                              <div className="w-full h-2.5 bg-[#1a1a1e] rounded-md overflow-hidden border-none">
                                <div
                                  style={{ width: `${ratio}%` }}
                                  className={`h-full rounded-md transition-all duration-500 ${
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

                  {/* Failed Step Telemetry Quick Alert */}
                  {failedStepsList.length > 0 && (
                    <div className="p-5 bg-rose-950/30 rounded-lg border-none space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>{failedStepsList.length} Failed Step(s) Require Attention</span>
                        </div>
                        <button
                          onClick={() => setActiveMainTab('details')}
                          className="text-[11px] text-rose-300 hover:underline font-bold cursor-pointer"
                        >
                          View Full Details in Tab 2 →
                        </button>
                      </div>
                      <p className="text-[11px] text-rose-200/80 leading-relaxed">
                        Step failure details, raw payloads, and status codes are available in the Request & Response Details tab.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REQUEST & RESPONSE DETAILS */}
              {activeMainTab === 'details' && (
                <div className="space-y-6">
                  {/* Log Filter Tabs & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-none ${
                          filterStatus === 'all'
                            ? 'bg-[#f5f0e8] text-black shadow-md'
                            : 'bg-[#161619] text-neutral-400 hover:text-white'
                        }`}
                      >
                        All ({stepLogs.length})
                      </button>
                      <button
                        onClick={() => setFilterStatus('success')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-none ${
                          filterStatus === 'success'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-[#161619] text-neutral-400 hover:text-white'
                        }`}
                      >
                        Passed ({stepLogs.filter((s) => s.status === 'success').length})
                      </button>
                      <button
                        onClick={() => setFilterStatus('failed')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-none ${
                          filterStatus === 'failed'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-[#161619] text-neutral-400 hover:text-white'
                        }`}
                      >
                        Failed ({stepLogs.filter((s) => s.status === 'failed' || s.status === 'error').length})
                      </button>
                      <button
                        onClick={() => setFilterStatus('skipped')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer border-none ${
                          filterStatus === 'skipped'
                            ? 'bg-neutral-800 text-white shadow-md'
                            : 'bg-[#161619] text-neutral-400 hover:text-white'
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
                        className="w-full bg-[#161619] text-white pl-8 pr-3 py-1.5 rounded-md text-xs border-none focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Detailed Step Execution Feed */}
                  <div className="space-y-4">
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" /> Complete Step Request & Response Telemetry
                    </h2>

                    <div className="space-y-4 w-full">
                      {filteredLogs.length === 0 ? (
                        <div className="p-12 bg-[#121214] rounded-lg border-none text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
                          {isRunning ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                              <span>Streaming live step logs from WakeUp API Engine...</span>
                            </>
                          ) : (
                            <span>No execution logs match the selected filter query.</span>
                          )}
                        </div>
                      ) : (
                        filteredLogs.map((step) => {
                          const isExpanded = expandedSteps[step.stepIndex] ?? (step.stepIndex === 1 || step.status === 'failed' || step.status === 'error');
                          const methodStyle =
                            step.method === 'POST' ? 'bg-amber-950/80 text-amber-300' :
                            step.method === 'PUT' ? 'bg-sky-950/80 text-sky-300' :
                            step.method === 'PATCH' ? 'bg-purple-950/80 text-purple-300' :
                            step.method === 'DELETE' ? 'bg-rose-950/80 text-rose-300' :
                            'bg-emerald-950/80 text-emerald-300';

                          const statusBg =
                            step.status === 'skipped' ? 'bg-neutral-800 text-neutral-400 font-bold' :
                            step.statusCode && step.statusCode >= 200 && step.statusCode < 300 ? 'bg-[#16a34a] text-white font-bold' :
                            'bg-rose-600 text-white font-bold';

                          return (
                            <div key={step.stepIndex} className="bg-[#121214] rounded-xl overflow-hidden border-none shadow-md space-y-0 font-mono">
                              {/* Step Accordion Summary Header Bar */}
                              <div
                                onClick={() => setExpandedSteps((prev) => ({ ...prev, [step.stepIndex]: !isExpanded }))}
                                className="px-4 py-3 bg-[#161619] hover:bg-[#1a1a1e] flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors select-none"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex-shrink-0">
                                    Step {step.stepIndex}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase flex-shrink-0 ${methodStyle}`}>
                                    {step.method || 'GET'}
                                  </span>
                                  <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                                    {step.stepName}
                                  </span>
                                  <span className="text-[11px] text-neutral-400 truncate flex-1 min-w-0 font-mono hidden md:inline">
                                    {step.url}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0 text-xs font-mono">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${statusBg}`}>
                                    {step.status === 'skipped' ? 'SKIPPED' : step.statusCode ? `${step.statusCode} OK` : 'ERR'}
                                  </span>
                                  <span className="text-neutral-500 text-xs font-bold">•</span>
                                  <span className="text-neutral-300 text-xs font-mono">{step.latencyMs} ms</span>
                                  <button
                                    type="button"
                                    className="p-1 text-neutral-400 hover:text-white transition-transform border-none bg-transparent"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Step Response Drawer (Bounded to 35vh height) */}
                              {isExpanded && (
                                <div className="pt-0 h-[35vh] max-h-[35vh] min-h-[260px] overflow-hidden flex flex-col">
                                  <ApiResponseDrawer
                                    result={{
                                      stepId: `step-${step.stepIndex}`,
                                      stepName: step.stepName,
                                      url: step.url,
                                      method: step.method,
                                      status: step.status as any,
                                      statusCode: step.statusCode,
                                      latencyMs: step.latencyMs,
                                      errorMessage: step.errorMessage,
                                      responseBody: step.responseBody,
                                      responseSnippet: typeof step.responseBody === 'string' ? step.responseBody : undefined,
                                      headers: step.responseHeaders || step.requestHeaders || {},
                                      cookies: step.capturedCookies,
                                      extractedVars: step.extractedVars,
                                      executionSource: step.url?.includes('localhost') || step.url?.includes('127.0.0.1') ? 'browser' : 'cloud',
                                      timestamp: new Date().toLocaleTimeString(),
                                    }}
                                    title={`Step ${step.stepIndex}: ${step.stepName}`}
                                    defaultOpen={true}
                                    hideHeaderStatus={true}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* SAVED RUN HISTORY MODAL DRAWER */}
        <AnimatePresence>
          {isRunHistoryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-3xl p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border border-purple-500/20 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Execution Run History</h3>
                      <p className="text-[11px] text-neutral-400">Past executions saved in database (including automated GitHub push triggers)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRunHistoryOpen(false)}
                    className="p-1 hover:bg-neutral-900 rounded text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {loadingPastRuns ? (
                  <div className="p-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> Loading execution run history...
                  </div>
                ) : pastRuns.length === 0 ? (
                  <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-900/40 rounded-xl">
                    No past execution run reports recorded in database yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastRuns.map((run) => (
                      <div
                        key={run._id}
                        className="p-4 bg-neutral-900/80 hover:bg-neutral-900 rounded-xl space-y-2 border border-white/5 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {run.summary?.overallStatus === 'success' ? (
                              <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] font-bold rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PASSED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-rose-950 text-rose-400 text-[10px] font-bold rounded flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-400" /> FAILED
                              </span>
                            )}

                            {run.triggerSource === 'github_commit' ? (
                              <span className="px-2 py-0.5 bg-purple-950 text-purple-300 text-[10px] font-bold rounded flex items-center gap-1">
                                <GitBranch className="w-3.5 h-3.5 text-purple-400" /> GitHub Webhook
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-[10px] font-bold rounded">
                                {run.triggerSource || 'Manual'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                            <span><Zap className="w-3 h-3 text-amber-400 inline" /> {run.summary?.totalTimeMs || 0}ms</span>
                            <span>{new Date(run.createdAt).toLocaleString()}</span>
                            <button
                              onClick={() => {
                                if (run.stepLogs) {
                                  setStepLogs(run.stepLogs);
                                  setSummary({
                                    workflowName: run.workflowName || workflow.name,
                                    startedAt: run.summary?.startedAt || run.createdAt,
                                    finishedAt: run.summary?.finishedAt || run.createdAt,
                                    totalTimeMs: run.summary?.totalTimeMs || 0,
                                    totalSteps: run.summary?.totalSteps || run.stepLogs.length,
                                    successSteps: run.summary?.successSteps || 0,
                                    failedSteps: run.summary?.failedSteps || 0,
                                    overallStatus: run.summary?.overallStatus || 'success',
                                    steps: run.stepLogs,
                                  });
                                  setIsRunHistoryOpen(false);
                                }
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded transition-all cursor-pointer"
                            >
                              Load Telemetry
                            </button>
                          </div>
                        </div>

                        {run.commitInfo?.commitMsg && (
                          <div className="text-[11px] text-neutral-300 flex items-center gap-2 pt-1 border-t border-neutral-800/60">
                            <GitCommit className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="truncate">&quot;{run.commitInfo.commitMsg}&quot;</span>
                            {run.commitInfo?.author && (
                              <span className="text-neutral-500 text-[10px]">by {run.commitInfo.author}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

