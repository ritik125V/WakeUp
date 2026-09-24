'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Trash2, Calendar, Clock, Activity, CheckSquare, Square, Check, Search } from 'lucide-react';
import {
  fetchAdminIncidents,
  resolveAdminIncident,
  deleteAdminIncident,
  bulkDeleteAdminIncidents,
  bulkResolveAdminIncidents,
  AdminIncidentRecord,
} from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<AdminIncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminIncidents();
      setIncidents(res.incidents || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredIncidents = incidents.filter((inc) => {
    const q = searchQuery.toLowerCase();
    const projectName = inc.endpointId?.projectName?.toLowerCase() || '';
    const url = inc.endpointId?.url?.toLowerCase() || '';
    const errMsg = inc.errorMessage?.toLowerCase() || '';
    const userEmail = inc.userId?.email?.toLowerCase() || '';
    const userName = inc.userId?.name?.toLowerCase() || '';
    return projectName.includes(q) || url.includes(q) || errMsg.includes(q) || userEmail.includes(q) || userName.includes(q);
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredIncidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIncidents.map((i) => i._id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected incident logs?`)) return;
    setIsBulkProcessing(true);
    try {
      await bulkDeleteAdminIncidents(selectedIds);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error('Failed to bulk delete incidents:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkResolve = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      await bulkResolveAdminIncidents(selectedIds);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error('Failed to bulk resolve incidents:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleToggleResolve = async (id: string) => {
    setActionId(id);
    try {
      await resolveAdminIncident(id);
      loadData();
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident log?')) return;
    setActionId(id);
    try {
      await deleteAdminIncident(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete incident:', err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10">
      <AdminNavbar onRefresh={loadData} isRefreshing={loading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" /> Incidents Audit Log ({incidents.length})
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">Real-time incident traces, relational context, and bulk actions</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search service, URL, message, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none border-none"
              />
            </div>

            {/* Bulk Action Controls */}
            {filteredIncidents.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-medium rounded-xl border-none flex items-center gap-1.5 cursor-pointer"
                >
                  {selectedIds.length === filteredIncidents.length ? <CheckSquare className="w-3.5 h-3.5 text-rose-400" /> : <Square className="w-3.5 h-3.5" />}
                  <span>{selectedIds.length === filteredIncidents.length ? 'Deselect All' : 'Select All'}</span>
                </button>

                {selectedIds.length > 0 && (
                  <>
                    <button
                      onClick={handleBulkResolve}
                      disabled={isBulkProcessing}
                      className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 text-xs font-medium rounded-xl border-none flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve Selected ({selectedIds.length})</span>
                    </button>

                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkProcessing}
                      className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-medium rounded-xl border-none flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedIds.length})</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {loading && incidents.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-neutral-950 rounded-2xl">
            <Activity className="w-4 h-4 animate-spin text-rose-400" /> Loading Incidents...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl">
            No incident logs match your query
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIds.includes(inc._id);

              return (
                <motion.div
                  key={inc._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-3 shadow-md transition-all border-none ${
                    isSelected ? 'ring-1 ring-rose-500/50 bg-neutral-900/90' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(inc._id)}
                        className="mt-1 w-4 h-4 rounded bg-neutral-900 border-none cursor-pointer"
                      />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-rose-300 uppercase text-xs">
                            {inc.endpointId?.projectName || 'Unassigned Service'}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                              inc.resolved ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-300 animate-pulse'
                            }`}
                          >
                            {inc.resolved ? 'RESOLVED' : 'ACTIVE OUTAGE'}
                          </span>
                        </div>

                        <p className="text-xs font-mono text-white">{inc.errorMessage}</p>
                        {inc.endpointId?.url && (
                          <span className="text-[11px] font-mono text-neutral-500 block">Target: {inc.endpointId.url}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleResolve(inc._id)}
                        disabled={actionId === inc._id}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl border-none flex items-center gap-1.5 transition-colors cursor-pointer ${
                          inc.resolved
                            ? 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300'
                            : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400'
                        }`}
                      >
                        {actionId === inc._id ? (
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{inc.resolved ? 'Mark Active' : 'Mark Resolved'}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(inc._id)}
                        disabled={actionId === inc._id}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                        title="Delete Incident"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-900 text-[11px] font-mono text-neutral-500 flex flex-wrap justify-between gap-2">
                    <span>Started: {new Date(inc.startedAt).toLocaleString()}</span>
                    {inc.resolvedAt && <span>Resolved: {new Date(inc.resolvedAt).toLocaleString()}</span>}
                    {inc.durationSeconds && <span>Duration: {Math.round(inc.durationSeconds / 60)}m</span>}
                    {inc.userId && <span className="text-rose-300 font-bold">Owner: {inc.userId.email} ({inc.userId.name})</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
