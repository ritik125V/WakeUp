'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Edit2, Trash2, Calendar, User, X, Check, Activity, Search } from 'lucide-react';
import { fetchAdminWorkflows, updateAdminWorkflow, deleteAdminWorkflow, AdminWorkflowRecord } from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<AdminWorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingWf, setEditingWf] = useState<AdminWorkflowRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminWorkflows();
      setWorkflows(res.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredWorkflows = workflows.filter((wf) => {
    const q = searchQuery.toLowerCase();
    const name = wf.name?.toLowerCase() || '';
    const desc = wf.description?.toLowerCase() || '';
    const userEmail = wf.userId?.email?.toLowerCase() || '';
    const userName = wf.userId?.name?.toLowerCase() || '';
    return name.includes(q) || desc.includes(q) || userEmail.includes(q) || userName.includes(q);
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
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10">
      <AdminNavbar onRefresh={loadData} isRefreshing={loading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" /> Workflows Management ({workflows.length})
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">Manage multi-step API journeys and step sequences</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, description, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none border-none"
            />
          </div>
        </div>

        {loading && workflows.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-neutral-950 rounded-2xl">
            <Activity className="w-4 h-4 animate-spin text-rose-400" /> Loading Workflows...
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
                className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-4 shadow-md transition-all flex flex-col justify-between border-none"
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
                    <User className="w-3 h-3" /> {wf.userId?.email || 'System'}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" /> {new Date(wf.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* EDIT WORKFLOW MODAL */}
        <AnimatePresence>
          {editingWf && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border-none"
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
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
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
