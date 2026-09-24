'use client';

import { motion } from 'framer-motion';
import { IncidentData } from '@/lib/api';

interface IncidentTimelineProps {
  incidents: IncidentData[];
  endpointStatus: 'healthy' | 'degraded' | 'down' | 'pending';
}

export function IncidentTimeline({ incidents, endpointStatus }: IncidentTimelineProps) {
  const daysCount = 30;
  const today = new Date();

  const daySlots = Array.from({ length: daysCount }).map((_, index) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (daysCount - 1 - index));
    const dayStr = d.toISOString().split('T')[0];

    const dayIncidents = incidents.filter((inc) => {
      const incDay = new Date(inc.startedAt).toISOString().split('T')[0];
      return incDay === dayStr;
    });

    const hasActive = dayIncidents.some((inc) => !inc.resolved);
    const hasResolved = dayIncidents.length > 0 && !hasActive;

    const totalOutageSeconds = dayIncidents.reduce((acc, inc) => {
      if (inc.durationSeconds) return acc + inc.durationSeconds;
      if (inc.resolvedAt) {
        return acc + Math.max(0, (new Date(inc.resolvedAt).getTime() - new Date(inc.startedAt).getTime()) / 1000);
      }
      return acc + 300;
    }, 0);

    const totalOutageMinutes = Math.max(1, Math.round(totalOutageSeconds / 60));

    return {
      date: dayStr,
      displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      incidents: dayIncidents,
      status: hasActive ? 'red' : hasResolved ? 'amber' : 'green',
      totalOutageMinutes,
    };
  });

  return (
    <div className="space-y-2 font-sans w-full">
      <div className="flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-1">
        <span className="font-medium text-[11px] text-neutral-500 font-mono">30-Day Uptime</span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-sm" /> Operational
          </span>
          <span className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-2.5 h-2 bg-emerald-500 rounded-sm relative flex items-center justify-center overflow-hidden">
              <span className="w-0.5 h-full bg-amber-400" />
            </span>
            Resolved
          </span>
          <span className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-2 h-2 bg-rose-500 rounded-sm" /> Outage
          </span>
        </div>
      </div>

      <div
        className="gap-0.5 sm:gap-1 p-2 bg-neutral-950 rounded-xl w-full border-none overflow-visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}
      >
        {daySlots.map((slot, i) => {
          const stripeWidthPercent = Math.max(15, Math.min(75, Math.round((slot.totalOutageMinutes / 1440) * 100)));

          return (
            <div key={i} className="group/slot relative flex flex-col items-center min-w-0">
              {slot.status === 'red' ? (
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  className="w-full h-5 sm:h-6 rounded-[2px] transition-colors bg-rose-500 cursor-pointer"
                />
              ) : slot.status === 'amber' ? (
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  className="w-full h-5 sm:h-6 rounded-[2px] transition-colors bg-emerald-500/80 hover:bg-emerald-400 relative flex items-center justify-center overflow-hidden cursor-pointer"
                >
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{
                      width: `${stripeWidthPercent}%`,
                      minWidth: '2px',
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  className="w-full h-5 sm:h-6 rounded-[2px] transition-colors bg-emerald-500/80 hover:bg-emerald-400 cursor-pointer"
                />
              )}

              {/* Single Slot Hover Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover/slot:flex flex-col bg-neutral-900 text-white text-xs font-sans p-2 rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none left-1/2 -translate-x-1/2 border-none">
                <span className="font-semibold text-neutral-300 text-[11px] mb-0.5">
                  {slot.displayDate}
                </span>
                {slot.incidents.length === 0 ? (
                  <span className="text-emerald-400 font-medium text-[11px]">100% Operational</span>
                ) : (
                  <div className="space-y-0.5">
                    {slot.incidents.map((inc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px]">
                        <span className={inc.resolved ? 'text-amber-400 font-medium' : 'text-rose-400 font-medium'}>
                          {inc.resolved
                            ? `${inc.durationSeconds ? Math.round(inc.durationSeconds / 60) : slot.totalOutageMinutes}m Outage (Resolved)`
                            : 'Active Outage'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
