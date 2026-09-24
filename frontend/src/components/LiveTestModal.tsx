'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Code2, Clock, Server, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export interface LiveTestResult {
  status: number;
  statusText: string;
  responseTimeMs: number;
  headers: Record<string, string>;
  data: unknown;
  isError: boolean;
  errorMessage?: string;
  payloadSize?: number;
}

interface LiveTestModalProps {
  isOpen: boolean;
  url: string;
  result: LiveTestResult | null;
  onClose: () => void;
}

export function LiveTestModal({ isOpen, url, result, onClose }: LiveTestModalProps) {
  if (!isOpen || !result) return null;

  const jsonString = result.data
    ? typeof result.data === 'object'
      ? JSON.stringify(result.data, null, 2)
      : String(result.data)
    : '';

  const payloadSizeBytes = result.payloadSize || new Blob([jsonString]).size;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-neutral-950 border border-neutral-800 rounded-lg relative text-neutral-100 shadow-2xl"
        >
          {/* Header with Close Button */}
          <div className="p-4 border-b border-neutral-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-md border ${result.isError ? 'bg-rose-950/60 border-rose-800 text-rose-400' : 'bg-emerald-950/60 border-emerald-800 text-emerald-400'}`}>
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">LIVE BROWSER API INSPECTOR</h2>
                <p className="text-[11px] text-neutral-400 truncate max-w-md">{url}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-rose-500 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Status & Latency Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-black border border-neutral-800 rounded-md space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                  <Server className="w-3 h-3 text-rose-500" /> HTTP STATUS
                </span>
                <p className={`text-xs font-bold ${result.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {result.status ? `HTTP ${result.status}` : 'ERR'}
                </p>
              </div>

              <div className="p-3 bg-black border border-neutral-800 rounded-md space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-rose-500" /> LATENCY
                </span>
                <p className="text-xs font-bold text-neutral-200">{result.responseTimeMs}MS</p>
              </div>

              <div className="p-3 bg-black border border-neutral-800 rounded-md space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-rose-500" /> PAYLOAD SIZE
                </span>
                <p className="text-xs font-bold text-neutral-300">{payloadSizeBytes} BYTES</p>
              </div>

              <div className="p-3 bg-black border border-neutral-800 rounded-md space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-rose-500" /> STATUS TEXT
                </span>
                <p className="text-xs font-bold text-neutral-200 truncate">{result.statusText}</p>
              </div>
            </div>

            {/* Error Message if any */}
            {result.errorMessage && (
              <div className="p-3 text-xs bg-rose-950/40 border border-rose-800/80 text-rose-400 rounded-md space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase">
                  <AlertTriangle className="w-4 h-4" /> BROWSER FETCH WARNING
                </div>
                <p className="text-[11px] leading-relaxed">{result.errorMessage}</p>
              </div>
            )}

            {/* Formatted Response Body Payload */}
            {Boolean(result.data) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300 uppercase flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-rose-500" /> FULL RESPONSE BODY PAYLOAD
                  </span>
                  <span className="text-[10px] text-neutral-500">{jsonString.length} chars</span>
                </div>
                <pre className="p-3.5 bg-black border border-neutral-800 rounded-md text-xs font-mono text-neutral-200 overflow-x-auto max-h-72 whitespace-pre-wrap select-all">
                  {jsonString}
                </pre>
              </div>
            )}

            {/* Complete Response Headers */}
            {Object.keys(result.headers).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs text-neutral-300 uppercase">FULL RESPONSE HEADERS ({Object.keys(result.headers).length})</span>
                <div className="p-3 bg-black border border-neutral-800 rounded-md text-xs font-mono space-y-1.5 max-h-48 overflow-y-auto">
                  {Object.entries(result.headers).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-neutral-900 pb-1 text-neutral-400">
                      <span className="text-rose-400 font-bold">{k}:</span>
                      <span className="text-neutral-300 truncate max-w-sm">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Close Action */}
          <div className="p-3 border-t border-neutral-900 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold uppercase rounded-md border border-neutral-800"
            >
              Close Inspector
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
