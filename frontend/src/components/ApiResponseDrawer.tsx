'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Code,
  Key,
  Cookie,
  Database,
  Activity,
  AlertTriangle,
  Download,
  Terminal,
  Globe,
  Server,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface IApiResponseData {
  stepId?: string;
  stepName?: string;
  url?: string;
  method?: string;
  status: 'success' | 'failed' | 'error' | 'skipped';
  statusCode?: number;
  latencyMs?: number;
  errorMessage?: string;
  responseBody?: any;
  responseSnippet?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  extractedVars?: Record<string, string>;
  executionSource?: 'browser' | 'cloud' | 'local';
  timestamp?: string;
}

interface ApiResponseDrawerProps {
  result: IApiResponseData;
  onClose?: () => void;
  title?: string;
  defaultOpen?: boolean;
  hideHeaderStatus?: boolean;
}

export function ApiResponseDrawer({
  result,
  onClose,
  title = 'API Response Telemetry',
  defaultOpen = true,
  hideHeaderStatus = false,
}: ApiResponseDrawerProps) {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies' | 'variables' | 'metrics'>('body');
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showCorsHelp, setShowCorsHelp] = useState<boolean>(false);
  const [activeCorsTab, setActiveCorsTab] = useState<'express' | 'fastapi' | 'flask' | 'spring'>('express');
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  // Check if response is an opaque CORS response
  const isOpaqueCors =
    result.responseSnippet?.includes('hidden by Browser Security') ||
    result.responseSnippet?.includes('missing CORS headers') ||
    (result.url?.includes('localhost') && result.statusCode === 200 && result.responseSnippet?.includes('reachable'));

  // Format Response Body String
  let formattedBody = '';
  if (result.responseBody !== undefined && result.responseBody !== null) {
    formattedBody =
      typeof result.responseBody === 'object'
        ? JSON.stringify(result.responseBody, null, 2)
        : String(result.responseBody);
  } else if (result.responseSnippet) {
    try {
      const parsed = JSON.parse(result.responseSnippet);
      formattedBody = JSON.stringify(parsed, null, 2);
    } catch {
      formattedBody = result.responseSnippet;
    }
  } else if (result.errorMessage) {
    formattedBody = result.errorMessage;
  }

  const payloadSizeBytes = formattedBody ? new Blob([formattedBody]).size : 0;
  const lineCount = formattedBody ? formattedBody.split('\n').length : 0;

  const handleCopyBody = () => {
    if (!formattedBody) return;
    navigator.clipboard.writeText(formattedBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBody = () => {
    if (!formattedBody) return;
    const blob = new Blob([formattedBody], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response_${result.stepName || 'step'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // HTTP Method Badge Color (Zero Border Standard)
  const getMethodBadge = (m?: string) => {
    switch (m?.toUpperCase()) {
      case 'POST':
        return 'bg-amber-950 text-amber-300';
      case 'PUT':
      case 'PATCH':
        return 'bg-sky-950 text-sky-300';
      case 'DELETE':
        return 'bg-rose-950 text-rose-300';
      default:
        return 'bg-emerald-950 text-emerald-400';
    }
  };

  // HTTP Status Badge Color
  const getStatusBadge = (code?: number, status?: string) => {
    if (status === 'skipped') return 'bg-neutral-900 text-neutral-400';
    if (!code || code === 0) return 'bg-rose-950 text-rose-400';
    if (code >= 200 && code < 300) return 'bg-emerald-950 text-emerald-400';
    if (code >= 300 && code < 400) return 'bg-sky-950 text-sky-300';
    if (code >= 400 && code < 500) return 'bg-amber-950 text-amber-300';
    return 'bg-rose-950 text-rose-400';
  };

  const isFast = (result.latencyMs || 0) <= 100;
  const isNormal = (result.latencyMs || 0) > 100 && (result.latencyMs || 0) <= 300;

  const latencyFormatted =
    (result.latencyMs || 0) >= 1000
      ? `${((result.latencyMs || 0) / 1000).toFixed(2)} s`
      : `${result.latencyMs || 0} ms`;

  const payloadFormatted =
    payloadSizeBytes >= 1024 ? `${(payloadSizeBytes / 1024).toFixed(1)} KB` : `${payloadSizeBytes} B`;

  const headerCount = Object.keys(result.headers || {}).length;
  const cookieCount = Object.keys(result.cookies || {}).length;
  const varCount = Object.keys(result.extractedVars || {}).length;

  return (
    <div className="w-full h-full bg-[#121214] font-mono text-xs flex flex-col overflow-hidden border-none pt-1">
      {/* Postman Response Header Bar */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 select-none border-none bg-[#161619]/60 rounded-t-xl">
        {/* Left Sub-Navigation Tabs */}
        <div className="flex items-center gap-4 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('body')}
            className={`pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-t-0 border-x-0 border-b-2 bg-transparent ${
              activeTab === 'body'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white font-medium'
            }`}
          >
            Body
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-t-0 border-x-0 border-b-2 bg-transparent ${
              activeTab === 'cookies'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white font-medium'
            }`}
          >
            Cookies {cookieCount > 0 && <span className="text-[10px] text-neutral-400">{cookieCount}</span>}
          </button>

          <button
            onClick={() => setActiveTab('headers')}
            className={`pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-t-0 border-x-0 border-b-2 bg-transparent ${
              activeTab === 'headers'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white font-medium'
            }`}
          >
            Headers <span className="text-[10px] text-neutral-400">{headerCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('variables')}
            className={`pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-t-0 border-x-0 border-b-2 bg-transparent ${
              activeTab === 'variables'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white font-medium'
            }`}
          >
            Extracted Vars {varCount > 0 && <span className="text-[10px] text-neutral-400">{varCount}</span>}
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-1 transition-all flex items-center gap-1.5 cursor-pointer border-t-0 border-x-0 border-b-2 bg-transparent ${
              activeTab === 'metrics'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white font-medium'
            }`}
          >
            Telemetry
          </button>
        </div>

        {/* Right Status Pill, Latency & Payload Size */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {!hideHeaderStatus && (
            <>
              <span
                className={`px-3 py-1 font-bold text-xs rounded-full shadow-sm ${
                  result.status === 'skipped'
                    ? 'bg-neutral-800 text-neutral-400'
                    : result.statusCode && result.statusCode >= 200 && result.statusCode < 300
                    ? 'bg-[#16a34a] text-white font-bold'
                    : 'bg-rose-600 text-white font-bold'
                }`}
              >
                {result.status === 'skipped' ? 'SKIPPED' : result.statusCode ? `${result.statusCode} OK` : 'ERR'}
              </span>

              <span className="text-neutral-400 font-bold">•</span>
              <span className="text-neutral-300 font-mono text-xs">{latencyFormatted}</span>

              <span className="text-neutral-400 font-bold">•</span>
            </>
          )}

          <span className="text-neutral-300 font-mono text-xs">{payloadFormatted}</span>

          {activeTab === 'body' && formattedBody && (
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleCopyBody}
                className="px-2.5 py-1 bg-[#1a1a1e] hover:bg-[#25252a] text-neutral-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer border-none"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadBody}
                className="px-2.5 py-1 bg-[#1a1a1e] hover:bg-[#25252a] text-neutral-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer border-none"
              >
                <Download className="w-3 h-3 text-rose-400" />
                <span>Save</span>
              </button>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#242429] rounded-md text-neutral-400 hover:text-white transition-colors cursor-pointer border-none ml-1"
              title="Close Drawer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Drawer Body */}
      {isOpen && (
        <div className="px-4 pt-1 flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
          {/* CORS Opaque Notice Helper */}
          {isOpaqueCors && (
            <div className="p-3.5 bg-amber-950/40 rounded-md space-y-2 border-none">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Cross-Origin Security Notice (Direct Browser Execution)</span>
                </div>
                <button
                  onClick={() => setShowCorsHelp(!showCorsHelp)}
                  className="text-[11px] text-amber-400 hover:underline font-bold"
                >
                  {showCorsHelp ? 'Hide Solutions ▲' : 'Show 1-Line CORS Fix ▼'}
                </button>
              </div>

              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Your local backend is reachable in <span className="font-bold text-amber-300">{result.latencyMs}ms</span>.
                Full response body is hidden because your local API is missing <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-300">Access-Control-Allow-Origin</code> CORS headers.
              </p>

              {showCorsHelp && (
                <div className="mt-3 space-y-2.5 pt-2 border-t border-amber-900/50">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      onClick={() => setActiveCorsTab('express')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        activeCorsTab === 'express' ? 'bg-[#f5f0e8] text-black' : 'bg-[#1a1a1e] text-neutral-300'
                      }`}
                    >
                      Node / Express
                    </button>
                    <button
                      onClick={() => setActiveCorsTab('fastapi')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        activeCorsTab === 'fastapi' ? 'bg-[#f5f0e8] text-black' : 'bg-[#1a1a1e] text-neutral-300'
                      }`}
                    >
                      FastAPI
                    </button>
                    <button
                      onClick={() => setActiveCorsTab('flask')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        activeCorsTab === 'flask' ? 'bg-[#f5f0e8] text-black' : 'bg-[#1a1a1e] text-neutral-300'
                      }`}
                    >
                      Flask
                    </button>
                    <button
                      onClick={() => setActiveCorsTab('spring')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        activeCorsTab === 'spring' ? 'bg-[#f5f0e8] text-black' : 'bg-[#1a1a1e] text-neutral-300'
                      }`}
                    >
                      Spring Boot
                    </button>
                  </div>

                  <pre className="p-3 bg-[#050505] rounded-md text-emerald-400 text-[11px] overflow-x-auto leading-relaxed border-none">
                    {activeCorsTab === 'express' && `const cors = require('cors');\napp.use(cors()); // Add before routes`}
                    {activeCorsTab === 'fastapi' && `from fastapi.middleware.cors import CORSMiddleware\napp.add_middleware(CORSMiddleware, allow_origins=["*"])`}
                    {activeCorsTab === 'flask' && `from flask_cors import CORS\nCORS(app)`}
                    {activeCorsTab === 'spring' && `@CrossOrigin(origins = "*")\n@RestController`}
                  </pre>
                </div>
              )}
            </div>
          )}

    

          {/* TAB 1: RESPONSE BODY */}
          {activeTab === 'body' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
                <div className="flex items-center gap-3">
                  <span>Size: <span className="text-white font-bold">{payloadSizeBytes} B</span></span>
                  <span>Lines: <span className="text-white font-bold">{lineCount}</span></span>
                </div>
                {lineCount > 10 && (
                  <input
                    type="text"
                    placeholder="Search payload content..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-2.5 py-1 bg-neutral-900 text-white rounded text-[11px] border-none focus:outline-none w-44"
                  />
                )}
              </div>

              {formattedBody ? (
                <div className="font-mono text-xs bg-[#09090b] rounded-xl overflow-auto flex-1 min-h-0 ring-1 ring-white/10 shadow-inner p-2 select-text scrollbar-thin">
                  <table className="w-full border-collapse font-mono text-[11px]">
                    <tbody>
                      {(searchFilter
                        ? formattedBody.split('\n').filter((l) => l.toLowerCase().includes(searchFilter.toLowerCase()))
                        : formattedBody.split('\n')
                      ).map((line, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.03]">
                          <td className="w-10 pr-3 py-0.5 text-right text-neutral-600 select-none font-mono text-[10px] border-r border-neutral-800/60 sticky left-0 bg-[#09090b] align-top">
                            {idx + 1}
                          </td>
                          <td className="pl-3 py-0.5 whitespace-pre font-mono text-emerald-400 text-[11px] leading-relaxed select-text align-top">
                            {line}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 bg-neutral-900/50 rounded-xl text-center text-neutral-500 text-xs">
                  No response body returned from server.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HEADERS */}
          {activeTab === 'headers' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
              {result.headers && Object.keys(result.headers).length > 0 ? (
                <div className="bg-[#09090b] rounded-xl overflow-auto flex-1 min-h-0 border border-neutral-800/60 shadow-inner">
                  <table className="w-full text-left border-none font-mono">
                    <thead>
                      <tr className="bg-[#141416] text-neutral-400 text-[11px] font-bold border-b border-neutral-800/80">
                        <th className="p-3 w-1/3">Key</th>
                        <th className="p-3 w-2/3">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/40 text-xs">
                      {Object.entries(result.headers).map(([key, val]) => (
                        <tr key={key} className="hover:bg-[#141418]/60 transition-colors">
                          <td className="p-3 font-semibold text-white select-text">{key}</td>
                          <td className="p-3 text-neutral-300 font-mono select-text break-all">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 bg-neutral-900/50 rounded-xl text-center text-neutral-500 text-xs font-mono">
                  No response headers returned or captured in response telemetry.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COOKIES */}
          {activeTab === 'cookies' && (
            <div className="space-y-2">
              {result.cookies && Object.keys(result.cookies).length > 0 ? (
                <div className="bg-neutral-900 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-none">
                    <thead>
                      <tr className="bg-neutral-850 text-neutral-400 text-[10px] uppercase tracking-wider border-none">
                        <th className="p-3">Cookie Key</th>
                        <th className="p-3">Cookie Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50 text-xs">
                      {Object.entries(result.cookies).map(([key, val]) => (
                        <tr key={key} className="hover:bg-neutral-800/40">
                          <td className="p-3 font-bold text-amber-300 select-text">{key}</td>
                          <td className="p-3 text-neutral-300 font-mono select-text break-all">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 bg-neutral-900/50 rounded-xl text-center text-neutral-500 text-xs">
                  No session cookies captured for this step.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXTRACTED VARIABLES */}
          {activeTab === 'variables' && (
            <div className="space-y-2">
              {result.extractedVars && Object.keys(result.extractedVars).length > 0 ? (
                <div className="bg-neutral-900 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-none">
                    <thead>
                      <tr className="bg-neutral-850 text-neutral-400 text-[10px] uppercase tracking-wider border-none">
                        <th className="p-3">Variable Name</th>
                        <th className="p-3">Extracted Value</th>
                        <th className="p-3">Workflow Token Usage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50 text-xs">
                      {Object.entries(result.extractedVars).map(([varName, val]) => (
                        <tr key={varName} className="hover:bg-neutral-800/40">
                          <td className="p-3 font-bold text-purple-300 select-text">{varName}</td>
                          <td className="p-3 text-emerald-400 font-mono select-text break-all">{val}</td>
                          <td className="p-3 text-neutral-400">
                            <code className="bg-neutral-950 px-2 py-1 rounded text-rose-300 text-[10px]">
                              {`{{${varName}}}`}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 bg-neutral-900/50 rounded-xl text-center text-neutral-500 text-xs">
                  No variables extracted from JSONPath response mapping.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LATENCY METRICS */}
          {activeTab === 'metrics' && (
            <div className="p-4 bg-neutral-900 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase text-[11px]">Response Latency & Speed Rating</span>
                <span
                  className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase ${
                    isFast ? 'bg-emerald-950 text-emerald-400' : isNormal ? 'bg-amber-950 text-amber-300' : 'bg-rose-950 text-rose-400'
                  }`}
                >
                  {isFast ? '⚡ Ultra Fast (<100ms)' : isNormal ? '🟢 Normal (<300ms)' : '🟡 Slow Response (>300ms)'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Total Latency</span>
                  <span className="font-bold text-white">{result.latencyMs || 0} ms</span>
                </div>
                <div className="h-3 w-full bg-neutral-950 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, Math.max(10, ((result.latencyMs || 0) / 500) * 100))}%` }}
                    className={`h-full rounded-full ${
                      isFast ? 'bg-emerald-500' : isNormal ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
