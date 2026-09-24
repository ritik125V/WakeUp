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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-xl p-6 bg-neutral-950 border border-neutral-800 rounded-none space-y-6 relative text-neutral-100 font-mono"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-red-500 rounded-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 border-b border-neutral-900 pb-4">
            <div className={`p-2.5 rounded-none border ${incident.resolved ? 'bg-amber-950/60 border-amber-800/60 text-amber-400' : 'bg-red-950/60 border-red-800/60 text-red-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-red-400 rounded-none">
                  {incident.projectName}
                </span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border rounded-none ${incident.resolved ? 'bg-amber-950/60 border-amber-800 text-amber-400' : 'bg-red-950/60 border-red-800 text-red-500'}`}>
                  {incident.resolved ? 'RESOLVED INCIDENT' : 'ACTIVE OUTAGE'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1 uppercase">{incident.errorMessage}</h2>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{incident.url}</p>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-black border border-neutral-800 rounded-none space-y-1">
              <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-red-500" /> STATUS CODE
              </span>
              <p className="text-xs font-bold text-red-400">
                {incident.statusCode ? `HTTP ${incident.statusCode}` : '0 (TIMEOUT / NET ERROR)'}
              </p>
            </div>

            <div className="p-3 bg-black border border-neutral-800 rounded-none space-y-1">
              <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-red-500" /> LATENCY
              </span>
              <p className="text-xs font-bold text-neutral-200">
                {incident.responseTimeMs ? `${incident.responseTimeMs}MS` : 'N/A'}
              </p>
            </div>

            <div className="p-3 bg-black border border-neutral-800 rounded-none space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500" /> DURATION
              </span>
              <p className="text-xs font-bold text-red-400">
                {incident.durationSeconds ? `${Math.round(incident.durationSeconds / 60)} MIN` : 'ONGOING'}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="p-3 bg-black border border-neutral-800 rounded-none space-y-1 text-xs text-neutral-400 uppercase">
            <div className="flex justify-between">
              <span>STARTED:</span>
              <span className="text-neutral-200">{new Date(incident.startedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>LAST SEEN:</span>
              <span className="text-neutral-200">{new Date(incident.lastSeenAt).toLocaleString()}</span>
            </div>
            {incident.resolvedAt && (
              <div className="flex justify-between text-amber-400">
                <span>RESOLVED:</span>
                <span>{new Date(incident.resolvedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Response Snippet Log */}
          {incident.responseSnippet && (
            <div className="space-y-1">
              <span className="text-xs text-neutral-300 uppercase flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-red-500" /> RESPONSE BODY SNIPPET
              </span>
              <pre className="p-3 bg-black border border-neutral-800 rounded-none text-xs text-neutral-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                {incident.responseSnippet}
              </pre>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
