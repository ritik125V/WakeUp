'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Save,
  FileDown,
  ExternalLink,
  Download,
  Layers,
  Zap,
  Code,
  Globe,
  Settings,
  Database,
  Cookie,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Terminal,
  Maximize2,
  X,
  FileText,
  Sparkles,
  Link2,
  SlidersHorizontal,
  Key,
  MinusCircle,
  Send,
  Activity,
  ArrowRight,
  Eye,
  Check,
  GitBranch,
  Search,
  Lock,
  Unlock,
  Folder,
  FolderOpen,
  ChevronRight,
  FileCode,
  FileJson,
  CheckSquare,
  Square,
  Upload,
  FolderPlus,
  Laptop,
  History,
  GitCommit,
} from 'lucide-react';
import { extractEndpointsFromCode } from '@/lib/codeParser';
import {
  fetchWorkflowById,
  updateWorkflow,
  testSingleWorkflowStep,
  triggerTestGithubPush,
  fetchGithubRepos,
  autoCreateGithubWebhook,
  fetchGithubRepoFiles,
  scanGithubRepoEndpoints,
  importScannedEndpointsToWorkflow,
  fetchWorkflowRunHistory,
  fetchWebhookLogs,
  fetchGithubAppConfig,
  getBackendWebhookUrl,
  IWebhookLogItem,
  IScannedEndpoint,
  IGithubRepoItem,
  WorkflowData,
  IWorkflowStepData,
  IWorkflowVariableExtract,
} from '@/lib/api';
import { ApiResponseDrawer } from '@/components/ApiResponseDrawer';
import { AiSpecImportModal } from '@/components/AiSpecImportModal';
import {
  generateWorkflowPDFReport,
  openWorkflowPDFInNewTab,
  IStepTelemetryForPDF,
  IWorkflowRunSummaryForPDF,
} from '@/lib/pdfReportGenerator';

const API_SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  children?: FileTreeNode[];
}

export function buildFileTree(files: { path: string; size?: number }[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      let existingNode = currentLevel.find((node) => node.name === part);

      if (!existingNode) {
        existingNode = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          size: isLast ? file.size : undefined,
          children: isLast ? undefined : [],
        };
        currentLevel.push(existingNode);
      }

      if (!isLast && existingNode.children) {
        currentLevel = existingNode.children;
      }
    }
  }

  const sortTree = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name);
      }
      return a.isFolder ? -1 : 1;
    });
    for (const node of nodes) {
      if (node.children) sortTree(node.children);
    }
  };

  sortTree(root);
  return root;
}

export function getAllChildFilePaths(node: FileTreeNode): string[] {
  if (!node.isFolder) return [node.path];
  const paths: string[] = [];
  if (node.children) {
    for (const child of node.children) {
      paths.push(...getAllChildFilePaths(child));
    }
  }
  return paths;
}

