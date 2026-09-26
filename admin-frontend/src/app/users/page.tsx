'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Edit2, Trash2, Mail, Calendar, ShieldCheck, Check, X, Activity } from 'lucide-react';
import { fetchAdminUsers, updateAdminUser, deleteAdminUser, AdminUserRecord } from '@/lib/api';
import { AdminNavbar } from '@/components/AdminNavbar';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Realtime polling sync every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEditClick = (u: AdminUserRecord) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateAdminUser(editingUser._id, { name: editName, email: editEmail });
      setEditingUser(null);
      loadData();
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user and all associated endpoints & status pages?')) return;
    try {
      await deleteAdminUser(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-sans pb-10 md:pl-64">
      <AdminNavbar onRefresh={loadData} isRefreshing={loading} isLive={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-neutral-400" /> Users Management ({users.length})
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">Manage registered accounts and their associated monitoring resources</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none border-none"
            />
          </div>
        </div>

        {loading && users.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 bg-neutral-950 rounded-2xl">
            <Activity className="w-4 h-4 animate-spin text-rose-400" /> Loading Users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl">
            No users match your query
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => (
              <motion.div
                key={u._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-4 shadow-md transition-all flex flex-col justify-between border-none"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-900 text-rose-400 rounded-xl flex items-center justify-center font-bold text-sm">
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{u.name || 'Unnamed User'}</h3>
                        <span className="text-xs font-mono text-neutral-400 block">{u.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 rounded-lg border-none cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <Calendar className="w-3 h-3" />
                    <span>Registered: {new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-900 text-center text-xs">
                  <div className="p-2 bg-neutral-900/50 rounded-xl">
                    <span className="text-neutral-500 text-[10px] block">Monitored</span>
                    <span className="font-bold text-white">{u.endpointsCount}</span>
                  </div>
                  <div className="p-2 bg-neutral-900/50 rounded-xl">
                    <span className="text-neutral-500 text-[10px] block">Status Pages</span>
                    <span className="font-bold text-white">{u.statusPagesCount}</span>
                  </div>
                  <div className="p-2 bg-neutral-900/50 rounded-xl">
                    <span className="text-neutral-500 text-[10px] block">Workflows</span>
                    <span className="font-bold text-white">{u.workflowsCount}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* EDIT USER MODAL */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border-none"
              >
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <h3 className="text-sm font-bold text-white">Edit User Profile</h3>
                  <button onClick={() => setEditingUser(null)} className="text-neutral-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none border-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
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
