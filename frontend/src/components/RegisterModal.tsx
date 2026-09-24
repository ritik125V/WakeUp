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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-lg p-6 bg-neutral-950 border-none rounded-lg space-y-5 relative text-neutral-100 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-rose-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 border-none pb-2">
            <div className="p-2.5 bg-rose-950/40 text-rose-300 rounded-md border-none">
              <Globe className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">REGISTER BACKEND ENDPOINT</h2>
              <p className="text-[11px] text-neutral-400">Add URL for continuous automated monitoring</p>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs bg-rose-950/40 text-rose-300 rounded-md border-none">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase">
                ENDPOINT URL <span className="text-rose-300">*</span>
              </label>
              <input
                type="text"
                placeholder="https://api.mybackend.com/health"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-black border-none focus:ring-1 focus:ring-rose-300 rounded-md text-neutral-100 text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-300 uppercase">PROJECT / GROUP NAME</label>
                {extractedName && !customName && (
                  <span className="text-[10px] text-rose-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-rose-300" /> AUTO: {extractedName}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder={extractedName ? `DEFAULT: ${extractedName}` : 'e.g. PAYMENT_SERVICE'}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-2 bg-black border-none focus:ring-1 focus:ring-rose-300 rounded-md text-neutral-100 text-xs font-mono outline-none uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-300 uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-300" /> CHECK FREQUENCY
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((interval) => (
                  <button
                    type="button"
                    key={interval}
                    onClick={() => setCheckInterval(interval)}
                    className={`py-2 px-3 text-xs font-mono uppercase transition-all flex items-center justify-center gap-1 rounded-md border-none ${
                      checkInterval === interval
                        ? 'bg-rose-950/80 text-rose-300 font-bold'
                        : 'bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    {checkInterval === interval && <Check className="w-3 h-3 text-rose-300" />}
                    EVERY {interval}M
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !url}
                className="w-full py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 rounded-md border-none disabled:opacity-50"
              >
                {loading ? (
                  <span className="text-xs">SCHEDULING BATCH...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-rose-300" /> START MONITORING
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
