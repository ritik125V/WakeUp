'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Globe, Sparkles, Clock, Check } from 'lucide-react';
import { registerEndpoint } from '@/lib/api';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterModal({ isOpen, onClose, onSuccess }: RegisterModalProps) {
  const [url, setUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [checkInterval, setCheckInterval] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractedName = (() => {
    if (!url) return '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const host = parsed.hostname.replace(/^www\./, '');
      const parts = host.split('.');
      return parts.length >= 2 ? parts[parts.length - 2].toUpperCase() : host.toUpperCase();
    } catch {
      return '';
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }

    setLoading(true);
    setError(null);

    try {
      await registerEndpoint({
        url: fullUrl,
        name: customName.trim() || undefined,
        checkIntervalMinutes: checkInterval,
      });

      setUrl('');
      setCustomName('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to register endpoint');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans touch-manipulation">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-lg p-4 sm:p-6 bg-neutral-950 border-none rounded-2xl space-y-4 relative text-neutral-100 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer touch-press"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>

          <div className="flex items-center gap-3 border-none pb-1">
            <div className="p-2.5 bg-neutral-900 text-rose-400 rounded-xl border-none">
              <Globe className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Register Backend Endpoint</h2>
              <p className="text-xs text-neutral-400">Add URL for continuous automated monitoring</p>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-950/60 text-rose-300 rounded-xl border-none font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Endpoint URL <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="https://api.mybackend.com/health"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-neutral-900 border-none focus:ring-1 focus:ring-neutral-600 rounded-xl text-neutral-100 text-xs font-sans outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Project / Group Name</label>
                {extractedName && !customName && (
                  <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-rose-400" /> Auto: {extractedName}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder={extractedName ? `Default: ${extractedName}` : 'e.g. PAYMENT_SERVICE'}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-neutral-900 border-none focus:ring-1 focus:ring-neutral-600 rounded-xl text-neutral-100 text-xs font-sans outline-none uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" /> Check Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((interval) => (
                  <button
                    type="button"
                    key={interval}
                    onClick={() => setCheckInterval(interval)}
                    className={`py-2.5 px-3 min-h-[44px] text-xs font-semibold uppercase transition-all flex items-center justify-center gap-1 rounded-xl border-none cursor-pointer touch-press ${
                      checkInterval === interval
                        ? 'bg-neutral-800 text-white font-bold'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {checkInterval === interval && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    Every {interval}M
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !url}
                className="w-full py-3 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-white text-xs font-semibold uppercase transition-all flex items-center justify-center gap-2 rounded-xl border-none disabled:opacity-50 cursor-pointer shadow-md touch-press"
              >
                {loading ? (
                  <span className="text-xs">Scheduling Batch...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white" /> Start Monitoring
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
