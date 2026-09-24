'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Search, Edit2, Trash2, Zap, Clock, CheckCircle2, AlertTriangle, X, Check, Activity } from 'lucide-react';
import { fetchAdminEndpoints, updateAdminEndpoint, deleteAdminEndpoint, triggerAdminEndpointCheck, AdminEndpointRecord } from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

export default function AdminEndpointsPage() {
  const [endpoints, setEndpoints] = useState<AdminEndpointRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEp, setEditingEp] = useState<AdminEndpointRecord | null>(null);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editMethod, setEditMethod] = useState('GET');
  const [editExpectedCode, setEditExpectedCode] = useState('200');
  const [editStatus, setEditStatus] = useState<'healthy' | 'degraded' | 'down' | 'pending'>('healthy');
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminEndpoints();
      setEndpoints(res.endpoints || []);
    } catch (err) {
      console.error('Failed to load endpoints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEditClick = (ep: AdminEndpointRecord) => {
    setEditingEp(ep);
    setEditName(ep.projectName || '');
    setEditUrl(ep.url || '');
    setEditMethod(ep.method || 'GET');
    setEditExpectedCode(String(ep.expectedStatusCode || 200));
    setEditStatus(ep.status || 'healthy');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEp) return;
    setIsSaving(true);
    try {
      await updateAdminEndpoint(editingEp._id, {
        projectName: editName,
        url: editUrl,
        method: editMethod,
        expectedStatusCode: Number(editExpectedCode),
        status: editStatus,
      });
      setEditingEp(null);
      loadData();
    } catch (err) {
      console.error('Failed to update endpoint:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitored page?')) return;
    try {
      await deleteAdminEndpoint(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  };

  const handleTriggerCheck = async (id: string) => {
    setTestingId(id);
    try {
      await triggerAdminEndpointCheck(id);
      loadData();
    } catch (err) {
      console.error('Failed to trigger health check:', err);
    } finally {
      setTestingId(null);
    }
  };

  const filteredEndpoints = endpoints.filter((e) =>
    e.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10">
      <AdminNavbar onRefresh={loadData} isRefreshing={loading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Server className="w-5 h-5 text-rose-400" /> Monitored Pages ({endpoints.length})
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">Live monitoring status, target URLs, and manual health check triggers</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by project name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none border-none"
            />
          </div>
        </div>

        {loading && endpoints.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-neutral-950 rounded-2xl">
            <Activity className="w-4 h-4 animate-spin text-rose-400" /> Loading Monitored Pages...
          </div>
        ) : filteredEndpoints.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl">
            No endpoints match your search query
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEndpoints.map((ep) => (
              <motion.div
                key={ep._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all border-none"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-neutral-900 text-neutral-300 text-[10px] font-mono font-bold rounded-md">
                      {ep.method || 'GET'}
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">{ep.projectName}</h3>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        ep.status === 'healthy'
                          ? 'bg-emerald-950 text-emerald-400'
                          : ep.status === 'down'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {ep.status}
                    </span>
                  </div>

                  <a
                    href={ep.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-neutral-400 hover:text-white truncate block max-w-xl"
                  >
                    {ep.url}
                  </a>

                  {ep.userId && (
                    <span className="text-[11px] text-neutral-500 block">Owner: {ep.userId.email} ({ep.userId.name})</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {ep.lastResponseTimeMs && (
                    <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-400" /> {ep.lastResponseTimeMs}ms
                    </span>
                  )}

                  <button
                    onClick={() => handleTriggerCheck(ep._id)}
                    disabled={testingId === ep._id}
                    className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-medium rounded-xl border-none flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 ${testingId === ep._id ? 'animate-spin text-rose-400' : ''}`} />
                    <span>Trigger Test</span>
                  </button>

                  <button
                    onClick={() => handleEditClick(ep)}
                    className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                    title="Edit Endpoint"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(ep._id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                    title="Delete Endpoint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* EDIT ENDPOINT MODAL */}
        <AnimatePresence>
          {editingEp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border-none"
              >
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <h3 className="text-sm font-bold text-white">Edit Monitored Endpoint</h3>
                  <button onClick={() => setEditingEp(null)} className="text-neutral-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Project Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Target Endpoint URL</label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">HTTP Method</label>
                      <select
                        value={editMethod}
                        onChange={(e) => setEditMethod(e.target.value)}
                        className="w-full bg-neutral-900 text-white px-3 py-2 rounded-xl text-xs outline-none border-none"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="HEAD">HEAD</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Expected Code</label>
                      <input
                        type="number"
                        value={editExpectedCode}
                        onChange={(e) => setEditExpectedCode(e.target.value)}
                        className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Override Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-neutral-900 text-white px-3 py-2 rounded-xl text-xs outline-none border-none font-mono"
                    >
                      <option value="healthy">Healthy (Operational)</option>
                      <option value="degraded">Degraded Performance</option>
                      <option value="down">Down (Outage)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingEp(null)}
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
