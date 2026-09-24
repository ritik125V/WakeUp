'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle, CheckCircle2, Clock, Server, Code2 } from 'lucide-react';
import { IncidentData } from '@/lib/api';

interface IncidentAccordionProps {
  incidents: IncidentData[];
}

export function IncidentAccordion({ incidents }: IncidentAccordionProps) {
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);

  const toggleIncident = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenIncidentId((prev) => (prev === id ? null : id));
  };

  if (incidents.length === 0) {
    return (
      <div className="p-4 bg-black border border-neutral-850 rounded-md text-center font-mono text-xs text-neutral-500">
        No recorded outages or incidents for this endpoint.
      </div>
    );
  }

  return (
    <div className="space-y-2 font-mono">
      {incidents.map((inc) => {
        const isOpen = openIncidentId === inc._id;

        return (
          <div
            key={inc._id}
            className="border border-neutral-800/90 rounded-md overflow-hidden bg-black transition-all"
          >
            {/* Accordion Summary Row / Dropdown Trigger */}
            <div
              onClick={(e) => toggleIncident(inc._id, e)}
              className="p-3 bg-neutral-950 hover:bg-neutral-900 border-b border-neutral-900 cursor-pointer flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${inc.resolved ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`} />
                <span className="font-bold text-white truncate">{inc.errorMessage}</span>
                <span className="text-[10px] text-neutral-400 uppercase hidden sm:inline px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                  {inc.errorType}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-neutral-400 shrink-0">
                <span>{new Date(inc.startedAt).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${inc.resolved ? 'bg-amber-950/60 text-amber-400' : 'bg-rose-950/60 text-rose-400'}`}>
                  {inc.resolved ? `${Math.round(inc.durationSeconds / 60)}m Outage` : 'Active Outage'}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180 text-rose-400' : ''}`} />
              </div>
            </div>

            {/* Accordion Expandable Detailed Content */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 bg-black border-t border-neutral-900 space-y-4 text-xs text-neutral-300"
                >
                  {/* Detailed Telemetry Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-md space-y-0.5">
                      <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                        <Server className="w-3 h-3 text-rose-500" /> HTTP CODE
                      </span>
                      <p className="font-bold text-rose-400">
                        {inc.statusCode ? `HTTP ${inc.statusCode}` : '0 (Timeout / Net Error)'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-md space-y-0.5">
                      <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-rose-500" /> LATENCY
                      </span>
                      <p className="font-bold text-neutral-200">
                        {inc.responseTimeMs ? `${inc.responseTimeMs}ms` : 'N/A'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-md space-y-0.5">
                      <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-rose-500" /> OUTAGE TIME
                      </span>
                      <p className="font-bold text-rose-400">
                        {inc.durationSeconds ? `${Math.round(inc.durationSeconds / 60)} min` : 'Ongoing Outage'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded-md space-y-0.5">
                      <span className="text-[10px] text-neutral-400 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" /> ERROR CLASSIFICATION
                      </span>
                      <p className="font-bold text-indigo-300">{inc.errorType}</p>
                    </div>
                  </div>

                  {/* Timestamps Breakdown */}
                  <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-md space-y-1 text-[11px] text-neutral-400">
                    <div className="flex justify-between">
                      <span>First Encountered Outage:</span>
                      <span className="text-neutral-200">{new Date(inc.startedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Checked Failure:</span>
                      <span className="text-neutral-200">{new Date(inc.lastSeenAt).toLocaleString()}</span>
                    </div>
                    {inc.resolvedAt && (
                      <div className="flex justify-between text-amber-400 font-bold">
                        <span>Resolved Timestamp:</span>
                        <span>{new Date(inc.resolvedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Recorded Response Body Snippet */}
                  {inc.responseSnippet && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1 uppercase">
                        <Code2 className="w-3.5 h-3.5 text-rose-500" /> Recorded Error Body Snippet
                      </span>
                      <pre className="p-3 bg-neutral-950 border border-neutral-850 rounded-md text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-36 whitespace-pre-wrap select-all">
                        {inc.responseSnippet}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
