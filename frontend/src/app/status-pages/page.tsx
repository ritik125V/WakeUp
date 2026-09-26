'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  ExternalLink,
  SlidersHorizontal,
  Trash2,
  Copy,
  Check,
  Activity,
  Layout,
} from 'lucide-react';
import { fetchUserStatusPages, deleteStatusPage, StatusPageRecord } from '@/lib/api';
import { StatusPagesSkeleton } from '@/components/Skeleton';

export default function StatusPagesManagementPage() {
  const router = useRouter();
  const [statusPages, setStatusPages] = useState<StatusPageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchUserStatusPages();
      setStatusPages(res.statusPages || []);
    } catch (err) {
      console.error('Failed to fetch status pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wakeup_auth_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this status page?')) return;
    try {
      await deleteStatusPage(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete status page:', err);
    }
  };

  const handleCopyLink = (slug: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/status/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 px-3.5 sm:px-6 py-4 sm:py-8 font-sans touch-manipulation">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Sleek Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Status Pages</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Create and publish status pages for your services</p>
          </div>

          <button
            onClick={() => router.push('/status-pages/builder')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-white font-semibold text-xs rounded-xl transition-all border-none cursor-pointer self-start sm:self-auto shadow-md touch-press"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Create Status Page</span>
          </button>
        </div>

        {/* Status Pages List Grid */}
        {loading ? (
          <StatusPagesSkeleton />
        ) : statusPages.length === 0 ? (
          <div className="p-10 sm:p-16 bg-neutral-950 rounded-2xl text-center space-y-3 border-none">
            <Layout className="w-8 h-8 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No status pages yet</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Build your first custom public status page to display uptime and service health.
            </p>
            <button
              onClick={() => router.push('/status-pages/builder')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-white text-xs font-semibold rounded-xl border-none transition-colors shadow-md touch-press"
            >
              <Plus className="w-4 h-4 text-white" /> Create Status Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {statusPages.map((sp) => {
              const cust = sp.customization || {};
              return (
                <motion.div
                  key={sp._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl space-y-4 border-none shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{cust.logoEmoji || '⚡'}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-white group-hover:text-rose-300 transition-colors">
                            {sp.title}
                          </h3>
                          <a
                            href={`/status/${sp.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-rose-300/90 hover:text-rose-300 hover:underline font-mono mt-0.5"
                          >
                            /status/{sp.slug} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(sp._id, e)}
                        className="p-1 text-neutral-600 hover:text-rose-400 hover:bg-neutral-900 rounded-md transition-colors opacity-0 group-hover:opacity-100 border-none"
                        title="Delete Status Page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {sp.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {sp.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-900/60">
                    <span className="font-mono text-[11px]">
                      {sp.endpointIds ? sp.endpointIds.length : 0} {sp.endpointIds?.length === 1 ? 'service' : 'services'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopyLink(sp.slug, sp._id, e)}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-medium rounded-lg border-none flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy Public Link"
                      >
                        {copiedId === sp._id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-neutral-400" />
                            <span>Link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => router.push(`/status-pages/builder?id=${sp._id}`)}
                        className="px-2.5 py-1 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border-none"
                      >
                        <SlidersHorizontal className="w-3 h-3" /> Edit Studio
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
