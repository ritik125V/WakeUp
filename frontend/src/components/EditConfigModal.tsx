'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Save, Clock } from 'lucide-react';
import { apiClient, EndpointData } from '@/lib/api';

interface EditConfigModalProps {
  isOpen: boolean;
  endpoint: EndpointData | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function EditConfigModal({ isOpen, endpoint, onClose, onSaveSuccess }: EditConfigModalProps) {
  const [url, setUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [checkInterval, setCheckInterval] = useState<number>(5);
  const [expectedStatus, setExpectedStatus] = useState<number>(200);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (endpoint) {
      setUrl(endpoint.url);
      setProjectName(endpoint.projectName);
      setCheckInterval(endpoint.checkIntervalMinutes);
      setExpectedStatus(endpoint.expectedStatusCode || 200);
    }
  }, [endpoint]);

  if (!isOpen || !endpoint) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiClient.put(`/endpoints/${endpoint._id}`, {
        url,
        projectName,
        checkIntervalMinutes: checkInterval,
        expectedStatusCode: expectedStatus,
      });

      onSaveSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update endpoint configuration');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-lg p-6 bg-neutral-950 border-none rounded-2xl space-y-5 relative text-neutral-100 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 border-b border-neutral-900 pb-3.5">
            <div className="w-9 h-9 bg-rose-950/60 text-rose-400 rounded-xl flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">EDIT ENDPOINT CONFIGURATION</h2>
              <p className="text-[11px] text-neutral-400">Modify URL, check frequency, or expected HTTP status code</p>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-950/60 text-rose-300 rounded-xl font-bold border-none">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 font-bold uppercase">ENDPOINT URL *</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-black border-none rounded-xl text-xs font-mono text-neutral-100 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 font-bold uppercase">PROJECT / GROUP NAME *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-black border-none rounded-xl text-xs font-mono text-neutral-100 outline-none uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-400" /> CHECK FREQUENCY
                </label>
                <select
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-black border-none rounded-xl text-xs font-mono text-neutral-100 outline-none cursor-pointer"
                >
                  <option value={5}>Every 5 Minutes</option>
                  <option value={10}>Every 10 Minutes</option>
                  <option value={15}>Every 15 Minutes</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 font-bold uppercase">EXPECTED HTTP CODE</label>
                <input
                  type="number"
                  placeholder="200"
                  value={expectedStatus}
                  onChange={(e) => setExpectedStatus(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-black border-none rounded-xl text-xs font-mono text-neutral-100 outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-900">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 border-none cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