function FileTreeNodeRow({
  node,
  depth = 0,
  selectedFilePaths,
  onToggleFile,
  onToggleFolder,
  searchQuery,
}: {
  node: FileTreeNode;
  depth?: number;
  selectedFilePaths: string[];
  onToggleFile: (path: string) => void;
  onToggleFolder: (node: FileTreeNode) => void;
  searchQuery: string;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(depth < 2);

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    const allPaths = getAllChildFilePaths(node);
    const matchesAny = allPaths.some((p) => p.toLowerCase().includes(query));
    if (!matchesAny) return null;
  }

  const allChildFiles = getAllChildFilePaths(node);
  const selectedChildCount = allChildFiles.filter((p) => selectedFilePaths.includes(p)).length;
  const isAllChildSelected = allChildFiles.length > 0 && selectedChildCount === allChildFiles.length;
  const isPartiallySelected = selectedChildCount > 0 && selectedChildCount < allChildFiles.length;

  if (node.isFolder) {
    return (
      <div className="select-none font-mono">
        <div
          className={`flex items-center justify-between py-1 px-2 hover:bg-neutral-900 rounded cursor-pointer transition-colors text-xs ${
            selectedChildCount > 0 ? 'text-purple-300 font-bold' : 'text-neutral-300'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <button
              type="button"
              className="p-0 border-none bg-transparent text-neutral-400 hover:text-white"
            >
              {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />}
            </button>

            <input
              type="checkbox"
              checked={isAllChildSelected}
              ref={(input) => {
                if (input) input.indeterminate = isPartiallySelected;
              }}
              onChange={(e) => {
                e.stopPropagation();
                onToggleFolder(node);
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-none accent-purple-600 shrink-0 cursor-pointer"
            />

            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          <span className="text-[9px] text-neutral-500 shrink-0">
            {selectedChildCount > 0 ? `${selectedChildCount}/${allChildFiles.length}` : `${allChildFiles.length} file(s)`}
          </span>
        </div>

        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNodeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFilePaths={selectedFilePaths}
                onToggleFile={onToggleFile}
                onToggleFolder={onToggleFolder}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedFilePaths.includes(node.path);
  const ext = node.name.split('.').pop()?.toLowerCase();

  let IconComponent = FileCode;
  let iconColor = 'text-neutral-400';

  if (ext === 'ts' || ext === 'tsx') {
    iconColor = 'text-blue-400';
  } else if (ext === 'js' || ext === 'jsx') {
    iconColor = 'text-yellow-400';
  } else if (ext === 'py') {
    iconColor = 'text-emerald-400';
  } else if (ext === 'go') {
    iconColor = 'text-cyan-400';
  } else if (ext === 'json' || ext === 'yaml' || ext === 'yml') {
    IconComponent = FileJson;
    iconColor = 'text-rose-400';
  }

  return (
    <div
      onClick={() => onToggleFile(node.path)}
      className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors text-xs select-none font-mono ${
        isSelected
          ? 'bg-purple-950/70 text-purple-200 font-bold border-l-2 border-purple-500'
          : 'hover:bg-neutral-900 text-neutral-300'
      }`}
      style={{ paddingLeft: `${depth * 14 + 24}px` }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-none accent-purple-600 shrink-0 cursor-pointer"
        />
        <IconComponent className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
        <span className="truncate">{node.name}</span>
      </div>

      <span className="text-[9px] text-neutral-500 shrink-0">
        {node.size ? `${(node.size / 1024).toFixed(1)} KB` : ''}
      </span>
    </div>
  );
}

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'cookies' | 'variables'>('body');

  // Top Navigation Dropdown States
  const [isConfigsMenuOpen, setIsConfigsMenuOpen] = useState<boolean>(false);
  const [isIntegrationsMenuOpen, setIsIntegrationsMenuOpen] = useState<boolean>(false);

  // Pre-Flight, Guide & Auth Modal state
  const [isPreflightOpen, setIsPreflightOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOAuthPopupOpen, setIsOAuthPopupOpen] = useState<boolean>(false);
  const [oauthAppId, setOauthAppId] = useState<string>('84920491-google-oauth.apps.googleusercontent.com');
  const [oauthSelectedAccount, setOauthSelectedAccount] = useState<string | null>(null);
  const [realAuthUrl, setRealAuthUrl] = useState<string>('http://localhost:3000/login');
  const [isSingleTesting, setIsSingleTesting] = useState<boolean>(false);
  const [singleTestResult, setSingleTestResult] = useState<IStepTelemetryForPDF | null>(null);

  // GitHub Webhook Auto-Trigger & Control Center State
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);
  const [githubModalTab, setGithubModalTab] = useState<'config' | 'simulation' | 'scanner' | 'history'>('config');
  const [githubEnabled, setGithubEnabled] = useState<boolean>(false);
  const [githubRepo, setGithubRepo] = useState<string>('');
  const [githubBranch, setGithubBranch] = useState<string>('main');
  const [githubSecretToken, setGithubSecretToken] = useState<string>('');
  const [notificationEmail, setNotificationEmail] = useState<string>('');
  const [isSimulatingPush, setIsSimulatingPush] = useState<boolean>(false);
  const [pushSimResult, setPushSimResult] = useState<string | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<boolean>(false);

  // GitHub Repo Fetcher & Auto-Webhook State
  const [githubUserOrToken, setGithubUserOrToken] = useState<string>('');
  const [fetchedRepos, setFetchedRepos] = useState<IGithubRepoItem[]>([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState<string>('');
  const [isFetchingRepos, setIsFetchingRepos] = useState<boolean>(false);
  const [repoFetchError, setRepoFetchError] = useState<string | null>(null);
  const [isCreatingAutoWebhook, setIsCreatingAutoWebhook] = useState<boolean>(false);
  const [autoWebhookMsg, setAutoWebhookMsg] = useState<string | null>(null);

  // Endpoint Scanner Modal State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [scannerRepoFullName, setScannerRepoFullName] = useState<string>('');
  const [scannerToken, setScannerToken] = useState<string>('');
  const [scannerBranch, setScannerBranch] = useState<string>('main');
  const [scannerScanMode, setScannerScanMode] = useState<'all' | 'select'>('all');
  const [isFetchingFiles, setIsFetchingFiles] = useState<boolean>(false);
  const [repoFilesList, setRepoFilesList] = useState<{ path: string; size?: number }[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [isScanningEndpoints, setIsScanningEndpoints] = useState<boolean>(false);
  const [scannedEndpoints, setScannedEndpoints] = useState<IScannedEndpoint[]>([]);
  const [selectedEndpointIndexes, setSelectedEndpointIndexes] = useState<number[]>([]);
  const [baseUrlForImport, setBaseUrlForImport] = useState<string>('http://localhost:5000');
  const [replaceExistingSteps, setReplaceExistingSteps] = useState<boolean>(false);
  const [isImportingSteps, setIsImportingSteps] = useState<boolean>(false);
  const [scannerStatusMsg, setScannerStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scannerSourceTab, setScannerSourceTab] = useState<'github' | 'local'>('github');
  // AI Spec & Autocomplete Dropdown State
  const [isAiSpecModalOpen, setIsAiSpecModalOpen] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isUrlDropdownOpen, setIsUrlDropdownOpen] = useState<boolean>(false);
  // Bulk Base URL Override State (Frontend Only)
  const [globalBaseUrl, setGlobalBaseUrl] = useState<string>('http://localhost:5000');
  const [isBaseUrlPopoverOpen, setIsBaseUrlPopoverOpen] = useState<boolean>(false);

  // Run History Drawer State
  const [isRunHistoryOpen, setIsRunHistoryOpen] = useState<boolean>(false);
  const [pastRuns, setPastRuns] = useState<any[]>([]);
  const [loadingPastRuns, setLoadingPastRuns] = useState<boolean>(false);
  const [rawWebhookLogs, setRawWebhookLogs] = useState<IWebhookLogItem[]>([]);
  const [loadingRawWebhookLogs, setLoadingRawWebhookLogs] = useState<boolean>(false);

  const loadPastRuns = async () => {
    try {
      setLoadingPastRuns(true);
      const res = await fetchWorkflowRunHistory(workflowId, 30);
      setPastRuns(res.runs || []);
    } catch (err) {
      console.error('Failed to load workflow run history:', err);
    } finally {
      setLoadingPastRuns(false);
    }
  };

  const loadRawWebhookLogs = async () => {
    try {
      setLoadingRawWebhookLogs(true);
      const res = await fetchWebhookLogs();
      setRawWebhookLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load raw webhook logs:', err);
    } finally {
      setLoadingRawWebhookLogs(false);
    }
  };

  const [githubAppConfig, setGithubAppConfig] = useState<{ appName: string; installUrl: string; enabled: boolean } | null>(null);

  const loadGithubAppConfig = async () => {
    try {
      const res = await fetchGithubAppConfig();
      setGithubAppConfig(res);
    } catch (err) {
      console.error('Failed to load GitHub App config:', err);
    }
  };

  const handleOpenGithubModal = () => {
    setIsGithubModalOpen(true);
    loadPastRuns();
    loadRawWebhookLogs();
    loadGithubAppConfig();
  };

  const handleOpenHistory = () => {
    setIsRunHistoryOpen(true);
    loadPastRuns();
  };

  const handleLocalFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsScanningEndpoints(true);
      setScannerStatusMsg(null);

      const allEndpoints: IScannedEndpoint[] = [];
      const fileList: { path: string; size?: number }[] = [];
      const filePaths: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = (file as any).webkitRelativePath || file.name;
        const p = relativePath.toLowerCase();

        if (
          !p.endsWith('.ts') &&
          !p.endsWith('.js') &&
          !p.endsWith('.py') &&
          !p.endsWith('.go') &&
          !p.endsWith('.json') &&
          !p.endsWith('.yaml') &&
          !p.endsWith('.yml') &&
          !p.endsWith('.jsx') &&
          !p.endsWith('.tsx')
        ) {
          continue;
        }

        if (p.includes('node_modules') || p.includes('.git/') || p.includes('dist/') || p.includes('build/')) {
          continue;
        }

        fileList.push({ path: relativePath, size: file.size });
        filePaths.push(relativePath);

        try {
          const content = await file.text();
          if (content) {
            const found = extractEndpointsFromCode(content, relativePath);
            allEndpoints.push(...found);
          }
        } catch (readErr) {
          console.error(`Error reading local file ${relativePath}:`, readErr);
        }
      }

      setRepoFilesList(fileList);
      setSelectedFilePaths(filePaths);
      setScannedEndpoints(allEndpoints);
      setSelectedEndpointIndexes(allEndpoints.map((_, idx) => idx));

      if (allEndpoints.length === 0) {
        setScannerStatusMsg({
          type: 'error',
          text: `Processed ${fileList.length} local code file(s), but no API route definitions were detected. Ensure you select Express, Next.js, FastAPI, Go, or OpenAPI spec files.`,
        });
      } else {
        setScannerStatusMsg({
          type: 'success',
          text: `Successfully scanned ${fileList.length} local file(s) and detected ${allEndpoints.length} endpoint(s)!`,
        });
        setBaseUrlForImport('http://localhost:3000');
      }
    } catch (err: any) {
      console.error('Failed to scan local files:', err);
      setScannerStatusMsg({ type: 'error', text: err?.message || 'Failed to scan local machine files' });
    } finally {
      setIsScanningEndpoints(false);
    }
  };

  const handleImportAiSpec = (parsed: any) => {
    if (!workflow || !parsed.steps || parsed.steps.length === 0) return;

    const updatedSteps = [...parsed.steps];
    setWorkflow({
      ...workflow,
      name: parsed.workflowName && parsed.workflowName !== 'AI Generated API Workflow' ? parsed.workflowName : workflow.name,
      steps: updatedSteps,
    });
    setActiveStepIndex(0);

    if (parsed.suggestions && parsed.suggestions.length > 0) {
      setAiSuggestions(parsed.suggestions);
    }

    const endpointsFromSpec: IScannedEndpoint[] = parsed.steps.map((s: any) => ({
      method: s.method,
      path: s.url.replace(/^https?:\/\/[^\/]+/, '') || s.url,
      sourceFile: 'AI Spec (wakeup_spec.md)',
      line: 1,
      framework: 'AI Spec',
      suggestedBody: s.bodyPayload,
      expectedStatus: s.expectedStatusCode || 200,
    }));
    setScannedEndpoints((prev) => [...endpointsFromSpec, ...prev]);
  };

  const handleApplyBulkBaseUrl = () => {
    if (!workflow || !globalBaseUrl.trim()) return;

    const cleanBase = globalBaseUrl.trim().replace(/\/$/, '');
    const updatedSteps = workflow.steps.map((step) => {
      let rawUrl = (step.url || '').trim();

      // Cleanly strip any existing origin or host template (http://..., https://..., {{baseUrl}}, {{host}})
      let pathOnly = rawUrl
        .replace(/^https?:\/\/[^\/]+/, '')
        .replace(/^\{\{\s*[\w.-]+\s*\}\}/, '');

      if (!pathOnly.startsWith('/')) {
        pathOnly = '/' + pathOnly;
      }

      const newUrl = `${cleanBase}${pathOnly}`;
      return { ...step, url: newUrl };
    });

    setWorkflow({ ...workflow, steps: updatedSteps });
    setIsBaseUrlPopoverOpen(false);
  };

  const handleOpenScanner = () => {
    const repo = workflow?.githubRepo || scannerRepoFullName || '';
    const branch = workflow?.githubBranch || scannerBranch || 'main';
    const tok = workflow?.githubSecretToken || (githubUserOrToken && (githubUserOrToken.startsWith('ghp_') || githubUserOrToken.startsWith('github_pat_')) ? githubUserOrToken : scannerToken);

    setScannerRepoFullName(repo);
    setScannerBranch(branch);
    setScannerToken(tok);
    setIsScannerModalOpen(true);

    if (repo) {
      handleFetchRepoFiles(repo, tok, branch);
    }
  };

  const handleToggleFile = (path: string) => {
    setSelectedFilePaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleToggleFolder = (folderNode: FileTreeNode) => {
    const childPaths = getAllChildFilePaths(folderNode);
    const allSelected = childPaths.every((p) => selectedFilePaths.includes(p));

    if (allSelected) {
      setSelectedFilePaths((prev) => prev.filter((p) => !childPaths.includes(p)));
    } else {
      setSelectedFilePaths((prev) => Array.from(new Set([...prev, ...childPaths])));
    }
  };

  const handleFetchRepoFiles = async (overrideRepo?: string, overrideToken?: string, overrideBranch?: string) => {
    const targetRepo = (overrideRepo !== undefined ? overrideRepo : scannerRepoFullName).trim();
    const targetToken = (overrideToken !== undefined ? overrideToken : scannerToken).trim();
    const targetBranch = (overrideBranch !== undefined ? overrideBranch : scannerBranch).trim() || 'main';

    if (!targetRepo) {
      setScannerStatusMsg({ type: 'error', text: 'Please enter a GitHub repository name (owner/repo)' });
      return;
    }
    try {
      setIsFetchingFiles(true);
      setScannerStatusMsg(null);
      const res = await fetchGithubRepoFiles({
        repoFullName: targetRepo,
        token: targetToken || undefined,
        branch: targetBranch,
      });
      setRepoFilesList(res.files || []);
      setScannerStatusMsg({ type: 'success', text: `Fetched ${res.count} candidate code files from repository.` });
    } catch (err: any) {
      console.error('Failed to fetch repo files:', err);
      setScannerStatusMsg({ type: 'error', text: err?.response?.data?.error || err.message || 'Failed to list repo files' });
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleRunEndpointScanner = async () => {
    if (!scannerRepoFullName.trim()) {
      setScannerStatusMsg({ type: 'error', text: 'Please enter a GitHub repository name (owner/repo)' });
      return;
    }
    try {
      setIsScanningEndpoints(true);
      setScannerStatusMsg(null);
      const targetFiles = scannerScanMode === 'select' && selectedFilePaths.length > 0 ? selectedFilePaths : undefined;
      const res = await scanGithubRepoEndpoints({
        repoFullName: scannerRepoFullName,
        token: scannerToken.trim() || undefined,
        targetFiles,
        branch: scannerBranch || 'main',
      });
      setScannedEndpoints(res.endpoints || []);
      setSelectedEndpointIndexes((res.endpoints || []).map((_, i) => i));
      if (res.endpoints.length === 0) {
        setScannerStatusMsg({ type: 'error', text: 'No API endpoints detected in the scanned files. Try selecting specific files or OpenAPI spec.' });
      } else {
        setScannerStatusMsg({ type: 'success', text: `Successfully scanned and found ${res.count} endpoint(s)!` });
      }
    } catch (err: any) {
      console.error('Failed to scan endpoints:', err);
      setScannerStatusMsg({ type: 'error', text: err?.response?.data?.error || err.message || 'Failed to scan endpoints' });
    } finally {
      setIsScanningEndpoints(false);
    }
  };

  const handleImportSelectedEndpoints = async () => {
    if (selectedEndpointIndexes.length === 0) {
      setScannerStatusMsg({ type: 'error', text: 'Please select at least one endpoint to import' });
      return;
    }
    try {
      setIsImportingSteps(true);
      setScannerStatusMsg(null);
      const selectedEndpoints = selectedEndpointIndexes.map((i) => scannedEndpoints[i]);
      const res = await importScannedEndpointsToWorkflow(workflowId, {
        endpoints: selectedEndpoints,
        baseUrl: baseUrlForImport,
        replaceExisting: replaceExistingSteps,
      });
      setWorkflow(res.workflow);
      setScannerStatusMsg({ type: 'success', text: `Successfully imported ${res.importedCount} step(s) into workflow!` });
      setTimeout(() => {
        setIsScannerModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to import endpoints:', err);
      setScannerStatusMsg({ type: 'error', text: err?.response?.data?.error || err.message || 'Failed to import endpoints' });
    } finally {
      setIsImportingSteps(false);
    }
  };

  const handleFetchGithubRepos = async () => {
    if (!githubUserOrToken.trim()) {
      setRepoFetchError('Please enter a GitHub Username or Personal Access Token');
      return;
    }
    try {
      setIsFetchingRepos(true);
      setRepoFetchError(null);
      const isToken =
        githubUserOrToken.startsWith('ghp_') ||
        githubUserOrToken.startsWith('github_pat_') ||
        githubUserOrToken.length > 25;
      const res = await fetchGithubRepos(
        isToken ? { token: githubUserOrToken.trim() } : { username: githubUserOrToken.trim() }
      );
      setFetchedRepos(res.repos || []);
      if (res.repos.length === 0) {
        setRepoFetchError('No repositories found for this account/token');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRepoFetchError(err.message);
      } else {
        setRepoFetchError('Failed to fetch repositories from GitHub');
      }
    } finally {
      setIsFetchingRepos(false);
    }
  };

  const handleSelectRepo = (repo: IGithubRepoItem) => {
    setGithubRepo(repo.full_name);
    setGithubBranch(repo.default_branch || 'main');
    setGithubEnabled(true);
  };

  const handleAutoCreateWebhookOnGitHub = async () => {
    if (!githubRepo || !githubUserOrToken) {
      setAutoWebhookMsg('❌ Select a repository and enter a GitHub Access Token first');
      return;
    }
    const webhookUrl = getBackendWebhookUrl(githubSecretToken || workflow?.githubSecretToken || '');
    try {
      setIsCreatingAutoWebhook(true);
      setAutoWebhookMsg(null);
      const res = await autoCreateGithubWebhook({
        repoFullName: githubRepo,
        token: githubUserOrToken.trim(),
        webhookUrl,
      });
      setAutoWebhookMsg(`🎉 ${res.message}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAutoWebhookMsg(`❌ ${err.message}`);
      } else {
        setAutoWebhookMsg('❌ Failed to auto-create webhook');
      }
    } finally {
      setIsCreatingAutoWebhook(false);
    }
  };

  // Listen for real OAuth Popup Callback redirects (via postMessage from oauth-callback)
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'WAKEUP_OAUTH_SUCCESS') {
        const { payload, token, email } = event.data;
        const capturedToken = token || payload.token || payload.access_token || payload.id_token || 'captured_oauth_token';
        const capturedEmail = email || payload.email || 'user@example.com';

        setOauthSelectedAccount(capturedEmail);

        if (workflow && workflow.steps[activeStepIndex]) {
          const targetStep = workflow.steps[activeStepIndex];
          const updatedBody = JSON.stringify(
            {
              email: capturedEmail,
              provider: 'google',
              token: capturedToken,
              callbackParams: payload,
            },
            null,
            2
          );

          updateCurrentStep({
            bodyPayload: updatedBody,
            extractVariables: [
              ...(targetStep.extractVariables || []).filter((v) => v.varName !== 'authToken'),
              { jsonPath: 'token', varName: 'authToken' },
            ],
          });
        }

        setTimeout(() => {
          setIsOAuthPopupOpen(false);
        }, 1200);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [workflow, activeStepIndex]);

  // Real-time Socket.IO Telemetry Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [stepLogs, setStepLogs] = useState<IStepTelemetryForPDF[]>([]);
  const [executionSummary, setExecutionSummary] = useState<IWorkflowRunSummaryForPDF | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const res = await fetchWorkflowById(workflowId);
      setWorkflow(res.workflow);
      setGithubEnabled(res.workflow.githubEnabled || false);
      setGithubRepo(res.workflow.githubRepo || '');
      setGithubBranch(res.workflow.githubBranch || 'main');
      setGithubSecretToken(res.workflow.githubSecretToken || '');
      setNotificationEmail(res.workflow.notificationEmail || '');
    } catch (err) {
      console.error('Failed to load workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId]);

  // Connect to Socket.IO backend for live telemetry streaming
  useEffect(() => {
    const socket = io(API_SOCKET_URL);
    socketRef.current = socket;

    socket.emit('join:workflow', workflowId);

    socket.on('workflow:started', () => {
      setIsRunning(true);
      setShowConsole(true);
      setIsReportModalOpen(false);
      setStepLogs([]);
      setExecutionSummary(null);
    });

    socket.on('workflow:step_completed', (telemetry: IStepTelemetryForPDF) => {
      setStepLogs((prev) => [...prev, telemetry]);
    });

    socket.on('workflow:finished', (finalData) => {
      setIsRunning(false);
      const pdfSummary: IWorkflowRunSummaryForPDF = {
        workflowName: workflow?.name || 'API Workflow',
        startedAt: new Date(Date.now() - (finalData.totalTimeMs || 0)).toISOString(),
        finishedAt: finalData.finishedAt,
        totalTimeMs: finalData.totalTimeMs,
        totalSteps: finalData.totalSteps,
        successSteps: finalData.successSteps,
        failedSteps: finalData.failedSteps,
        overallStatus: finalData.overallStatus,
        steps: finalData.logs || [],
      };
      setExecutionSummary(pdfSummary);
    });

    return () => {
      socket.disconnect();
    };
  }, [workflowId, workflow?.name]);

  const handleSaveWorkflow = async () => {
    if (!workflow) return;
    try {
      setSaving(true);
      const res = await updateWorkflow(workflow._id, {
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps,
        githubEnabled,
        githubRepo,
        githubBranch,
        notificationEmail,
      });
      setWorkflow(res.workflow);
    } catch (err) {
      console.error('Failed to save workflow:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGithubSettings = async () => {
    if (!workflow) return;
    try {
      setSaving(true);
      const res = await updateWorkflow(workflow._id, {
        githubEnabled,
        githubRepo,
        githubBranch,
        notificationEmail,
      });
      setWorkflow(res.workflow);
      setIsGithubModalOpen(false);
    } catch (err) {
      console.error('Failed to save GitHub settings:', err);
    } finally {
      setSaving(false);
    }
  };


  const handleSimulateGitPush = async () => {
    if (!workflow) return;
    try {
      setIsSimulatingPush(true);
      setPushSimResult(null);
      const res = await triggerTestGithubPush(workflow._id);
      setPushSimResult(`✅ ${res.message}! ${res.triggeredBy}`);
      loadWorkflow();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPushSimResult(`❌ Failed: ${err.message}`);
      } else {
        setPushSimResult('❌ Failed to simulate push event');
      }
    } finally {
      setIsSimulatingPush(false);
    }
  };

  const handleOpenPreflight = () => {
    setIsPreflightOpen(true);
  };

  const handleStartWorkflowRun = async () => {
    await handleSaveWorkflow();
    setIsPreflightOpen(false);
    router.push(`/workflows/${workflowId}/report`);
  };

  // Test Single Step Independently
  const handleTestSingleStep = async () => {
    if (!workflow || !workflow.steps[activeStepIndex]) return;
    try {
      setIsSingleTesting(true);
      setSingleTestResult(null);
      const targetStep = workflow.steps[activeStepIndex];
      const result = await testSingleWorkflowStep(targetStep);
      setSingleTestResult(result);
    } catch (err) {
      console.error('Failed to test single step:', err);
    } finally {
      setIsSingleTesting(false);
    }
  };

  const handleExportWorkflowJSON = () => {
    if (!workflow) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(workflow, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Workflow_${workflow.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleAddStep = () => {
    if (!workflow) return;
    
    const hasPreviousCookieCapture = workflow.steps.some((s) => s.captureCookies !== false);

    const newStep: IWorkflowStepData = {
      stepId: `step-${Date.now()}`,
      name: `Step ${workflow.steps.length + 1}: New Request`,
      url: 'https://httpbin.org/get',
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      queryParams: {},
      bodyPayload: '',
      expectedStatusCode: 200,
      captureCookies: true,
      carryCookies: hasPreviousCookieCapture,
      skipped: false,
      extractVariables: [],
    };

    const updatedSteps = [...workflow.steps, newStep];
    setWorkflow({ ...workflow, steps: updatedSteps });
    setActiveStepIndex(updatedSteps.length - 1);
  };

  const handleInsertAuthPreset = (preset: {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers: Record<string, string>;
    bodyPayload: string;
    expectedStatusCode?: number;
    extractVariables?: IWorkflowVariableExtract[];
  }) => {
    if (!workflow) return;

    const newStep: IWorkflowStepData = {
      stepId: `step-${Date.now()}`,
      name: preset.name,
      url: preset.url,
      method: preset.method,
      headers: preset.headers,
      queryParams: {},
      bodyPayload: preset.bodyPayload,
      expectedStatusCode: preset.expectedStatusCode || 200,
      captureCookies: true,
      carryCookies: true,
      skipped: false,
      extractVariables: preset.extractVariables || [],
    };

    const updatedSteps = [...workflow.steps, newStep];
    setWorkflow({ ...workflow, steps: updatedSteps });
    setActiveStepIndex(updatedSteps.length - 1);
    setIsAuthModalOpen(false);
  };

  const handleCloneStep = (index: number) => {
    if (!workflow) return;
    const target = workflow.steps[index];
    const cloned: IWorkflowStepData = JSON.parse(JSON.stringify(target));
    cloned.stepId = `step-${Date.now()}`;
    cloned.name = `${cloned.name} (Copy)`;
    const updatedSteps = [...workflow.steps];
    updatedSteps.splice(index + 1, 0, cloned);
    setWorkflow({ ...workflow, steps: updatedSteps });
    setActiveStepIndex(index + 1);
  };

  const handleDeleteStep = (index: number) => {
    if (!workflow || workflow.steps.length <= 1) {
      alert('A workflow must have at least one step.');
      return;
    }
    const updatedSteps = workflow.steps.filter((_, i) => i !== index);
    setWorkflow({ ...workflow, steps: updatedSteps });
    if (activeStepIndex >= updatedSteps.length) {
      setActiveStepIndex(updatedSteps.length - 1);
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!workflow) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workflow.steps.length) return;
    const updatedSteps = [...workflow.steps];
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[newIndex];
    updatedSteps[newIndex] = temp;
    setWorkflow({ ...workflow, steps: updatedSteps });
    setActiveStepIndex(newIndex);
  };

  const updateCurrentStep = (fields: Partial<IWorkflowStepData>) => {
    if (!workflow || !workflow.steps[activeStepIndex]) return;
    
    let updatedSteps = [...workflow.steps];
    const updatedCurrent = {
      ...updatedSteps[activeStepIndex],
      ...fields,
    };
    updatedSteps[activeStepIndex] = updatedCurrent;

    if (fields.captureCookies === true) {
      updatedSteps = updatedSteps.map((step, idx) => {
        if (idx > activeStepIndex) {
          return { ...step, carryCookies: true };
        }
        return step;
      });
    }

    setWorkflow({ ...workflow, steps: updatedSteps });
  };

  const getMethodBadgeStyle = (method?: string) => {
    switch (method?.toUpperCase()) {
      case 'POST':
        return 'badge-post';
      case 'PUT':
        return 'badge-put';
      case 'DELETE':
        return 'badge-delete';
      default:
        return 'badge-get';
    }
  };

  if (loading || !workflow) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-2 text-rose-300 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-rose-400" /> Loading Workflow Builder Workspace...
        </div>
      </div>
    );
  }

  const currentStep = workflow.steps[activeStepIndex] || workflow.steps[0];
  const anyPreviousCookieCapture = workflow.steps.slice(0, activeStepIndex).some((s) => s.captureCookies !== false);

  // Extract all variables defined across all steps for auto-complete & tag highlighting
  const allExtractedVariables = workflow.steps.flatMap((s) => s.extractVariables || []);

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-mono flex flex-col p-3 sm:p-6 space-y-4">
      {/* Responsive Top Header Bar */}
      <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-900 pb-3">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/workflows')}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workflows
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] rounded-md font-bold flex-shrink-0">
              <Activity className="w-3.5 h-3.5 text-rose-400" /> WORKFLOW BUILDER
            </div>
            <input
              type="text"
              value={workflow.name}
              onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
              className="bg-transparent text-base sm:text-xl font-bold text-white tracking-wide border-b border-transparent hover:border-white/20 focus:border-rose-400 focus:outline-none px-1 rounded transition-colors"
            />
            <span className="px-2 py-0.5 bg-neutral-900 text-rose-300 text-[10px] rounded font-bold flex-shrink-0 border border-white/5">
              {workflow.steps.length} Steps
            </span>

            {/* Global Base URL Override Control */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBaseUrlPopoverOpen(!isBaseUrlPopoverOpen)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 text-[10px] rounded font-bold transition-all cursor-pointer border border-purple-500/30"
                title="Change Base URL across all workflow steps in 1 click"
              >
                <Globe className="w-3 h-3 text-purple-400" />
                <span className="truncate max-w-[130px]">Base URL: {globalBaseUrl}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isBaseUrlPopoverOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isBaseUrlPopoverOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsBaseUrlPopoverOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-72 bg-neutral-950 rounded-xl p-3 shadow-2xl z-30 font-mono text-xs space-y-3 border border-white/10 select-none"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-purple-400" /> Bulk Base URL Override
                        </span>
                        <span className="text-[9px] text-neutral-400">Frontend Only</span>
                      </div>

                      <p className="text-[10px] text-neutral-400 leading-relaxed">
                        Switch target server port or environment host across all {workflow.steps.length} workflow steps in 1 click:
                      </p>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={globalBaseUrl}
                          onChange={(e) => setGlobalBaseUrl(e.target.value)}
                          placeholder="e.g. http://localhost:5000"
                          className="w-full bg-neutral-900 text-xs font-mono text-emerald-400 px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-purple-400"
                        />

                        {/* Presets */}
                        <div className="flex flex-wrap gap-1">
                          {['http://localhost:3000', 'http://localhost:5000', 'http://localhost:8000', 'http://127.0.0.1:5001'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setGlobalBaseUrl(preset)}
                              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-purple-300 text-[9px] rounded font-bold transition-colors cursor-pointer border-none"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyBulkBaseUrl}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer border-none flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Apply to All {workflow.steps.length} Steps</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dropdown 1: Configs & Imports */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsConfigsMenuOpen(!isConfigsMenuOpen);
                setIsIntegrationsMenuOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-200 text-xs font-bold rounded-lg border-none transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Configs & Imports</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isConfigsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isConfigsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsConfigsMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-neutral-900 rounded-xl p-1.5 shadow-2xl z-30 font-mono text-xs space-y-1 border-none"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfigsMenuOpen(false);
                        setIsBaseUrlPopoverOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-purple-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-white font-bold flex items-center justify-between">
                          <span>Bulk Base URL Override</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 font-normal">Change target host/port across all steps</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsConfigsMenuOpen(false);
                        setIsAiSpecModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-rose-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold">Import via AI Agent (.md)</div>
                        <div className="text-[10px] text-neutral-400 font-normal">Generate steps from markdown spec file</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsConfigsMenuOpen(false);
                        handleOpenScanner();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-cyan-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <Code className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold">Scan Code Endpoints</div>
                        <div className="text-[10px] text-neutral-400 font-normal">Extract routes from GitHub or local files</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsConfigsMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-amber-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <Key className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold">Auth Step Presets</div>
                        <div className="text-[10px] text-neutral-400 font-normal">Insert OAuth / Bearer / JWT auth steps</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsConfigsMenuOpen(false);
                        handleExportWorkflowJSON();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-emerald-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold">Export Workflow JSON</div>
                        <div className="text-[10px] text-neutral-400 font-normal">Download workflow backup JSON file</div>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Dropdown 2: Integrations & Reports */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsIntegrationsMenuOpen(!isIntegrationsMenuOpen);
                setIsConfigsMenuOpen(false);
              }}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border-none transition-colors cursor-pointer ${
                workflow?.githubEnabled
                  ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-500/30'
                  : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              <span>Integrations & Reports</span>
              {workflow?.githubEnabled && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isIntegrationsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isIntegrationsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsIntegrationsMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-neutral-900 rounded-xl p-1.5 shadow-2xl z-30 font-mono text-xs space-y-1 border-none"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsIntegrationsMenuOpen(false);
                        handleOpenGithubModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-emerald-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold flex items-center gap-1.5">
                          GitHub Integration Center
                          {workflow?.githubEnabled ? (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono">ACTIVE</span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 bg-neutral-800 text-neutral-400 rounded font-mono">DISCONNECTED</span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-normal">Repo binding, webhooks, push tests & scanner</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsIntegrationsMenuOpen(false);
                        handleOpenHistory();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-purple-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <History className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold">Run Execution History</div>
                        <div className="text-[10px] text-neutral-400 font-normal">View past execution logs & commit triggers</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsIntegrationsMenuOpen(false);
                        router.push(`/workflows/${workflowId}/report`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-rose-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold">Execution Telemetry Report</div>
                        <div className="text-[10px] text-neutral-400 font-normal">View step timing, HTTP status & latency breakdown</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsIntegrationsMenuOpen(false);
                        setIsGuideOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-amber-300 font-bold flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white font-bold">cURL & SDK Integration Guide</div>
                        <div className="text-[10px] text-neutral-400 font-normal">cURL, Fetch & Python SDK code snippets</div>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Button 3: Save */}
          <button
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold rounded-lg border-none transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* Button 4: Run Workflow */}
          <button
            onClick={handleOpenPreflight}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg border-none transition-all shadow-lg cursor-pointer"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            )}
            <span>{isRunning ? 'Running Flow...' : 'Run Workflow'}</span>
          </button>
        </div>
      </div>

      {/* Context Variable Pills Bar */}
      {allExtractedVariables.length > 0 && (
        <div className="p-2.5 bg-neutral-950/60 rounded-lg border border-white/5 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-rose-400" /> Extracted Variables:
          </span>
          {allExtractedVariables.map((v, i) => (
            <span key={i} className="variable-pill text-[10px]">
              {`{{${v.varName}}}`}
            </span>
          ))}
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Sequence Steps List */}
        <div className="lg:col-span-4 bg-neutral-950/80 p-4 rounded-xl space-y-4 border border-white/10 shadow-xl flex flex-col">
          <div className="flex-shrink-0 flex items-center justify-between border-b border-neutral-900 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-400" /> Step Sequence
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2 py-1 rounded-md transition-colors font-bold cursor-pointer border-none"
                title="Insert Google / Supabase / GitHub Auth Step Helpers"
              >
                <Key className="w-3.5 h-3.5" /> Auth Helpers
              </button>
              <button
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 text-[11px] bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 px-2.5 py-1 rounded-md transition-colors font-bold cursor-pointer border-none"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {workflow.steps.map((step, idx) => {
              const isActive = idx === activeStepIndex;
              const isSkipped = step.skipped === true;
              return (
                <div
                  key={step.stepId}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 w-full overflow-hidden border ${
                    isActive
                      ? 'bg-neutral-900 text-white border-rose-500/50 shadow-md'
                      : isSkipped
                      ? 'bg-neutral-900/20 opacity-50 text-neutral-500 border-white/5'
                      : 'bg-neutral-900/40 hover:bg-neutral-900/80 text-neutral-400 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${getMethodBadgeStyle(step.method)}`}>
                      {step.method}
                    </span>
                    <span className={`text-xs truncate font-medium min-w-0 flex-1 ${isSkipped ? 'line-through' : ''}`}>
                      {step.name}
                    </span>
                    {isSkipped && (
                      <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 py-0.2 rounded font-bold flex-shrink-0">
                        SKIP
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 opacity-70 hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveStep(idx, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 hover:text-white disabled:opacity-20"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveStep(idx, 'down');
                      }}
                      disabled={idx === workflow.steps.length - 1}
                      className="p-1 hover:text-white disabled:opacity-20"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloneStep(idx);
                      }}
                      className="p-1 hover:text-white"
                      title="Clone Step"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStep(idx);
                      }}
                      className="p-1 hover:text-rose-400"
                      title="Delete Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Postman Inspector Workspace */}
        <div className="lg:col-span-8 bg-neutral-950/80 p-4 sm:p-6 rounded-xl space-y-4 border border-white/10 shadow-xl flex flex-col w-full min-w-0">
          {/* Step Header & URL Controls */}
          <div className="space-y-3 pb-3 border-b border-neutral-900 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <input
                type="text"
                value={currentStep.name}
                onChange={(e) => updateCurrentStep({ name: e.target.value })}
                className="bg-neutral-900 text-xs sm:text-sm font-bold text-white px-3 py-2 rounded-lg w-full sm:flex-1 border border-white/10 focus:outline-none focus:border-rose-400 min-w-0"
              />

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Interactive OAuth Login Popup Trigger (Disabled) */}
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900/60 text-neutral-500 font-bold text-xs rounded-lg border-none opacity-50 cursor-not-allowed whitespace-nowrap flex-shrink-0"
                  title="OAuth login is currently disabled"
                >
                  <Globe className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <span>OAuth Disabled</span>
                </button>

                {/* Single Step Test Button */}
                <button
                  onClick={handleTestSingleStep}
                  disabled={isSingleTesting}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs rounded-lg border-none transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
                >
                  {isSingleTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-300 flex-shrink-0" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-rose-300 fill-current flex-shrink-0" />
                  )}
                  <span>{isSingleTesting ? 'Testing...' : 'Test Step Now'}</span>
                </button>
              </div>
            </div>

            {/* HTTP Method & Endpoint URL Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <select
                  value={currentStep.method}
                  onChange={(e) => updateCurrentStep({ method: e.target.value as any })}
                  className="bg-neutral-900 text-rose-300 text-xs font-bold px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-rose-400 cursor-pointer flex-shrink-0"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="HEAD">HEAD</option>
                </select>

                <div className="relative w-full flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="http://localhost:5000/api/v1/endpoint"
                    value={currentStep.url}
                    onFocus={() => setIsUrlDropdownOpen(true)}
                    onChange={(e) => {
                      updateCurrentStep({ url: e.target.value });
                      setIsUrlDropdownOpen(true);
                    }}
                    className="w-full bg-neutral-900 text-xs text-white px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-rose-400 min-w-0 flex-1 font-mono"
                  />

                  {/* Interactive Sleek Autocomplete Overlay Dropdown */}
                  {isUrlDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsUrlDropdownOpen(false)} />
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-neutral-950/95 backdrop-blur-md rounded-xl p-2.5 shadow-2xl z-20 border border-white/10 space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                        <div className="text-[10px] text-neutral-400 font-bold px-1 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" /> Host & Endpoint Suggestions:
                          </span>
                          <span className="text-[9px] opacity-60">Click item to fill</span>
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap gap-1">
                          {['http://localhost:3000', 'http://localhost:5000', 'http://localhost:8000', '{{baseUrl}}'].map((host) => (
                            <button
                              key={host}
                              type="button"
                              onClick={() => {
                                const cleanHost = host.replace(/\/$/, '');
                                if (!currentStep.url || currentStep.url.startsWith('/')) {
                                  updateCurrentStep({ url: `${cleanHost}${currentStep.url.startsWith('/') ? '' : '/'}${currentStep.url}` });
                                } else {
                                  try {
                                    const urlObj = new URL(currentStep.url);
                                    updateCurrentStep({ url: `${cleanHost}${urlObj.pathname}${urlObj.search}` });
                                  } catch {
                                    const pathPart = currentStep.url.replace(/^https?:\/\/[^\/]+/, '');
                                    updateCurrentStep({ url: `${cleanHost}${pathPart.startsWith('/') ? '' : '/'}${pathPart}` });
                                  }
                                }
                                setIsUrlDropdownOpen(false);
                              }}
                              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-purple-300 rounded text-[10px] font-bold transition-colors cursor-pointer border-none"
                            >
                              {host}
                            </button>
                          ))}
                        </div>

                        {/* Scanned & AI Spec Endpoints */}
                        {scannedEndpoints.length > 0 && (
                          <div className="space-y-1 pt-1.5 border-t border-neutral-900">
                            {scannedEndpoints
                              .filter((ep) => !currentStep.url || ep.path.toLowerCase().includes(currentStep.url.toLowerCase()) || ep.method.toLowerCase().includes(currentStep.url.toLowerCase()))
                              .slice(0, 10)
                              .map((ep, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    let host = 'http://localhost:5000';
                                    try {
                                      if (currentStep.url && currentStep.url.startsWith('http')) {
                                        host = new URL(currentStep.url).origin;
                                      }
                                    } catch {}
                                    const path = ep.path.startsWith('/') ? ep.path : `/${ep.path}`;
                                    updateCurrentStep({
                                      method: ep.method,
                                      url: `${host}${path}`,
                                      bodyPayload: ep.suggestedBody || currentStep.bodyPayload,
                                    });
                                    setIsUrlDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-neutral-900 rounded-lg flex items-center justify-between transition-colors text-[11px] cursor-pointer border-none"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      ep.method === 'POST' ? 'bg-amber-950 text-amber-300' :
                                      ep.method === 'PUT' ? 'bg-sky-950 text-sky-300' :
                                      ep.method === 'DELETE' ? 'bg-rose-950 text-rose-300' :
                                      'bg-emerald-950 text-emerald-400'
                                    }`}>
                                      {ep.method}
                                    </span>
                                    <span className="text-white font-bold">{ep.path}</span>
                                  </div>
                                  <span className="text-[10px] text-neutral-400">{ep.framework || 'Route'}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-400 whitespace-nowrap justify-between sm:justify-end flex-shrink-0 pt-1 sm:pt-0">
                <span>Exp Status:</span>
                <input
                  type="number"
                  value={currentStep.expectedStatusCode || 200}
                  onChange={(e) =>
                    updateCurrentStep({ expectedStatusCode: parseInt(e.target.value) || 200 })
                  }
                  className="w-16 bg-neutral-900 text-rose-300 text-center py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-rose-400 font-bold text-xs"
                />
              </div>
            </div>

            {/* AI Codebase Suggestions & Upgrade Banner */}
            {aiSuggestions.length > 0 && (
              <div className="p-3.5 bg-amber-950/40 rounded-xl space-y-2 border-none font-mono text-xs my-2 select-none">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> AI Codebase Insights & System Upgrades ({aiSuggestions.length})
                  </span>
                  <button onClick={() => setAiSuggestions([])} className="text-[10px] text-neutral-400 hover:text-white cursor-pointer">
                    Dismiss ✕
                  </button>
                </div>
                <div className="space-y-1 text-[11px] text-neutral-300">
                  {aiSuggestions.map((sug, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{sug}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Standardized API Response Telemetry Drawer */}
          {singleTestResult && (
            <ApiResponseDrawer
              result={{
                stepId: (singleTestResult as any).stepId,
                stepName: singleTestResult.stepName,
                url: singleTestResult.url,
                method: singleTestResult.method,
                status: singleTestResult.status as any,
                statusCode: singleTestResult.statusCode,
                latencyMs: singleTestResult.latencyMs,
                errorMessage: singleTestResult.errorMessage,
                responseBody: singleTestResult.responseBody,
                responseSnippet: (singleTestResult as any).responseSnippet,
                cookies: singleTestResult.capturedCookies,
                extractedVars: singleTestResult.extractedVars,
                executionSource: singleTestResult.url?.includes('localhost') || singleTestResult.url?.includes('127.0.0.1') ? 'browser' : 'cloud',
                timestamp: new Date().toLocaleTimeString(),
              }}
              title={`Step Test Telemetry: ${workflow?.steps[activeStepIndex]?.name || 'Request'}`}
              onClose={() => setSingleTestResult(null)}
            />
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-2 pb-2 border-b border-neutral-900 text-xs overflow-x-auto flex-nowrap scrollbar-thin w-full">
            <button
              onClick={() => setActiveTab('body')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer ${
                activeTab === 'body'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5 flex-shrink-0" /> Body Payload
            </button>
            <button
              onClick={() => setActiveTab('params')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer ${
                activeTab === 'params'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" /> Params
            </button>
            <button
              onClick={() => setActiveTab('headers')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer ${
                activeTab === 'headers'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5 flex-shrink-0" /> Headers
            </button>
            <button
              onClick={() => setActiveTab('cookies')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer ${
                activeTab === 'cookies'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Cookie className="w-3.5 h-3.5 flex-shrink-0" /> Cookies & Carry
            </button>
            <button
              onClick={() => setActiveTab('variables')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap text-xs cursor-pointer ${
                activeTab === 'variables'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 flex-shrink-0" /> Extract Variables
            </button>
          </div>

          {/* Tab Content View */}
          <div className="space-y-4 pt-2 w-full">
            {/* Tab 1: JSON Body Payload */}
            {activeTab === 'body' && (
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
                  <span>JSON Request Body (supports <span className="variable-pill text-[10px]">{"{{userJwt}}"}</span> variables)</span>
                  <button
                    onClick={() =>
                      updateCurrentStep({
                        bodyPayload: JSON.stringify({ email: 'user@example.com', pin: '1234' }, null, 2),
                      })
                    }
                    className="text-rose-300 hover:underline text-[11px]"
                  >
                    Insert Example JSON
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={currentStep.bodyPayload || ''}
                  onChange={(e) => updateCurrentStep({ bodyPayload: e.target.value })}
                  placeholder='{\n  "email": "user@example.com",\n  "token": "{{authToken}}"\n}'
                  className="w-full bg-neutral-900 text-xs font-mono text-emerald-400 p-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-rose-400 leading-relaxed min-h-[220px] sm:min-h-[280px]"
                />
              </div>
            )}

            {/* Tab 2: Query Params Editor */}
            {activeTab === 'params' && (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
                  <span>URL Query Parameters (`?key=value`)</span>
                  <button
                    onClick={() => {
                      const existing = currentStep.queryParams || {};
                      updateCurrentStep({
                        queryParams: { ...existing, 'paramKey': 'paramVal' },
                      });
                    }}
                    className="text-rose-300 hover:underline text-[11px]"
                  >
                    + Add Query Param
                  </button>
                </div>

                {Object.entries(currentStep.queryParams || {}).length === 0 ? (
                  <div className="p-6 bg-neutral-900/50 rounded-xl text-center text-neutral-500 text-xs border border-white/5">
                    No query parameters defined. Click "+ Add Query Param" above to append URL parameters.
                  </div>
                ) : (
                  Object.entries(currentStep.queryParams || {}).map(([key, val], idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 sm:gap-2 items-center w-full">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          const copy = { ...currentStep.queryParams };
                          delete copy[key];
                          copy[newKey] = val;
                          updateCurrentStep({ queryParams: copy });
                        }}
                        placeholder="Key (e.g. page)"
                        className="col-span-5 bg-neutral-900 text-xs px-3 py-2 rounded-lg text-white border border-white/10 focus:outline-none focus:border-rose-400 min-w-0"
                      />
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          const copy = { ...currentStep.queryParams };
                          copy[key] = e.target.value;
                          updateCurrentStep({ queryParams: copy });
                        }}
                        placeholder="Value (e.g. 1)"
                        className="col-span-6 bg-neutral-900 text-xs px-3 py-2 rounded-lg text-white border border-white/10 focus:outline-none focus:border-rose-400 min-w-0"
                      />
                      <button
                        onClick={() => {
                          const copy = { ...currentStep.queryParams };
                          delete copy[key];
                          updateCurrentStep({ queryParams: copy });
                        }}
                        className="col-span-1 p-1.5 text-neutral-500 hover:text-rose-400 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Custom Headers */}
            {activeTab === 'headers' && (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
                  <span>Custom HTTP Request Headers</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const existing = currentStep.headers || {};
                        updateCurrentStep({
                          headers: { ...existing, Authorization: 'Bearer {{userJwt}}' },
                        });
                      }}
                      className="text-emerald-400 hover:underline text-[11px] font-bold"
                    >
                      + Quick Bearer Token
                    </button>
                    <button
                      onClick={() => {
                        const existing = currentStep.headers || {};
                        updateCurrentStep({
                          headers: { ...existing, 'Custom-Header': 'value' },
                        });
                      }}
                      className="text-rose-300 hover:underline text-[11px]"
                    >
                      + Add Header
                    </button>
                  </div>
                </div>

                {Object.entries(currentStep.headers || {}).map(([key, val], idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 sm:gap-2 items-center w-full">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        const copy = { ...currentStep.headers };
                        delete copy[key];
                        copy[newKey] = val;
                        updateCurrentStep({ headers: copy });
                      }}
                      placeholder="Header (e.g. Authorization)"
                      className="col-span-5 bg-neutral-900 text-xs px-3 py-2 rounded-lg text-white border border-white/10 focus:outline-none focus:border-rose-400 min-w-0"
                    />
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const copy = { ...currentStep.headers };
                        copy[key] = e.target.value;
                        updateCurrentStep({ headers: copy });
                      }}
                      placeholder="Value (e.g. Bearer {{userJwt}})"
                      className="col-span-6 bg-neutral-900 text-xs px-3 py-2 rounded-lg text-rose-300 border border-white/10 focus:outline-none focus:border-rose-400 min-w-0"
                    />
                    <button
                      onClick={() => {
                        const copy = { ...currentStep.headers };
                        delete copy[key];
                        updateCurrentStep({ headers: copy });
                      }}
                      className="col-span-1 p-1.5 text-neutral-500 hover:text-rose-400 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Cookie Jar Settings */}
            {activeTab === 'cookies' && (
              <div className="p-4 bg-neutral-900/90 rounded-xl border border-white/10 space-y-5 text-xs w-full">
                {anyPreviousCookieCapture && (
                  <div className="p-3 bg-rose-950/40 text-rose-300 rounded-lg border border-rose-500/20 flex items-center gap-2 text-[11px] font-bold">
                    <Sparkles className="w-4 h-4 text-rose-300 flex-shrink-0" />
                    Previous step captures cookies! Cookie carry is automatically enabled for this step.
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Cookie className="w-4 h-4 text-rose-400" /> Capture Cookies from Response
                    </span>
                    <p className="text-neutral-400 text-[11px]">
                      Automatically records `Set-Cookie` headers from this endpoint response into active execution jar.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentStep.captureCookies !== false}
                    onChange={(e) => updateCurrentStep({ captureCookies: e.target.checked })}
                    className="w-4.5 h-4.5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                  <div className="space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Database className="w-4 h-4 text-rose-400" /> Carry Cookies in Request Header
                    </span>
                    <p className="text-neutral-400 text-[11px]">
                      Appends all accumulated cookies from previous steps into `Cookie` request header.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentStep.carryCookies !== false}
                    onChange={(e) => updateCurrentStep({ carryCookies: e.target.checked })}
                    className="w-4.5 h-4.5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Tab 5: Variable Extraction */}
            {activeTab === 'variables' && (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
                  <span>Extract Response JSON Values into Context Variables</span>
                  <button
                    onClick={() => {
                      const list = currentStep.extractVariables || [];
                      updateCurrentStep({
                        extractVariables: [...list, { varName: 'userJwt', jsonPath: 'token' }],
                      });
                    }}
                    className="text-rose-300 hover:underline text-[11px]"
                  >
                    + Add Variable Extract Rule
                  </button>
                </div>

                {(currentStep.extractVariables || []).length === 0 ? (
                  <div className="p-6 bg-neutral-900/50 rounded-xl border border-white/5 text-center text-neutral-500 text-xs">
                    No extraction rules defined. Extract variables like `token` or `data.user.id` to pass into future steps as `{"{{userJwt}}"}`.
                  </div>
                ) : (
                  (currentStep.extractVariables || []).map((ext, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 sm:gap-2 items-center w-full">
                      <input
                        type="text"
                        value={ext.varName}
                        onChange={(e) => {
                          const list = [...(currentStep.extractVariables || [])];
                          list[idx].varName = e.target.value;
                          updateCurrentStep({ extractVariables: list });
                        }}
                        placeholder="Variable (e.g. userJwt)"
                        className="col-span-5 bg-neutral-900 text-xs px-3 py-2 rounded-lg text-rose-300 font-bold border border-white/10 focus:outline-none focus:border-rose-400 min-w-0"
                      />
                      <input
                        type="text"
                        value={ext.jsonPath}
                        onChange={(e) => {
                          const list = [...(currentStep.extractVariables || [])];
                          list[idx].jsonPath = e.target.value;
                          updateCurrentStep({ extractVariables: list });
                        }}
                        placeholder="JSON Path (e.g. token)"
                        className="col-span-6 bg-neutral-900 text-xs px-3 py-2 rounded-lg text-white border border-white/10 focus:outline-none focus:border-rose-400 min-w-0"
                      />
                      <button
                        onClick={() => {
                          const list = (currentStep.extractVariables || []).filter((_, i) => i !== idx);
                          updateCurrentStep({ extractVariables: list });
                        }}
                        className="col-span-1 p-1.5 text-neutral-500 hover:text-rose-400 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pre-Flight Run & Step Skipping Confirmation Modal */}
      <AnimatePresence>
        {isPreflightOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono text-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-950 p-6 rounded-xl max-w-lg w-full space-y-4 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-rose-400 fill-current" /> Confirm Execution & Step Preferences
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Select steps to include or skip (e.g. skip signup if user already exists).
                  </p>
                </div>
                <button onClick={() => setIsPreflightOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-neutral-900/60 rounded-lg border border-white/5 text-rose-300 text-[11px] font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-300 flex-shrink-0" />
                Tip: Uncheck steps like Signup if your user account is already created!
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {workflow.steps.map((step, idx) => {
                  const isIncluded = step.skipped !== true;
                  return (
                    <div
                      key={step.stepId}
                      onClick={() => {
                        const updated = [...workflow.steps];
                        updated[idx].skipped = isIncluded;
                        setWorkflow({ ...workflow, steps: updated });
                      }}
                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
                        isIncluded ? 'bg-neutral-900 border-white/10 text-white' : 'bg-neutral-900/40 border-white/5 text-neutral-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => {}}
                          className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                        />
                        <div>
                          <div className={`font-bold text-xs ${!isIncluded ? 'line-through' : ''}`}>
                            {step.name}
                          </div>
                          <div className="text-[10px] text-neutral-400">{step.method} • {step.url}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isIncluded ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {isIncluded ? 'RUN' : 'SKIP'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsPreflightOpen(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-lg border border-white/10 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartWorkflowRun}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg border-none font-bold shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Start Workflow Execution
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integration & OAuth Custom Endpoint Guide Modal */}
      <AnimatePresence>
        {isGuideOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono text-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-950 p-6 rounded-xl max-w-xl w-full space-y-4 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" /> OAuth & Custom Service Integration Guide
                </h3>
                <button onClick={() => setIsGuideOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 text-neutral-300 leading-relaxed">
                <p className="text-xs text-neutral-400">
                  How to test custom Google / GitHub OAuth endpoints like <code className="text-rose-300 font-bold">https://x.com/api/login-google</code> in the Flow Runner:
                </p>

                <div className="p-3 bg-neutral-900/90 rounded-lg space-y-2 border border-white/5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Configure OAuth API Request Step
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-neutral-400 space-y-1 pl-2">
                    <li>Method: <strong className="text-amber-400">POST</strong></li>
                    <li>URL: <code className="text-emerald-400">https://x.com/api/login-google</code></li>
                    <li>Headers: <code className="text-neutral-200">Content-Type: application/json</code></li>
                    <li>Body Payload: Pass test ID token or email: <code className="text-rose-300">&#123;&quot;idToken&quot;: &quot;test_token&quot;&#125;</code></li>
                  </ul>
                </div>

                <div className="p-3 bg-neutral-900/90 rounded-lg space-y-2 border border-white/5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Extract Context Variables into Token
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-neutral-400 space-y-1 pl-2">
                    <li>Go to <strong className="text-rose-300">Extract Variables</strong> tab on Step 1.</li>
                    <li>Variable Name: <code className="text-rose-300">userJwt</code></li>
                    <li>JSON Path: <code className="text-emerald-400">token</code> (or <code className="text-emerald-400">data.accessToken</code>)</li>
                  </ul>
                </div>

                <div className="p-3 bg-neutral-900/90 rounded-lg space-y-2 border border-white/5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Chain Token in Subsequent API Requests
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-neutral-400 space-y-1 pl-2">
                    <li>Add Step 2 (e.g. <code className="text-emerald-400">https://x.com/api/user/profile</code>).</li>
                    <li>Headers: Add <code className="text-rose-300">Authorization: Bearer {"{{userJwt}}"}</code>.</li>
                    <li>All subsequent requests will run authenticated as your OAuth user!</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(false)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg font-bold shadow-md cursor-pointer"
                >
                  Got It! Close Guide
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Predefined Auth Step Helpers Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono text-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-950 p-6 rounded-xl max-w-2xl w-full space-y-4 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" /> Predefined Authentication Step Library
                </h3>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-neutral-400 hover:text-white border-none bg-transparent cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                Select a standard auth preset to instantly append a pre-configured, best-practice authentication step with automatic token extraction:
              </p>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {/* Google OAuth Preset */}
                <div className="p-3.5 bg-neutral-900/80 rounded-xl space-y-2 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        Google OAuth 2.0
                      </span>
                      <span className="font-bold text-white text-xs">Google OAuth Token Sync Step</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Simulates frontend <code className="text-rose-300">signIn(&apos;google&apos;)</code>. Sends Google ID token to <code className="text-emerald-400">POST /api/auth/google</code> and extracts <code className="text-amber-300">authToken</code>.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleInsertAuthPreset({
                        name: 'Google OAuth Token Exchange',
                        method: 'POST',
                        url: 'https://your-api.com/api/auth/google',
                        headers: { 'Content-Type': 'application/json' },
                        bodyPayload: '{\n  "email": "user@gmail.com",\n  "name": "Google User",\n  "provider": "google",\n  "googleIdToken": "mock_google_id_token_xyz"\n}',
                        expectedStatusCode: 200,
                        extractVariables: [{ jsonPath: 'token', varName: 'authToken' }],
                      })
                    }
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border-none flex-shrink-0 cursor-pointer transition-colors"
                  >
                    + Insert Step
                  </button>
                </div>

                {/* Supabase Password Grant Preset */}
                <div className="p-3.5 bg-neutral-900/80 rounded-xl space-y-2 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Supabase Auth
                      </span>
                      <span className="font-bold text-white text-xs">Supabase Password Sign In</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Hits Supabase Auth REST API (<code className="text-emerald-400">POST /auth/v1/token?grant_type=password</code>) with <code className="text-rose-300">apikey</code> header and extracts <code className="text-amber-300">supabaseToken</code>.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleInsertAuthPreset({
                        name: 'Supabase Auth (Password Grant)',
                        method: 'POST',
                        url: 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/token?grant_type=password',
                        headers: {
                          'Content-Type': 'application/json',
                          apikey: 'YOUR_SUPABASE_ANON_KEY',
                        },
                        bodyPayload: '{\n  "email": "user@example.com",\n  "password": "YOUR_PASSWORD"\n}',
                        expectedStatusCode: 200,
                        extractVariables: [{ jsonPath: 'access_token', varName: 'supabaseToken' }],
                      })
                    }
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border-none flex-shrink-0 cursor-pointer transition-colors"
                  >
                    + Insert Step
                  </button>
                </div>

                {/* Supabase Session Sync Preset */}
                <div className="p-3.5 bg-neutral-900/80 rounded-xl space-y-2 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Supabase Sync
                      </span>
                      <span className="font-bold text-white text-xs">Supabase Session Backend Sync</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Forwards <code className="text-rose-300">&#123;&#123;supabaseToken&#125;&#125;</code> to your custom backend sync endpoint (<code className="text-emerald-400">POST /api/auth/supabase-sync</code>).
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleInsertAuthPreset({
                        name: 'Supabase Session Sync to Backend',
                        method: 'POST',
                        url: 'https://your-api.com/api/auth/supabase-sync',
                        headers: { 'Content-Type': 'application/json' },
                        bodyPayload: '{\n  "supabaseToken": "{{supabaseToken}}",\n  "provider": "supabase"\n}',
                        expectedStatusCode: 200,
                        extractVariables: [{ jsonPath: 'token', varName: 'authToken' }],
                      })
                    }
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border-none flex-shrink-0 cursor-pointer transition-colors"
                  >
                    + Insert Step
                  </button>
                </div>

                {/* GitHub OAuth Preset */}
                <div className="p-3.5 bg-neutral-900/80 rounded-xl space-y-2 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        GitHub OAuth
                      </span>
                      <span className="font-bold text-white text-xs">GitHub OAuth Code Exchange</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Exchanges a temporary OAuth code for access token via <code className="text-emerald-400">POST /api/auth/github</code> and extracts <code className="text-amber-300">githubToken</code>.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleInsertAuthPreset({
                        name: 'GitHub OAuth Code Exchange',
                        method: 'POST',
                        url: 'https://your-api.com/api/auth/github',
                        headers: { 'Content-Type': 'application/json' },
                        bodyPayload: '{\n  "code": "github_oauth_code_12345",\n  "state": "csrf_state_xyz"\n}',
                        expectedStatusCode: 200,
                        extractVariables: [{ jsonPath: 'access_token', varName: 'githubToken' }],
                      })
                    }
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border-none flex-shrink-0 cursor-pointer transition-colors"
                  >
                    + Insert Step
                  </button>
                </div>

                {/* Bearer Authorized Request Preset */}
                <div className="p-3.5 bg-neutral-900/80 rounded-xl space-y-2 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Bearer Token
                      </span>
                      <span className="font-bold text-white text-xs">Authenticated User Profile Request</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Standard authenticated API call carrying <code className="text-rose-300">Authorization: Bearer &#123;&#123;authToken&#125;&#125;</code> header.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleInsertAuthPreset({
                        name: 'Authenticated Profile API Request',
                        method: 'GET',
                        url: 'https://your-api.com/api/user/profile',
                        headers: {
                          Authorization: 'Bearer {{authToken}}',
                          Accept: 'application/json',
                        },
                        bodyPayload: '',
                        expectedStatusCode: 200,
                        extractVariables: [],
                      })
                    }
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border-none flex-shrink-0 cursor-pointer transition-colors"
                  >
                    + Insert Step
                  </button>
                </div>

                {/* Styra OPA Policy Decision Preset */}
                <div className="p-3.5 bg-neutral-900/80 rounded-xl space-y-2 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        Styra DAS / OPA
                      </span>
                      <span className="font-bold text-white text-xs">Styra OPA Policy Decision Evaluation</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Evaluates authorization policy decisions via Styra DAS or local OPA (<code className="text-emerald-400">POST /v1/data/app/authz/allow</code>) and extracts <code className="text-amber-300">isAllowed</code>.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleInsertAuthPreset({
                        name: 'Styra OPA Policy Evaluation',
                        method: 'POST',
                        url: 'https://YOUR_ORG.styra.com/v1/data/app/authz/allow',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: 'Bearer YOUR_STYRA_API_TOKEN',
                        },
                        bodyPayload: '{\n  "input": {\n    "user": {\n      "id": "user_123",\n      "roles": ["admin"]\n    },\n    "action": "READ",\n    "resource": "/api/documents/101"\n  }\n}',
                        expectedStatusCode: 200,
                        extractVariables: [{ jsonPath: 'result.allow', varName: 'isAllowed' }],
                      })
                    }
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border-none flex-shrink-0 cursor-pointer transition-colors"
                  >
                    + Insert Step
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-lg border border-white/10 font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Google / OAuth Login Screen Modal */}
      <AnimatePresence>
        {isOAuthPopupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono text-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-950 p-6 rounded-2xl max-w-md w-full space-y-4 border border-white/10 shadow-2xl relative overflow-hidden"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                    G
                  </div>
                  <h3 className="text-sm font-bold text-white">Google OAuth 2.0 Identity Server</h3>
                </div>
                <button
                  onClick={() => setIsOAuthPopupOpen(false)}
                  className="text-neutral-400 hover:text-white border-none bg-transparent cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Client App ID Input Configuration */}
              <div className="space-y-1.5 bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                  OAuth Client App ID (Client ID):
                </label>
                <input
                  type="text"
                  value={oauthAppId}
                  onChange={(e) => setOauthAppId(e.target.value)}
                  placeholder="e.g. 84920491-google-oauth.apps.googleusercontent.com"
                  className="w-full bg-black text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              {/* Real OAuth Web Page Redirect Launcher */}
              <div className="space-y-1.5 bg-neutral-900/60 p-3 rounded-xl border border-white/5">
                <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                  Real Application / Auth Page URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={realAuthUrl}
                    onChange={(e) => setRealAuthUrl(e.target.value)}
                    placeholder="e.g. http://localhost:3000/login"
                    className="flex-1 bg-black text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-400 font-mono min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const redirectCallback = `${window.location.origin}/workflows/oauth-callback`;
                      const targetUrl = realAuthUrl.includes('?')
                        ? `${realAuthUrl}&redirect_uri=${encodeURIComponent(redirectCallback)}`
                        : `${realAuthUrl}?redirect_uri=${encodeURIComponent(redirectCallback)}`;
                      window.open(targetUrl, 'WakeUpRealOAuthWindow', 'width=600,height=700,left=300,top=150');
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg border-none cursor-pointer flex-shrink-0 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Launch Real Window
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 pt-0.5">
                  Opens a real browser popup window. Upon login redirect to <code className="text-rose-300">/workflows/oauth-callback</code>, token will be automatically captured into step variable!
                </p>
              </div>

              {/* Interactive Google Sign-In Card (Simulating standard OAuth popup screen) */}
              <div className="bg-neutral-900/90 rounded-2xl p-5 border border-white/5 space-y-4 shadow-inner text-center">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Sign in with Google</h4>
                  <p className="text-[11px] text-neutral-400">
                    Choose an account to continue to your runtime app
                  </p>
                </div>

                {/* Account Selection Cards */}
                <div className="space-y-2 text-left">
                  {/* Account Option 1 */}
                  <button
                    onClick={() => {
                      const userEmail = 'ritikvermav5@gmail.com';
                      const userName = 'Ritik Verma';
                      const mockToken = `mock_google_id_token_${Date.now()}`;
                      
                      setOauthSelectedAccount(userEmail);
                      updateCurrentStep({
                        bodyPayload: JSON.stringify(
                          {
                            email: userEmail,
                            name: userName,
                            provider: 'google',
                            googleIdToken: mockToken,
                            clientId: oauthAppId,
                          },
                          null,
                          2
                        ),
                        extractVariables: [
                          ...(currentStep.extractVariables || []).filter((v) => v.varName !== 'authToken'),
                          { jsonPath: 'token', varName: 'authToken' },
                        ],
                      });
                      setTimeout(() => {
                        setIsOAuthPopupOpen(false);
                      }, 1200);
                    }}
                    className="w-full p-3 bg-neutral-950 hover:bg-neutral-800/80 rounded-xl border border-white/5 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-600/30 text-rose-300 font-bold flex items-center justify-center text-xs">
                        RV
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                          Ritik Verma
                        </div>
                        <div className="text-[10px] text-neutral-400">ritikvermav5@gmail.com</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* Account Option 2 */}
                  <button
                    onClick={() => {
                      const userEmail = 'dev.user@gmail.com';
                      const userName = 'Developer User';
                      const mockToken = `mock_google_id_token_${Date.now()}`;

                      setOauthSelectedAccount(userEmail);
                      updateCurrentStep({
                        bodyPayload: JSON.stringify(
                          {
                            email: userEmail,
                            name: userName,
                            provider: 'google',
                            googleIdToken: mockToken,
                            clientId: oauthAppId,
                          },
                          null,
                          2
                        ),
                        extractVariables: [
                          ...(currentStep.extractVariables || []).filter((v) => v.varName !== 'authToken'),
                          { jsonPath: 'token', varName: 'authToken' },
                        ],
                      });
                      setTimeout(() => {
                        setIsOAuthPopupOpen(false);
                      }, 1200);
                    }}
                    className="w-full p-3 bg-neutral-950 hover:bg-neutral-800/80 rounded-xl border border-white/5 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center text-xs">
                        DU
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                          Developer User
                        </div>
                        <div className="text-[10px] text-neutral-400">dev.user@gmail.com</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Status / Success Notification */}
                {oauthSelectedAccount && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Selected {oauthSelectedAccount}! Credentials & Token bound to step.</span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-neutral-400">
                  App ID: <code className="text-blue-300">{oauthAppId.slice(0, 20)}...</code>
                </span>
                <button
                  type="button"
                  onClick={() => setIsOAuthPopupOpen(false)}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-lg border border-white/10 font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* GitHub A-to-Z Integration Control Center Modal */}
        {isGithubModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono text-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-950 p-6 rounded-2xl max-w-4xl w-full space-y-5 border-none shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-900 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold shadow-lg">
                    <GitBranch className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-wide">
                        GitHub Integration Center (A-to-Z)
                      </h3>
                      {githubEnabled ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-bold font-mono border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVE & CONNECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-neutral-900 text-neutral-400 text-[10px] rounded font-bold font-mono border border-neutral-800">
                          DISCONNECTED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400 block pt-0.5">
                      Repo binding, automated webhooks, push test simulations, endpoint scanner & commit audit logs
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGithubModalOpen(false)}
                  className="text-neutral-400 hover:text-white border-none bg-transparent cursor-pointer p-1 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-Tab Navigation Header */}
              <div className="flex items-center gap-2 border-b border-neutral-900 pb-2 overflow-x-auto shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setGithubModalTab('config')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                    githubModalTab === 'config'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Repo & Webhook Config</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGithubModalTab('simulation')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                    githubModalTab === 'simulation'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Push Simulation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGithubModalTab('scanner')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                    githubModalTab === 'scanner'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 text-purple-400" />
                  <span>Repo Endpoint Scanner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGithubModalTab('history');
                    loadPastRuns();
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                    githubModalTab === 'history'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Commit Audit Logs</span>
                </button>
              </div>

              {/* Modal Body Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* TAB 1: Repo & Webhook Config */}
                {githubModalTab === 'config' && (
                  <div className="space-y-4">
                    {/* Enable Switch Toggle Banner */}
                    <div className="p-4 bg-neutral-900 rounded-xl flex items-center justify-between border-none select-none">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-400" /> Enable GitHub Push Trigger
                        </span>
                        <span className="text-[11px] text-neutral-400 block">
                          Automatically run this flow whenever code is pushed to your connected repository branch
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGithubEnabled(!githubEnabled)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors border-none cursor-pointer ${
                          githubEnabled ? 'bg-emerald-600' : 'bg-neutral-800'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            githubEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 1-Click GitHub App Zero-Config Card (Vercel / Render Style) */}
                    <div className="p-4 bg-gradient-to-r from-purple-950/40 via-neutral-900 to-rose-950/40 rounded-xl border-none space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                            <GitBranch className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                              1-Click GitHub App Integration <span className="px-1.5 py-0.2 bg-purple-900/60 text-purple-300 text-[9px] rounded font-mono">VERCEL / RENDER STYLE</span>
                            </span>
                            <span className="text-[11px] text-neutral-400 block">
                              Zero configuration — no tokens, secrets, or manual Webhook URL copying needed
                            </span>
                          </div>
                        </div>
                        {workflow?.githubAppConnected ? (
                          <span className="px-3 py-1.5 bg-emerald-950 text-emerald-300 border-none text-[11px] font-bold rounded-lg font-mono flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> CONNECTED VIA GITHUB APP
                          </span>
                        ) : (
                          <a
                            href={`https://github.com/apps/${githubAppConfig?.appName || 'wakeup-runner'}/installations/new?state=${workflowId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-xs rounded-lg border-none cursor-pointer flex items-center gap-1.5 transition-all shadow-lg shrink-0 text-decoration-none"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>⚡ Connect GitHub App</span>
                          </a>
                        )}
                      </div>
                      {workflow?.githubInstallationId && (
                        <div className="text-[10px] font-mono text-purple-300 bg-black/60 p-2.5 rounded-lg flex items-center justify-between">
                          <span>INSTALLATION ID: {workflow.githubInstallationId}</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> AUTOMATIC PUSH TRACKING ACTIVE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2-Column Main Section Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Column 1: Automatic Repository Fetcher & Selector */}
                      <div className="p-4 bg-neutral-900 rounded-xl space-y-3 border-none flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Repository Selector
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">1-CLICK BIND</span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase block">
                              GitHub Username or Personal Access Token (PAT)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={githubUserOrToken}
                                onChange={(e) => setGithubUserOrToken(e.target.value)}
                                placeholder="Username or ghp_xxx..."
                                className="flex-1 px-3 py-2 bg-black border-none rounded-lg text-white text-xs outline-none font-mono min-w-0"
                              />
                              <button
                                type="button"
                                onClick={handleFetchGithubRepos}
                                disabled={isFetchingRepos || !githubUserOrToken.trim()}
                                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg border-none cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                              >
                                {isFetchingRepos ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Search className="w-3.5 h-3.5" />
                                )}
                                Fetch
                              </button>
                            </div>
                            <div className="flex items-center justify-between pt-1 text-[10px]">
                              <span className="text-neutral-400">PAT supports private repos</span>
                              <a
                                href="https://github.com/settings/tokens/new?description=WakeUp+Flow+Runner&scopes=repo,admin:repo_hook"
                                target="_blank"
                                rel="noreferrer"
                                className="text-rose-300 font-bold hover:underline flex items-center gap-1"
                              >
                                <Key className="w-3 h-3 text-rose-400" /> Create Token
                              </a>
                            </div>
                          </div>

                          {repoFetchError && (
                            <div className="p-2.5 bg-rose-950/80 text-rose-300 rounded-lg text-xs font-mono font-bold">
                              {repoFetchError}
                            </div>
                          )}

                          {/* Repositories List */}
                          {fetchedRepos.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-neutral-300 uppercase font-bold">
                                  Select Repository ({fetchedRepos.length}):
                                </span>
                                <input
                                  type="text"
                                  placeholder="Filter..."
                                  value={repoSearchQuery}
                                  onChange={(e) => setRepoSearchQuery(e.target.value)}
                                  className="px-2 py-1 bg-black text-white text-[10px] rounded border-none outline-none font-mono w-28"
                                />
                              </div>

                              <div className="max-h-40 overflow-y-auto space-y-1.5 p-1.5 bg-black rounded-lg">
                                {fetchedRepos
                                  .filter(
                                    (r) =>
                                      !repoSearchQuery ||
                                      r.full_name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
                                      r.description?.toLowerCase().includes(repoSearchQuery.toLowerCase())
                                  )
                                  .map((r) => {
                                    const isSelected = githubRepo.toLowerCase() === r.full_name.toLowerCase();
                                    return (
                                      <div
                                        key={r.id}
                                        onClick={() => handleSelectRepo(r)}
                                        className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                          isSelected
                                            ? 'bg-rose-950 text-rose-300'
                                            : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300'
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-white truncate">{r.full_name}</span>
                                            {r.private ? (
                                              <span className="px-1 py-0.2 text-[9px] bg-neutral-950 text-amber-400 rounded font-mono">
                                                Private
                                              </span>
                                            ) : (
                                              <span className="px-1 py-0.2 text-[9px] bg-neutral-950 text-emerald-400 rounded font-mono">
                                                Public
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-rose-600 text-white' : 'bg-neutral-800'}`}>
                                          {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 1-Click Auto-Create Webhook on GitHub Button */}
                        {githubUserOrToken.length > 20 && (
                          <div className="pt-2 border-t border-neutral-850 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={handleAutoCreateWebhookOnGitHub}
                              disabled={isCreatingAutoWebhook || !githubRepo}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isCreatingAutoWebhook ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Zap className="w-3.5 h-3.5" />
                              )}
                              Auto-Create Webhook on GitHub API
                            </button>
                            {autoWebhookMsg && (
                              <div className="p-2 bg-black text-xs font-mono font-bold text-emerald-300 rounded text-center">
                                {autoWebhookMsg}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Column 2: Connected Repository & Branch Details + Webhook Payload URL */}
                      <div className="space-y-4 flex flex-col justify-between">
                        <div className="space-y-3 bg-neutral-900 p-4 rounded-xl">
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-300 uppercase font-bold block">
                              Connected Repository (owner/repo)
                            </label>
                            <input
                              type="text"
                              value={githubRepo}
                              onChange={(e) => setGithubRepo(e.target.value)}
                              placeholder="e.g. ritik125V/WakeUp"
                              className="w-full px-3 py-2 bg-black border-none rounded-lg text-white text-xs outline-none font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-300 uppercase font-bold block">
                              Target Branch
                            </label>
                            <input
                              type="text"
                              value={githubBranch}
                              onChange={(e) => setGithubBranch(e.target.value)}
                              placeholder="main"
                              className="w-full px-3 py-2 bg-black border-none rounded-lg text-white text-xs outline-none font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-rose-300 uppercase font-bold block flex items-center gap-1">
                              <Key className="w-3 h-3 text-rose-400" /> Report Recipient Email (Nodemailer)
                            </label>
                            <input
                              type="email"
                              value={notificationEmail}
                              onChange={(e) => setNotificationEmail(e.target.value)}
                              placeholder="e.g. dev-alerts@company.com"
                              className="w-full px-3 py-2 bg-black border-none rounded-lg text-white text-xs outline-none font-mono"
                            />
                            <span className="text-[10px] text-neutral-400 block pt-0.5">
                              Nodemailer will send execution reports to this email on git commits.
                            </span>
                          </div>
                        </div>

                        {/* Webhook Payload URL Box */}
                        <div className="p-4 bg-neutral-900 rounded-xl space-y-2 border-none">
                          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-300">
                            <span>GITHUB WEBHOOK PAYLOAD URL</span>
                            <span className="text-emerald-400">JSON</span>
                          </div>

                          <div className="flex items-center gap-2 bg-black p-2 rounded-lg border-none">
                            <code className="text-[11px] text-rose-300 truncate flex-1 font-mono">
                              {getBackendWebhookUrl(githubSecretToken || workflow?.githubSecretToken || 'secret-token')}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                const url = getBackendWebhookUrl(githubSecretToken || workflow?.githubSecretToken || '');
                                navigator.clipboard.writeText(url);
                                setCopiedWebhookUrl(true);
                                setTimeout(() => setCopiedWebhookUrl(false), 2000);
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs border-none cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              {copiedWebhookUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedWebhookUrl ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Setup Guide */}
                    <div className="p-4 bg-neutral-900 rounded-xl space-y-2 border-none">
                      <span className="text-xs font-bold text-white block">
                        Quick GitHub Webhook Setup Guide
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-300 leading-relaxed">
                        <li>
                          Open GitHub Repo $\rightarrow$ <strong>Settings</strong> $\rightarrow$ <strong>Webhooks</strong> $\rightarrow$ <strong>Add webhook</strong>.
                        </li>
                        <li>Paste the <strong>Payload URL</strong> copied above.</li>
                        <li>Set <strong>Content type</strong> to <code className="text-emerald-400">application/json</code> and select <strong>Just the push event</strong>.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* TAB 2: Push Simulation */}
                {githubModalTab === 'simulation' && (
                  <div className="space-y-4">
                    <div className="p-5 bg-neutral-900 rounded-xl space-y-3 border-none">
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Simulate Git Push Webhook Event
                      </div>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        Test your workflow execution against simulated Git push events in real-time. This sends a mock GitHub push payload to verify step execution without pushing commits to GitHub.
                      </p>

                      <div className="p-3 bg-black rounded-lg space-y-2 font-mono text-xs border-none">
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Simulated Repo:</span>
                          <span className="text-white font-bold">{githubRepo || 'ritik125V/WakeUp'}</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Target Branch:</span>
                          <span className="text-emerald-400 font-bold">{githubBranch || 'main'}</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Event Payload:</span>
                          <span className="text-purple-300 font-bold">ref: refs/heads/{githubBranch || 'main'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSimulateGitPush}
                        disabled={isSimulatingPush}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
                      >
                        {isSimulatingPush ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Zap className="w-4 h-4 fill-current text-white" />
                        )}
                        Dispatch Git Push Webhook Simulation
                      </button>

                      {pushSimResult && (
                        <div className="p-4 bg-black rounded-xl space-y-2 border-none">
                          <span className="text-xs font-bold text-emerald-400 block">Simulation Telemetry Output:</span>
                          <pre className="text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed">
                            {pushSimResult}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Repo Endpoint Scanner */}
                {githubModalTab === 'scanner' && (
                  <div className="space-y-4">
                    <div className="p-5 bg-neutral-900 rounded-xl space-y-3 border-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                          <Code className="w-4 h-4 text-purple-400" />
                          GitHub Repository Code Scanner
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">AUTOMATED ROUTE EXTRACTION</span>
                      </div>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        Scan all route files in <strong>{githubRepo || 'connected repository'}</strong> to automatically extract API endpoints (Express, NestJS, FastAPI, Next.js) and import them into this workflow.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setIsGithubModalOpen(false);
                          handleOpenScanner();
                        }}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                        Launch Code Endpoint Scanner for {githubRepo || 'Connected Repo'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: Commit Execution Audit & Live Webhook Delivery Hits */}
                {githubModalTab === 'history' && (
                  <div className="space-y-4">
                    {/* Section 1: Workflow Execution History */}
                    <div className="p-4 bg-neutral-900 rounded-xl space-y-3 border-none">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <History className="w-4 h-4 text-cyan-400" /> Workflow Execution Runs ({pastRuns.length})
                        </span>
                        <button
                          type="button"
                          onClick={loadPastRuns}
                          disabled={loadingPastRuns}
                          className="px-2.5 py-1 bg-black text-neutral-300 hover:text-white rounded text-[10px] font-bold border-none cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingPastRuns ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>

                      {loadingPastRuns ? (
                        <div className="py-8 text-center text-neutral-400 font-mono text-xs flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading past execution runs...
                        </div>
                      ) : pastRuns.length === 0 ? (
                        <div className="py-6 text-center text-neutral-400 font-mono text-xs space-y-1">
                          <div>No past execution runs recorded yet.</div>
                          <div className="text-[10px] text-neutral-400">Trigger a push simulation or manual run to generate logs.</div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {pastRuns.map((run) => (
                            <div
                              key={run._id}
                              className="p-3 bg-black rounded-lg border-none flex items-center justify-between gap-3 text-xs font-mono"
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    run.status === 'PASSED'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}>
                                    {run.status}
                                  </span>
                                  <span className="text-neutral-300 font-bold">
                                    {run.triggeredBy || 'Manual Run'}
                                  </span>
                                  {run.commitHash && (
                                    <span className="text-[10px] text-purple-300 font-mono">
                                      #{run.commitHash.substring(0, 7)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-400 flex items-center gap-3">
                                  <span>Passed: {run.passedSteps}/{run.totalSteps} steps</span>
                                  <span>Duration: {run.totalDurationMs}ms</span>
                                  <span>{new Date(run.executedAt).toLocaleString()}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => router.push(`/workflows/${workflowId}/report`)}
                                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-rose-300 font-bold rounded text-xs border-none cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Report
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Live Incoming Webhook Delivery Logs */}
                    <div className="p-4 bg-neutral-900 rounded-xl space-y-3 border-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-emerald-400" /> Incoming Webhook HTTP Delivery Audit ({rawWebhookLogs.length})
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono">
                            LIVE MONGO LOGS
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={loadRawWebhookLogs}
                          disabled={loadingRawWebhookLogs}
                          className="px-2.5 py-1 bg-black text-neutral-300 hover:text-white rounded text-[10px] font-bold border-none cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingRawWebhookLogs ? 'animate-spin' : ''}`} />
                          Refresh Hits
                        </button>
                      </div>

                      {loadingRawWebhookLogs ? (
                        <div className="py-8 text-center text-neutral-400 font-mono text-xs flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading incoming webhook logs...
                        </div>
                      ) : rawWebhookLogs.length === 0 ? (
                        <div className="py-6 text-center text-neutral-400 font-mono text-xs space-y-1 bg-black p-4 rounded-lg">
                          <div className="text-rose-300 font-bold">No Webhook Hits Received Yet</div>
                          <div className="text-[10px] text-neutral-400 max-w-md mx-auto leading-relaxed">
                            GitHub servers have not reached <code className="text-purple-300">/api/workflows/github-webhook</code> yet. Verify your GitHub Webhook Payload URL or check if your local/production server host is reachable.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {rawWebhookLogs.map((log) => (
                            <div
                              key={log._id}
                              className="p-3 bg-black rounded-lg border-none space-y-1 font-mono text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.status === 'SUCCESS'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : log.status === 'UNBOUND'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : log.status === 'PING'
                                      ? 'bg-cyan-500/20 text-cyan-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}>
                                    {log.status}
                                  </span>
                                  <span className="text-white font-bold">{log.repoFullName || 'Unknown Repo'}</span>
                                  <span className="text-[10px] text-purple-300">({log.branch})</span>
                                </div>
                                <span className="text-[10px] text-neutral-400">
                                  {new Date(log.receivedAt).toLocaleTimeString()}
                                </span>
                              </div>

                              <div className="text-[11px] text-neutral-300 flex items-center justify-between gap-2">
                                <span className="truncate">"{log.commitMsg || 'No commit msg'}" by @{log.author || 'github'}</span>
                                <span className="text-[10px] text-neutral-400 shrink-0">IP: {log.clientIp}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-900 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsGithubModalOpen(false);
                    handleOpenScanner();
                  }}
                  className="px-3 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border-none text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Open Code Scanner
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGithubModalOpen(false)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-lg border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGithubSettings}
                    disabled={saving}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg border-none cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Code Endpoint Scanner & Auto-Step Builder Modal */}
        {isScannerModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono text-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-950 p-6 sm:p-8 rounded-2xl max-w-5xl w-full space-y-6 border-none shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                      Code Endpoint Scanner & Step Builder
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded font-mono font-bold">AST PARSER</span>
                    </h3>
                    <span className="text-xs text-neutral-400 block mt-0.5">
                      Extract API routes from your repository or local code files and auto-import them as workflow steps
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsScannerModalOpen(false)}
                  className="text-neutral-400 hover:text-white border-none bg-transparent cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scanner Source Tab Switcher */}
              <div className="p-1.5 bg-neutral-900 rounded-xl flex items-center gap-2 border-none">
                <button
                  type="button"
                  onClick={() => setScannerSourceTab('github')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-colors ${
                    scannerSourceTab === 'github'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  <span>GitHub Repository</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScannerSourceTab('local');
                    setBaseUrlForImport('http://localhost:3000');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-colors ${
                    scannerSourceTab === 'local'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  <Laptop className="w-4 h-4 text-emerald-400" />
                  <span>Local Machine Files & Folders</span>
                </button>
              </div>

              {/* Local Machine Code File & Folder Picker Card */}
              {scannerSourceTab === 'local' && (
                <div className="p-5 bg-neutral-900 rounded-xl space-y-4 border-none">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-emerald-400" /> Select Local Code Files or Project Folder
                    </span>
                    <span className="text-[10px] text-purple-300 font-mono">CLIENT-SIDE AST PARSER</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Upload Individual/Multiple Files */}
                    <label className="p-6 bg-black hover:bg-neutral-950 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2.5 text-center transition-colors border-none group">
                      <Upload className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-xs font-bold text-white block">Select Code Files</span>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">Pick .ts, .js, .py, .go, .json files</span>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept=".ts,.js,.py,.go,.json,.yaml,.yml,.jsx,.tsx"
                        onChange={handleLocalFilesUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Upload Project Folder */}
                    <label className="p-6 bg-black hover:bg-neutral-950 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2.5 text-center transition-colors border-none group">
                      <FolderPlus className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-xs font-bold text-white block">Select Entire Folder</span>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">Scan all routes in a local project directory</span>
                      </div>
                      <input
                        type="file"
                        // @ts-ignore
                        webkitdirectory=""
                        multiple
                        onChange={handleLocalFilesUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Target Repository & Config Section (GitHub Mode) */}
              {scannerSourceTab === 'github' && (
                <div className="space-y-4">
                  <div className="p-5 bg-neutral-900 rounded-xl space-y-3 border-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-300 font-bold uppercase block">
                          GitHub Repository (owner/repo)
                        </label>
                        <input
                          type="text"
                          value={scannerRepoFullName}
                          onChange={(e) => setScannerRepoFullName(e.target.value)}
                          placeholder="e.g. ritik125V/WakeUp"
                          className="w-full px-3 py-2 bg-black border-none rounded-lg text-white text-xs outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-300 font-bold uppercase block">
                          PAT Token (For Private Repos)
                        </label>
                        <input
                          type="text"
                          value={scannerToken}
                          onChange={(e) => setScannerToken(e.target.value)}
                          placeholder="ghp_xxx..."
                          className="w-full px-3 py-2 bg-black border-none rounded-lg text-white text-xs outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-300 font-bold uppercase block">
                          Target Branch
                        </label>
                        <input
                          type="text"
                          value={scannerBranch}
                          onChange={(e) => setScannerBranch(e.target.value)}
                          placeholder="main"
                          className="w-full px-3 py-2 bg-black border-none rounded-lg text-white text-xs outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scan Scope & File Selection */}
                  <div className="p-5 bg-neutral-900 rounded-xl space-y-4 border-none">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-purple-400" /> Scan Scope & File Selection
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setScannerScanMode('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors ${
                            scannerScanMode === 'all'
                              ? 'bg-purple-600 text-white'
                              : 'bg-black text-neutral-400 hover:text-white'
                          }`}
                        >
                          Auto-Scan Entire Repo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScannerScanMode('select');
                            if (repoFilesList.length === 0) {
                              handleFetchRepoFiles();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors ${
                            scannerScanMode === 'select'
                              ? 'bg-purple-600 text-white'
                              : 'bg-black text-neutral-400 hover:text-white'
                          }`}
                        >
                          Select Specific Files
                        </button>
                      </div>
                    </div>

                    {/* Selected Files Picker Tree Explorer */}
                    {scannerScanMode === 'select' && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                            <input
                              type="text"
                              value={fileSearchQuery}
                              onChange={(e) => setFileSearchQuery(e.target.value)}
                              placeholder="Filter code files (e.g. auth, api, controller)..."
                              className="w-full pl-8 pr-3 py-1.5 bg-black border-none rounded-lg text-white text-xs outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFetchRepoFiles()}
                            disabled={isFetchingFiles}
                            className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-lg border-none cursor-pointer shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isFetchingFiles ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Refresh Files
                          </button>
                        </div>

                        {repoFilesList.length > 0 ? (
                          <div className="max-h-72 overflow-y-auto bg-black p-3 rounded-xl border-none space-y-1">
                            <div className="flex items-center justify-between pb-2 mb-2 text-[10px] text-neutral-400 font-mono">
                              <span className="font-bold flex items-center gap-1.5">
                                <Folder className="w-3.5 h-3.5 text-amber-400" /> REPOSITORY FILE EXPLORER
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedFilePaths(repoFilesList.map((f) => f.path))}
                                  className="text-purple-400 hover:underline border-none bg-transparent cursor-pointer font-bold"
                                >
                                  Select All
                                </button>
                                <span className="text-neutral-700">|</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedFilePaths([])}
                                  className="text-neutral-400 hover:underline border-none bg-transparent cursor-pointer"
                                >
                                  Deselect All
                                </button>
                              </div>
                            </div>

                            {buildFileTree(repoFilesList).map((node) => (
                              <FileTreeNodeRow
                                key={node.path}
                                node={node}
                                selectedFilePaths={selectedFilePaths}
                                onToggleFile={handleToggleFile}
                                onToggleFolder={handleToggleFolder}
                                searchQuery={fileSearchQuery}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-black rounded-xl text-center text-xs text-neutral-400 font-mono">
                            Click <strong>&quot;Refresh Files&quot;</strong> above to load repository files.
                          </div>
                        )}
                        <div className="text-xs text-neutral-400">
                          Selected <span className="text-purple-400 font-bold">{selectedFilePaths.length}</span> file(s) for route extraction.
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleRunEndpointScanner}
                        disabled={isScanningEndpoints || !scannerRepoFullName.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl border-none cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
                      >
                        {isScanningEndpoints ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Scanning Codebase...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-purple-200" /> Run Endpoint Scanner Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Feedback Message */}
              {scannerStatusMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between border-none ${
                    scannerStatusMsg.type === 'success'
                      ? 'bg-emerald-950/90 text-emerald-300'
                      : 'bg-rose-950/90 text-rose-300'
                  }`}
                >
                  <span>{scannerStatusMsg.text}</span>
                  <button
                    type="button"
                    onClick={() => setScannerStatusMsg(null)}
                    className="text-neutral-400 hover:text-white bg-transparent border-none cursor-pointer p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Scanned Endpoints Preview Results Section */}
              {scannedEndpoints.length > 0 && (
                <div className="space-y-4 p-5 bg-neutral-900 rounded-xl border-none">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Detected Endpoints ({scannedEndpoints.length})
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedEndpointIndexes(scannedEndpoints.map((_, i) => i))}
                        className="text-purple-400 hover:underline border-none bg-transparent cursor-pointer font-bold"
                      >
                        Select All
                      </button>
                      <span className="text-neutral-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEndpointIndexes([])}
                        className="text-neutral-400 hover:underline border-none bg-transparent cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {scannedEndpoints.map((ep, idx) => {
                      const isSelected = selectedEndpointIndexes.includes(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedEndpointIndexes((prev) => prev.filter((i) => i !== idx));
                            } else {
                              setSelectedEndpointIndexes((prev) => [...prev, idx]);
                            }
                          }}
                          className={`p-3.5 rounded-xl border-none cursor-pointer transition-colors space-y-2 select-none ${
                            isSelected ? 'bg-black text-white' : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-none accent-purple-600 cursor-pointer"
                              />
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${getMethodBadgeStyle(ep.method)}`}>
                                {ep.method}
                              </span>
                              <span className="font-mono text-xs font-bold text-white truncate">{ep.path}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 bg-neutral-900 text-neutral-400 text-[10px] rounded font-mono">
                                {ep.framework}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                Line {ep.line} in {ep.sourceFile.split('/').pop()}
                              </span>
                            </div>
                          </div>

                          {ep.suggestedBody && (
                            <div className="pl-7">
                              <pre className="p-2.5 bg-neutral-900 text-emerald-300 rounded-lg text-[10px] font-mono overflow-x-auto max-h-24">
                                {ep.suggestedBody}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Import Step Target Configuration */}
                  <div className="p-4 bg-black rounded-xl space-y-4 border-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-neutral-300 font-bold uppercase block">
                          Base Host URL for Scanned Steps
                        </label>
                        <input
                          type="text"
                          value={baseUrlForImport}
                          onChange={(e) => setBaseUrlForImport(e.target.value)}
                          placeholder="e.g. http://localhost:5000 or https://api.myapp.com"
                          className="w-full px-3 py-2 bg-neutral-900 border-none rounded-lg text-white text-xs outline-none font-mono"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 select-none">
                          <span className="text-[10px] text-neutral-400">Quick Ports:</span>
                          {['http://localhost:3000', 'http://localhost:5000', 'http://localhost:8000', 'http://localhost:8080'].map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setBaseUrlForImport(url)}
                              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-purple-300 text-[10px] rounded border-none cursor-pointer font-mono"
                            >
                              {url.replace('http://', '')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl self-end">
                        <span className="text-xs text-neutral-300 font-bold">
                          Replace Existing Steps
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplaceExistingSteps(!replaceExistingSteps)}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors border-none cursor-pointer ${
                            replaceExistingSteps ? 'bg-purple-600' : 'bg-neutral-800'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              replaceExistingSteps ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-neutral-400 text-xs">
                        Selected <strong className="text-purple-300">{selectedEndpointIndexes.length}</strong> of {scannedEndpoints.length} endpoint(s)
                      </span>

                      <button
                        type="button"
                        onClick={handleImportSelectedEndpoints}
                        disabled={isImportingSteps || selectedEndpointIndexes.length === 0}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
                      >
                        {isImportingSteps ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 text-purple-200" />
                        )}
                        Import Selected as Workflow Steps
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end pt-3 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsScannerModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-lg border-none cursor-pointer"
                >
                  Close Scanner
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Spec Import Modal */}
      <AiSpecImportModal
        isOpen={isAiSpecModalOpen}
        onClose={() => setIsAiSpecModalOpen(false)}
        onImport={handleImportAiSpec}
      />

      {/* SAVED RUN HISTORY MODAL DRAWER */}
      <AnimatePresence>
        {isRunHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl p-6 bg-neutral-950 rounded-2xl space-y-4 shadow-2xl border border-purple-500/20 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Execution Run History</h3>
                    <p className="text-[11px] text-neutral-400">Past executions saved in database (including automated GitHub push triggers)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRunHistoryOpen(false)}
                  className="p-1 hover:bg-neutral-900 rounded text-neutral-400 hover:text-white border-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingPastRuns ? (
                <div className="p-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> Loading execution run history...
                </div>
              ) : pastRuns.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-900/40 rounded-xl">
                  No past execution run reports recorded in database yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {pastRuns.map((run) => (
                    <div
                      key={run._id}
                      className="p-4 bg-neutral-900/80 hover:bg-neutral-900 rounded-xl space-y-2 border border-white/5 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {run.summary?.overallStatus === 'success' ? (
                            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] font-bold rounded flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PASSED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-rose-950 text-rose-400 text-[10px] font-bold rounded flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-400" /> FAILED
                            </span>
                          )}

                          {run.triggerSource === 'github_commit' ? (
                            <span className="px-2 py-0.5 bg-purple-950 text-purple-300 text-[10px] font-bold rounded flex items-center gap-1">
                              <GitBranch className="w-3.5 h-3.5 text-purple-400" /> GitHub Webhook
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 text-[10px] font-bold rounded">
                              {run.triggerSource || 'Manual'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                          <span><Zap className="w-3 h-3 text-amber-400 inline" /> {run.summary?.totalTimeMs || 0}ms</span>
                          <span>{new Date(run.createdAt).toLocaleString()}</span>
                          <button
                            onClick={() => {
                              setIsRunHistoryOpen(false);
                              router.push(`/workflows/${workflowId}/report`);
                            }}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded transition-all cursor-pointer border-none"
                          >
                            Open Report Page
                          </button>
                        </div>
                      </div>

                      {run.commitInfo?.commitMsg && (
                        <div className="text-[11px] text-neutral-300 flex items-center gap-2 pt-1 border-t border-neutral-800/60">
                          <GitCommit className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">&quot;{run.commitInfo.commitMsg}&quot;</span>
                          {run.commitInfo?.author && (
                            <span className="text-neutral-500 text-[10px]">by {run.commitInfo.author}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

