'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  FileText,
  Lightbulb,
  X,
  Bot,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { parseWakeUpMarkdownSpec, IParsedAiSpecResult } from '@/lib/codeParser';

interface AiSpecImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsed: IParsedAiSpecResult) => void;
}

export function AiSpecImportModal({ isOpen, onClose, onImport }: AiSpecImportModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'import' | 'suggestions'>('prompt');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [specContent, setSpecContent] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<IParsedAiSpecResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const aiAgentPromptText = `# WakeUp AI Agent Complete Codebase Journey & Audit Prompt

Analyze this codebase to construct a complete end-to-end API test workflow and conduct a backend testing readiness audit.

INSTRUCTIONS FOR AI AGENT:
1. ASK ADMIN BEFORE FINALIZING:
   - Before outputting \`wakeup_spec.md\`, ask the codebase owner/admin if they wish to skip any specific endpoints, include custom edge-case payloads, or customize cleanup routines.

2. COMPLETE USER & RESOURCE LIFECYCLE COVERAGE (FULL JOURNEY):
   - Map out the ENTIRE API journey, not just 2-3 endpoints.
   - Include User Auth (Login/Signup) -> Resource Creation -> Action/Triggering -> Edge Case Testing (400 validation errors) -> Cleanup (Delete created test data & test user).
   - Ensure expected status codes (e.g. 200, 201, 204, 400) and response verification assertions are specified for every step.

3. PRIVACY & DYNAMIC BASE URL:
   - Ensure NO secret keys or passwords leave the user's computer. Use standard dummy credentials for payloads.
   - Format all URLs using \`{{baseUrl}}\` (e.g., \`{{baseUrl}}/api/auth/login\`) so environment hosts can be toggled dynamically in WakeUp.

Format your generated response exactly as follows:

# WakeUp API Workflow Specification

## Step 1: User Signup / Register
- **Method**: POST
- **URL**: \`{{baseUrl}}/api/auth/register\`
- **Headers**:
  - \`Content-Type\`: \`application/json\`
- **Expected Status**: 201
- **Body**:
\`\`\`json
{
  "email": "testuser_123@example.com",
  "password": "Password123!"
}
\`\`\`
- **Extract Variables**:
  - \`userId\` from \`$.user._id\`
- **Carry Cookies**: true

---

## Step 2: User Login
- **Method**: POST
- **URL**: \`{{baseUrl}}/api/auth/login\`
- **Headers**:
  - \`Content-Type\`: \`application/json\`
- **Expected Status**: 200
- **Body**:
\`\`\`json
{
  "email": "testuser_123@example.com",
  "password": "Password123!"
}
\`\`\`
- **Extract Variables**:
  - \`authToken\` from \`$.token\`
- **Carry Cookies**: true

---

## Step 3: Fetch User Profile
- **Method**: GET
- **URL**: \`{{baseUrl}}/api/auth/me\`
- **Headers**:
  - \`Authorization\`: \`Bearer {{authToken}}\`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 4: Create Resource Endpoint
- **Method**: POST
- **URL**: \`{{baseUrl}}/api/endpoints\`
- **Headers**:
  - \`Authorization\`: \`Bearer {{authToken}}\`
  - \`Content-Type\`: \`application/json\`
- **Expected Status**: 201
- **Body**:
\`\`\`json
{
  "name": "TEST_RESOURCE_PING",
  "url": "{{baseUrl}}/api/health",
  "method": "GET"
}
\`\`\`
- **Extract Variables**:
  - \`resourceId\` from \`$.endpoint._id\`
- **Carry Cookies**: true

---

## Step 5: Test Action Trigger
- **Method**: POST
- **URL**: \`{{baseUrl}}/api/endpoints/{{resourceId}}/trigger\`
- **Headers**:
  - \`Authorization\`: \`Bearer {{authToken}}\`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 6: Edge Case - Invalid Resource Lookup
- **Method**: GET
- **URL**: \`{{baseUrl}}/api/endpoints/invalid_id_999\`
- **Headers**:
  - \`Authorization\`: \`Bearer {{authToken}}\`
- **Expected Status**: 404
- **Carry Cookies**: true

---

## Step 7: Cleanup - Delete Created Resource
- **Method**: DELETE
- **URL**: \`{{baseUrl}}/api/endpoints/{{resourceId}}\`
- **Headers**:
  - \`Authorization\`: \`Bearer {{authToken}}\`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 8: Cleanup - Delete Test User
- **Method**: DELETE
- **URL**: \`{{baseUrl}}/api/users/{{userId}}\`
- **Headers**:
  - \`Authorization\`: \`Bearer {{authToken}}\`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## AI Suggestions & Backend Readiness Audit
- Backend CORS Audit: Ensure \`app.use(cors())\` is enabled in Express server for browser test body visibility.
- Data Cleanup Safeguard: Add automated cascade deletes for test endpoint records upon user deletion.
- Rate Limiting: Implement X-RateLimit headers on authentication endpoints.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiAgentPromptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleSpecContentChange = (content: string) => {
    setSpecContent(content);
    setParseError(null);
    if (!content.trim()) {
      setParsedResult(null);
      return;
    }

    try {
      const result = parseWakeUpMarkdownSpec(content);
      if (result.steps.length === 0) {
        setParseError('No workflow steps detected. Ensure your Markdown includes ## Step N: headers with Method and URL fields.');
        setParsedResult(null);
      } else {
        setParsedResult(result);
      }
    } catch (err: any) {
      setParseError(`Failed to parse specification: ${err?.message || 'Invalid format'}`);
      setParsedResult(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      handleSpecContentChange(text);
    } catch (err: any) {
      setParseError('Failed to read uploaded Markdown file.');
    }
  };

  const handleApplyImport = () => {
    if (!parsedResult || parsedResult.steps.length === 0) return;
    onImport(parsedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-3xl bg-neutral-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-none text-xs">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-900/90 flex items-center justify-between border-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-950 text-rose-300 rounded-lg">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Import Workflow via Local AI Agent</h2>
              <p className="text-[11px] text-neutral-400">
                Use your codebase AI agent (Cursor, Antigravity, Copilot, Claude) to auto-generate testing flows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 bg-neutral-950 border-b border-neutral-900">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3.5 py-2 rounded-t-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'prompt' ? 'bg-rose-950 text-rose-300' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Copy className="w-3.5 h-3.5" /> 1. Copy AI Agent Prompt
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2 rounded-t-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'import' ? 'bg-rose-950 text-rose-300' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> 2. Paste / Upload Markdown
          </button>

          {parsedResult && parsedResult.suggestions.length > 0 && (
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-3.5 py-2 rounded-t-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'suggestions' ? 'bg-amber-950 text-amber-300' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> AI Insights ({parsedResult.suggestions.length})
            </button>
          )}
        </div>

        {/* Tab 1: AI Prompt Generator */}
        {activeTab === 'prompt' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="p-3 bg-neutral-900/60 rounded-xl space-y-1 text-neutral-300 leading-relaxed text-[11px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rose-400" /> How it works:
              </span>
              <p>
                1. Copy the prompt below into your local AI coding assistant (Antigravity, Cursor, Windsurf, Claude Code, or Copilot).
              </p>
              <p>
                2. Your AI agent will scan your codebase, consult you on skip preferences, and generate a full lifecycle <code className="text-emerald-400 bg-neutral-950 px-1 py-0.5 rounded">wakeup_spec.md</code> with cleanup steps.
              </p>
              <p>
                3. Paste or upload <code className="text-emerald-400 bg-neutral-950 px-1 py-0.5 rounded">wakeup_spec.md</code> in Tab 2 to instantly generate all workflow steps!
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Universal AI Codebase Scanner Prompt:</span>
                <button
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Copied Prompt!' : 'Copy AI Prompt'}</span>
                </button>
              </div>

              <pre className="p-4 bg-neutral-900 text-emerald-400 rounded-xl overflow-x-auto max-h-64 text-[11px] leading-relaxed select-text">
                {aiAgentPromptText}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveTab('import')}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next: Paste / Upload Spec</span>
                <ArrowRight className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Upload / Paste Markdown Spec */}
        {activeTab === 'import' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-white">Paste or Upload wakeup_spec.md Specification:</span>

              <label className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-rose-300 font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-all">
                <Upload className="w-3.5 h-3.5" /> Upload File (.md)
                <input type="file" accept=".md,.markdown,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={10}
              value={specContent}
              onChange={(e) => handleSpecContentChange(e.target.value)}
              placeholder="Paste contents of wakeup_spec.md generated by your local AI agent here..."
              className="w-full bg-neutral-900 text-xs font-mono text-emerald-400 p-3.5 rounded-xl border-none focus:outline-none leading-relaxed min-h-[220px]"
            />

            {parseError && (
              <div className="p-3 bg-rose-950/60 text-rose-300 rounded-xl font-bold text-[11px]">
                ❌ {parseError}
              </div>
            )}

            {parsedResult && (
              <div className="p-4 bg-emerald-950/40 rounded-xl space-y-2 border-none">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                    <Check className="w-4 h-4" /> Successfully Parsed AI Specification!
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-900 text-emerald-300 font-bold rounded text-[10px]">
                    {parsedResult.steps.length} Steps Detected
                  </span>
                </div>

                <div className="text-[11px] text-neutral-300 space-y-1">
                  <p>Workflow Name: <span className="font-bold text-white">{parsedResult.workflowName}</span></p>
                  {parsedResult.suggestions.length > 0 && (
                    <p className="text-amber-300 font-bold">
                      💡 {parsedResult.suggestions.length} System Upgrade & AI Insights Extracted!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: AI Suggestions & System Upgrades */}
        {activeTab === 'suggestions' && parsedResult && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="p-3 bg-amber-950/40 text-amber-300 rounded-xl font-bold text-xs flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>AI Agent Codebase Analysis & System Upgrade Suggestions:</span>
            </div>

            <div className="space-y-2.5">
              {parsedResult.suggestions.map((sug, idx) => (
                <div key={idx} className="p-3.5 bg-neutral-900 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-neutral-200">
                  <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span>{sug}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-4 bg-neutral-900/90 flex items-center justify-between border-none">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 font-bold rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleApplyImport}
            disabled={!parsedResult || parsedResult.steps.length === 0}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-700/20"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Import & Build Workflow ({parsedResult?.steps.length || 0} Steps)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
