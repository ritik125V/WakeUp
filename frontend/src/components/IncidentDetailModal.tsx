'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Clock, CheckCircle2, Server, Code2 } from 'lucide-react';
import { IncidentData } from '@/lib/api';

interface IncidentDetailModalProps {
  incident: IncidentData | null;
  onClose: () => void;
}

export function IncidentDetailModal({ incident, onClose }: IncidentDetailModalProps) {
  if (!incident) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans touch-manipulation">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-xl p-4 sm:p-6 bg-neutral-950 border-none rounded-2xl space-y-5 relative text-neutral-100 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl border-none bg-transparent cursor-pointer touch-press"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 border-b border-neutral-900 pb-3">
            <div className={`p-2.5 rounded-xl border-none ${incident.resolved ? 'bg-amber-950/80 text-amber-300' : 'bg-rose-950/80 text-rose-300'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase px-2.5 py-0.5 bg-neutral-900 text-neutral-200 rounded-md border-none">
                  {incident.projectName}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border-none ${incident.resolved ? 'bg-amber-950/80 text-amber-300' : 'bg-rose-950/80 text-rose-300'}`}>
                  {incident.resolved ? 'RESOLVED INCIDENT' : 'ACTIVE OUTAGE'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white uppercase truncate">{incident.errorMessage}</h2>
              <p className="text-xs text-neutral-400 font-mono truncate">{incident.url}</p>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1 border-none">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-neutral-400" /> Status Code
              </span>
              <p className="text-xs font-bold text-rose-400">
                {incident.statusCode ? `HTTP ${incident.statusCode}` : '0 (Timeout / Network Error)'}
              </p>
            </div>

            <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1 border-none">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" /> Latency
              </span>
              <p className="text-xs font-bold text-neutral-200">
                {incident.responseTimeMs ? `${incident.responseTimeMs}ms` : 'N/A'}
              </p>
            </div>

            <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1 col-span-2 sm:col-span-1 border-none">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" /> Duration
              </span>
              <p className="text-xs font-bold text-amber-300">
                {incident.durationSeconds ? `${Math.round(incident.durationSeconds / 60)} min` : 'Ongoing'}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-3.5 bg-black rounded-xl space-y-1.5 text-xs text-neutral-400 font-sans border-none">
            <div className="flex justify-between">
              <span>Started:</span>
              <span className="text-neutral-200 font-medium">{new Date(incident.startedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Seen:</span>
              <span className="text-neutral-200 font-medium">{new Date(incident.lastSeenAt).toLocaleString()}</span>
            </div>
            {incident.resolvedAt && (
              <div className="flex justify-between text-amber-300 font-semibold">
                <span>Resolved:</span>
                <span>{new Date(incident.resolvedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Response Snippet Log */}
          {incident.responseSnippet && (
            <div className="space-y-1.5">
              <span className="text-xs text-neutral-300 uppercase font-semibold flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-neutral-400" /> Response Body Snippet
              </span>
              <pre className="p-3.5 bg-black rounded-xl text-xs text-neutral-300 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono border-none">
                {incident.responseSnippet}
              </pre>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
