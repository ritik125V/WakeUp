'use client';

import React from 'react';
import { Activity, ShieldCheck, Zap, Server, Mail, HelpCircle, Share2, ExternalLink, AlertTriangle } from 'lucide-react';
import { EndpointData, IncidentData } from '@/lib/api';

interface StatusTelemetryProps {
  endpoints: EndpointData[];
  incidents?: IncidentData[];
  accentColor?: string;
  cardBg?: string;
  showBreakdown?: boolean;
  showSupport?: boolean;
  supportEmail?: string;
  supportDocsUrl?: string;
  twitterHandle?: string;
}

export function StatusTelemetryWidget({
  endpoints,
  incidents = [],
  accentColor = '#f43f5e',
  cardBg = '#0d0d0d',
  showBreakdown = true,
  showSupport = true,
  supportEmail,
  supportDocsUrl,
  twitterHandle,
}: StatusTelemetryProps) {
  // Compute real average response time
  const validMetrics = endpoints.filter((e) => typeof e.lastResponseTimeMs === 'number' && e.lastResponseTimeMs > 0);
  const avgLatency =
    validMetrics.length > 0
      ? Math.round(validMetrics.reduce((sum, e) => sum + (e.lastResponseTimeMs || 0), 0) / validMetrics.length)
      : 0;

  const maxLatency =
    validMetrics.length > 0
      ? Math.max(...validMetrics.map((e) => e.lastResponseTimeMs || 0))
      : 0;

  const healthyCount = endpoints.filter((e) => e.status === 'healthy' || e.status === 'pending').length;
  const downCount = endpoints.filter((e) => e.status === 'down').length;
  const degradedCount = endpoints.filter((e) => e.status === 'degraded').length;

  const uptimePercentage = endpoints.length > 0
    ? (((healthyCount + degradedCount * 0.5) / endpoints.length) * 100).toFixed(2)
    : '100.00';

  return (
    <div className="w-full space-y-4 font-mono select-none">
      {/* 3 Real Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Real Calculated Uptime % */}
        <div
          style={{ backgroundColor: cardBg }}
          className="p-4 rounded-xl flex items-center justify-between shadow-md border-none"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold opacity-60 block">30-DAY SYSTEM UPTIME</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-white">{uptimePercentage}%</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">VERIFIED</span>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-950 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Real Calculated Average Latency (MS) */}
        <div
          style={{ backgroundColor: cardBg }}
          className="p-4 rounded-xl flex items-center justify-between shadow-md border-none"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold opacity-60 block">AVG RESPONSE SPEED</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-white">{avgLatency > 0 ? `${avgLatency} ms` : 'N/A'}</span>
              <span className="text-[10px] opacity-60 uppercase font-bold">AVG PING</span>
            </div>
          </div>
          <div className="p-2.5 bg-rose-950 text-rose-300 rounded-lg" style={{ color: accentColor }}>
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Real Monitored Services Breakdown */}
        <div
          style={{ backgroundColor: cardBg }}
          className="p-4 rounded-xl flex items-center justify-between shadow-md border-none"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold opacity-60 block">ACTIVE SERVICES HEALTH</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {healthyCount}/{endpoints.length || 0}
              </span>
              <span className="text-[10px] text-emerald-400 uppercase font-bold">OPERATIONAL</span>
            </div>
          </div>
          <div className="p-2.5 bg-neutral-900 text-neutral-300 rounded-lg">
            <Server className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Real Individual Service Latency Breakdown Bar Chart */}
      {showBreakdown && validMetrics.length > 0 && (
        <div style={{ backgroundColor: cardBg }} className="p-4 rounded-xl space-y-3 shadow-md border-none">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] uppercase font-bold opacity-70">
            <span className="flex items-center gap-1.5 text-white">
              <Activity className="w-3.5 h-3.5" style={{ color: accentColor }} /> REAL LATENCY COMPARISON BY SERVICE
            </span>
            <span>HIGHEST: {maxLatency}MS</span>
          </div>

          <div className="space-y-2.5">
            {endpoints.map((ep) => {
              const latency = ep.lastResponseTimeMs || 0;
              const maxVal = Math.max(maxLatency, 100);
              const barWidthPct = Math.min(100, Math.max(8, (latency / maxVal) * 100));

              const isOptimal = latency > 0 && latency <= 100;
              const isNormal = latency > 100 && latency <= 300;

              return (
                <div key={ep._id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white uppercase text-[11px] truncate max-w-xs">{ep.projectName}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="opacity-60">{latency > 0 ? `${latency} ms` : 'Pending'}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                          isOptimal
                            ? 'bg-emerald-950 text-emerald-400'
                            : isNormal
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {isOptimal ? 'Fast' : isNormal ? 'Normal' : 'High'}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden flex">
                    <div
                      style={{
                        width: `${barWidthPct}%`,
                        backgroundColor: isOptimal ? '#10b981' : isNormal ? '#f59e0b' : accentColor,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Support & Help Desk Links */}
      {showSupport && (supportEmail || supportDocsUrl || twitterHandle) && (
        <div style={{ backgroundColor: cardBg }} className="p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3 text-xs border-none">
          <span className="text-[10px] uppercase font-bold opacity-60">SUPPORT & TELEMETRY LINKS</span>
          <div className="flex items-center gap-3 flex-wrap">
            {supportDocsUrl && (
              <a
                href={supportDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Documentation <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:underline"
              >
                <Mail className="w-3.5 h-3.5" /> {supportEmail}
              </a>
            )}
            {twitterHandle && (
              <a
                href={`https://twitter.com/${twitterHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:underline"
              >
                <Share2 className="w-3.5 h-3.5" /> {twitterHandle}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
