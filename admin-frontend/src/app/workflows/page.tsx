'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Edit2,
  Trash2,
  Calendar,
  User,
  X,
  Check,
  Activity,
  Search,
  GitBranch,
  GitCommit,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ExternalLink,
  Eye,
  RefreshCw,
  Terminal,
  FileText,
  Globe,
} from 'lucide-react';
import {
  fetchAdminWorkflows,
  updateAdminWorkflow,
  deleteAdminWorkflow,
  fetchAdminWorkflowRuns,
  deleteAdminWorkflowRun,
  bulkDeleteAdminWorkflowRuns,
  AdminWorkflowRecord,
  AdminWorkflowRunRecord,
} from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

function WorkflowsPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'runs' ? 'runs' : 'workflows';
  const [activeTab, setActiveTab] = useState<'workflows' | 'runs'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'runs') {
      setActiveTab('runs');
    } else if (tabParam === 'workflows') {
      setActiveTab('workflows');
    }
  }, [searchParams]);
  const [workflows, setWorkflows] = useState<AdminWorkflowRecord[]>([]);
  const [runs, setRuns] = useState<AdminWorkflowRunRecord[]>([]);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  
  const [editingWf, setEditingWf] = useState<AdminWorkflowRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [inspectRun, setInspectRun] = useState<AdminWorkflowRunRecord | null>(null);

  const handleDeleteRun = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this workflow commit audit log?')) return;
    try {
      await deleteAdminWorkflowRun(id);
      setSelectedRunIds((prev) => prev.filter((item) => item !== id));
      loadData();
    } catch (err) {
      console.error('Failed to delete workflow run:', err);
    }
  };

  const handleBulkDeleteRuns = async () => {
    if (selectedRunIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRunIds.length} selected commit audit logs?`)) return;
    try {
      await bulkDeleteAdminWorkflowRuns(selectedRunIds);
      setSelectedRunIds([]);
      loadData();
    } catch (err) {
      console.error('Failed to bulk delete workflow runs:', err);
    }
  };

  const handleSelectRun = (id: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRuns = () => {
    if (selectedRunIds.length === filteredRuns.length) {
      setSelectedRunIds([]);
    } else {
      setSelectedRunIds(filteredRuns.map((r) => r._id));
    }
  };


  const loadData = async () => {
    setLoading(true);
    try {
      const [wfRes, runsRes] = await Promise.all([
        fetchAdminWorkflows(),
        fetchAdminWorkflowRuns({ status: statusFilter !== 'all' ? statusFilter : undefined, search: searchQuery }),
      ]);
      setWorkflows(wfRes.workflows || []);
      setRuns(runsRes.runs || []);
    } catch (err) {
      console.error('Failed to load admin workflow data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const filteredWorkflows = workflows.filter((wf) => {
    const q = searchQuery.toLowerCase();
    const name = wf.name?.toLowerCase() || '';
    const desc = wf.description?.toLowerCase() || '';
    const userEmail = wf.userId?.email?.toLowerCase() || '';
    const userName = wf.userId?.name?.toLowerCase() || '';
    return name.includes(q) || desc.includes(q) || userEmail.includes(q) || userName.includes(q);
  });

  const filteredRuns = runs.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = r.workflowName?.toLowerCase() || '';
    const repo = r.githubRepo?.toLowerCase() || '';
    const author = r.commitInfo?.author?.toLowerCase() || '';
    const msg = r.commitInfo?.commitMsg?.toLowerCase() || '';
    const email = r.owner?.email?.toLowerCase() || '';
    return name.includes(q) || repo.includes(q) || author.includes(q) || msg.includes(q) || email.includes(q);
  });

  const handleEditClick = (wf: AdminWorkflowRecord) => {
    setEditingWf(wf);
    setEditName(wf.name || '');
    setEditDesc(wf.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWf) return;
    setIsSaving(true);
    try {
      await updateAdminWorkflow(editingWf._id, { name: editName, description: editDesc });
      setEditingWf(null);
      loadData();
    } catch (err) {
      console.error('Failed to update workflow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this multi-step workflow?')) return;
    try {
      await deleteAdminWorkflow(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10 md:pl-64">
      <AdminNavbar onRefresh={loadData} isRefreshing={loading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6 py-6">
        {/* Header Title & Main View Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-neutral-400" /> Workflows & GitHub Execution Audit
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Monitor multi-step API journeys, owner details, and GitHub commit execution runs
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'workflows'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              📦 Workflows ({workflows.length})
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'runs'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Commit Audit Logs ({runs.length})</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'workflows' ? 'Search workflows, owners...' : 'Search repo, commit msg, author, owner email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none border border-white/10 focus:border-rose-500/50"
            />
          </div>

          {activeTab === 'runs' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-neutral-800 text-white' : 'bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter('success')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                Passed Only
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'failed' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                Failed Only
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: REGISTERED WORKFLOWS LIST */}
        {activeTab === 'workflows' && (
          <div>
            {loading && workflows.length === 0 ? (
              <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-neutral-950 rounded-2xl">
                <Activity className="w-4 h-4 animate-spin text-rose-400" /> Loading Registered Workflows...
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="p-16 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl">
                No workflows match your search query
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWorkflows.map((wf) => (
                  <motion.div
                    key={wf._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-4 shadow-md transition-all flex flex-col justify-between border border-white/5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-white">{wf.name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 text-amber-300 rounded-md inline-block mt-1">
                            {wf.steps ? wf.steps.length : 0} API Step(s)
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditClick(wf)}
                            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                            title="Edit Workflow"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(wf._id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                            title="Delete Workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {wf.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{wf.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-900 text-xs text-neutral-500 flex justify-between">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-rose-400" /> {wf.userId?.email || 'System Owner'}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-neutral-400" /> {new Date(wf.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GITHUB COMMIT EXECUTION AUDIT LOGS */}
        {activeTab === 'runs' && (
          <div className="space-y-4">
            {filteredRuns.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl font-sans text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRunIds.length > 0 && selectedRunIds.length === filteredRuns.length}
                    onChange={handleSelectAllRuns}
                    className="w-4 h-4 rounded border-none bg-neutral-900 accent-rose-500 cursor-pointer"
                  />
                  <span className="text-neutral-400 font-medium">
                    {selectedRunIds.length > 0 ? `${selectedRunIds.length} Selected` : 'Select All Audit Logs'}
                  </span>
                </div>

                {selectedRunIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteRuns}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedRunIds.length})</span>
                  </button>
                )}
              </div>
            )}

            {loading && runs.length === 0 ? (
              <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-neutral-950 rounded-2xl border border-white/5">
                <Activity className="w-4 h-4 animate-spin text-rose-400" /> Fetching GitHub Commit Run Audits...
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="p-16 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl border border-white/5">
                No execution run audit logs recorded yet. Connect a workflow to a GitHub repo to track automated commit triggers!
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRuns.map((run) => {
                  const isPassed = run.summary?.overallStatus === 'success' || run.summary?.overallStatus === 'PASSED';
                  const isUnbound = run.summary?.overallStatus === 'UNBOUND_WEBHOOK';

                  return (
                    <div
                      key={run._id}
                      className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-4 transition-all shadow-lg border-none"
                    >
                      {/* Row 1: Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
                        <div className="flex items-center gap-3 flex-wrap min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedRunIds.includes(run._id)}
                            onChange={() => handleSelectRun(run._id)}
                            className="w-4 h-4 rounded border-none bg-neutral-900 accent-rose-500 cursor-pointer shrink-0"
                          />

                          {isPassed ? (
                            <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASSED
                            </span>
                          ) : isUnbound ? (
                            <span className="px-2.5 py-1 bg-neutral-900 text-neutral-400 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0">
                              <Activity className="w-3.5 h-3.5 text-neutral-400" /> UNBOUND WEBHOOK
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-950/80 text-rose-400 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" /> FAILED
                            </span>
                          )}

                          <h3 className="text-sm font-bold text-white truncate max-w-md">{run.workflowName}</h3>

                          <span className="px-2.5 py-1 bg-neutral-900 text-neutral-300 text-[11px] font-medium rounded-md flex items-center gap-1.5 shrink-0">
                            {run.triggerSource === 'github_commit' || run.triggerSource === 'unbound_webhook' ? (
                              <>
                                <GitBranch className="w-3 h-3 text-rose-300" />
                                <span>GitHub Push</span>
                              </>
                            ) : run.triggerSource === 'browser_direct' ? (
                              <>
                                <Globe className="w-3 h-3 text-emerald-400" />
                                <span>Browser Direct</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span>{run.triggerSource || 'Manual'}</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          <button
                            onClick={() => setInspectRun(run)}
                            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-200 hover:text-white font-bold text-xs rounded-xl transition-colors cursor-pointer border-none flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-rose-300" />
                            <span>Inspect Step Logs</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteRun(run._id, e)}
                            className="p-2 bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer border-none flex items-center justify-center"
                            title="Delete Commit Audit Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Row 2: 4-Column Structured Key Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {/* Box 1: Repository & Branch */}
                        <div className="p-3 bg-neutral-900/50 rounded-xl space-y-1">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <GitBranch className="w-3 h-3 text-rose-300" /> Repository & Branch
                          </div>
                          <div className="text-xs text-white font-bold truncate">
                            {run.githubRepo ? `${run.githubRepo}:${run.githubBranch || 'main'}` : 'Unbound Repository'}
                          </div>
                          {run.commitInfo?.commitMsg ? (
                            <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1">
                              <GitCommit className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span>&quot;{run.commitInfo.commitMsg}&quot;</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-neutral-400">Direct manual execution</div>
                          )}
                        </div>

                        {/* Box 2: Owner / User Info */}
                        <div className="p-3 bg-neutral-900/50 rounded-xl space-y-1">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <User className="w-3 h-3 text-rose-300" /> User / Owner
                          </div>
                          <div className="text-xs text-white font-bold truncate">
                            {run.owner?.email || 'System Owner'}
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            {run.owner?.name || 'Workflow Owner'}
                          </div>
                        </div>

                        {/* Box 3: Step Execution Breakdown */}
                        <div className="p-3 bg-neutral-900/50 rounded-xl space-y-1">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-rose-300" /> Step Breakdown
                          </div>
                          <div className="text-xs font-bold text-emerald-400">
                            {run.summary?.successSteps || 0} / {run.summary?.totalSteps || 0} Steps Passed
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {run.summary?.failedSteps ? `${run.summary.failedSteps} failed step(s)` : '0 failed steps'}
                          </div>
                        </div>

                        {/* Box 4: Timing & Duration */}
                        <div className="p-3 bg-neutral-900/50 rounded-xl space-y-1">
                          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-300" /> Duration & Timestamp
                          </div>
                          <div className="text-xs text-white font-bold">
                            {run.summary?.totalTimeMs ? `${(run.summary.totalTimeMs / 1000).toFixed(2)}s (${run.summary.totalTimeMs}ms)` : 'N/A'}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {new Date(run.createdAt || run.summary?.startedAt || Date.now()).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* INSPECT RUN TELEMETRY MODAL */}
        <AnimatePresence>
          {inspectRun && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-3xl p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border border-white/10 max-h-[85vh] overflow-y-auto font-mono"
              >
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                      Execution Telemetry Audit Report
                    </span>
                    <h3 className="text-sm font-bold text-white">{inspectRun.workflowName}</h3>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Owner: <span className="text-white font-bold">{inspectRun.owner?.email}</span> | Trigger: <span className="text-amber-300">{inspectRun.triggerSource}</span>
                    </div>
                  </div>
                  <button onClick={() => setInspectRun(null)} className="p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-neutral-900/60 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase">Status</span>
                      <div className={`font-bold ${inspectRun.summary.overallStatus === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {inspectRun.summary.overallStatus.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase">Latency</span>
                      <div className="font-bold text-white">{inspectRun.summary.totalTimeMs} ms</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase">Steps</span>
                      <div className="font-bold text-emerald-400">
                        {inspectRun.summary.successSteps} / {inspectRun.summary.totalSteps} Passed
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase">Repository</span>
                      <div className="font-bold text-amber-300 truncate">
                        {inspectRun.githubRepo || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-rose-400" /> Step-by-Step Execution Telemetry Logs ({inspectRun.stepLogs?.length || 0})
                    </h4>

                    {(!inspectRun.stepLogs || inspectRun.stepLogs.length === 0) ? (
                      <div className="p-6 text-center text-neutral-500 text-xs bg-neutral-900/40 rounded-xl">
                        No step logs recorded for this run.
                      </div>
                    ) : (
                      inspectRun.stepLogs.map((step: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-neutral-900/80 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-white">
                              Step {step.stepIndex || idx + 1}: {step.stepName || step.name}
                            </span>
                            <span className={step.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                              {step.status?.toUpperCase()} ({step.statusCode || 'ERR'})
                            </span>
                          </div>

                          <div className="text-[11px] text-neutral-400">
                            URL: <code className="text-neutral-200">{step.method} {step.url}</code>
                          </div>

                          {step.errorMessage && (
                            <div className="p-2 bg-rose-950/40 text-rose-300 text-[11px] rounded">
                              Error: {step.errorMessage}
                            </div>
                          )}

                          {step.responseBody && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] text-neutral-500 font-bold uppercase">Response Payload Snippet</span>
                              <pre className="p-2 bg-black rounded text-[10px] text-neutral-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                {typeof step.responseBody === 'object' ? JSON.stringify(step.responseBody, null, 2) : String(step.responseBody)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* EDIT WORKFLOW MODAL */}
        <AnimatePresence>
          {editingWf && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border border-white/10"
              >
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <h3 className="text-sm font-bold text-white">Edit Workflow</h3>
                  <button onClick={() => setEditingWf(null)} className="text-neutral-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Workflow Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border border-white/10"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border border-white/10"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingWf(null)}
                      className="px-4 py-2 bg-neutral-900 text-neutral-300 text-xs font-medium rounded-xl border-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl border-none flex items-center gap-1.5"
                    >
                      {isSaving ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function AdminWorkflowsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-neutral-400 p-8">Loading Audit Control Plane...</div>}>
      <WorkflowsPageContent />
    </Suspense>
  );
}
