'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Edit2, Trash2, ExternalLink, User, X, Check, Activity, Globe, Lock, Search } from 'lucide-react';
import { fetchAdminStatusPages, updateAdminStatusPage, deleteAdminStatusPage, AdminStatusPageRecord } from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

export default function AdminStatusPagesManagementPage() {
  const [pages, setPages] = useState<AdminStatusPageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPage, setEditingPage] = useState<AdminStatusPageRecord | null>(null);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminStatusPages();
      setPages(res.statusPages || []);
    } catch (err) {
      console.error('Failed to load status pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredPages = pages.filter((sp) => {
    const q = searchQuery.toLowerCase();
    const title = sp.title?.toLowerCase() || '';
    const slug = sp.slug?.toLowerCase() || '';
    const desc = sp.description?.toLowerCase() || '';
    const userEmail = sp.userId?.email?.toLowerCase() || '';
    const userName = sp.userId?.name?.toLowerCase() || '';
    return title.includes(q) || slug.includes(q) || desc.includes(q) || userEmail.includes(q) || userName.includes(q);
  });

  const handleEditClick = (sp: AdminStatusPageRecord) => {
    setEditingPage(sp);
    setEditTitle(sp.title || '');
    setEditSlug(sp.slug || '');
    setEditDesc(sp.description || '');
    setEditIsPublic(sp.isPublic !== false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    setIsSaving(true);
    try {
      await updateAdminStatusPage(editingPage._id, {
        title: editTitle,
        slug: editSlug,
        description: editDesc,
        isPublic: editIsPublic,
      });
      setEditingPage(null);
      loadData();
    } catch (err) {
      console.error('Failed to update status page:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this status page?')) return;
    try {
      await deleteAdminStatusPage(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete status page:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10 md:pl-64">
      <AdminNavbar onRefresh={loadData} isRefreshing={loading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layout className="w-5 h-5 text-neutral-400" /> Status Pages Management ({pages.length})
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">Manage published status pages, custom slugs, and visibility settings</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, slug, owner email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none border-none"
            />
          </div>
        </div>

        {loading && pages.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-neutral-950 rounded-2xl">
            <Activity className="w-4 h-4 animate-spin text-rose-400" /> Loading Status Pages...
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl">
            No status pages match your search query
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPages.map((sp) => (
              <motion.div
                key={sp._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-4 shadow-md transition-all flex flex-col justify-between border-none"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{sp.title}</h3>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md flex items-center gap-1 ${
                            sp.isPublic ? 'bg-emerald-950 text-emerald-400' : 'bg-neutral-900 text-neutral-400'
                          }`}
                        >
                          {sp.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          {sp.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>

                      <a
                        href={`http://localhost:3000/status/${sp.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-rose-300 hover:underline flex items-center gap-1"
                      >
                        /status/{sp.slug} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(sp)}
                        className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                        title="Edit Status Page"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sp._id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                        title="Delete Status Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {sp.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{sp.description}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-900 text-xs text-neutral-500 flex justify-between">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {sp.userId?.email || 'System'}
                  </span>
                  <span className="font-mono text-[11px]">
                    {sp.endpointIds ? sp.endpointIds.length : 0} Linked Services
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* EDIT STATUS PAGE MODAL */}
        <AnimatePresence>
          {editingPage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border-none"
              >
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <h3 className="text-sm font-bold text-white">Edit Status Page</h3>
                  <button onClick={() => setEditingPage(null)} className="text-neutral-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Custom Slug</label>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl">
                    <span className="text-xs text-neutral-300 font-medium">Public Status Page</span>
                    <input
                      type="checkbox"
                      checked={editIsPublic}
                      onChange={(e) => setEditIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded bg-neutral-800 border-none cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPage(null)}
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
