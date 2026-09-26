import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const adminApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface AdminMetrics {
  usersCount: number;
  endpointsCount: number;
  healthyEndpointsCount: number;
  degradedEndpointsCount: number;
  downEndpointsCount: number;
  workflowsCount: number;
  statusPagesCount: number;
  incidentsCount: number;
  activeIncidentsCount: number;
}

export interface AdminWorkerStatus {
  status: string;
  tickerIntervalMs: number;
  batchSizeLimit: number;
  concurrency: number;
  redisStatus: string;
  nodeUptimeSeconds: number;
  memoryUsageMb: number;
}

export interface AdminUserRecord {
  _id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: string;
  endpointsCount: number;
  statusPagesCount: number;
  workflowsCount: number;
}

export interface AdminEndpointRecord {
  _id: string;
  projectName: string;
  url: string;
  method?: string;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  lastCheckedAt: string;
  lastResponseTimeMs?: number;
  expectedStatusCode?: number;
  userId?: { _id: string; email: string; name: string };
}

export interface AdminWorkflowRecord {
  _id: string;
  name: string;
  description?: string;
  steps: Array<{ stepId: string; name: string; url: string; method: string }>;
  createdAt: string;
  userId?: { _id: string; email: string; name: string };
}

export interface AdminStatusPageRecord {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  isPublic: boolean;
  endpointIds?: Array<{ _id: string; projectName: string; status: string }>;
  createdAt: string;
  userId?: { _id: string; email: string; name: string };
}

export interface AdminIncidentRecord {
  _id: string;
  startedAt: string;
  resolvedAt?: string;
  resolved: boolean;
  errorMessage: string;
  durationSeconds?: number;
  endpointId?: { _id: string; projectName: string; url: string };
  userId?: { _id: string; email: string; name: string };
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  category: 'CRON_WORKER' | 'HEALTH_CHECK' | 'INCIDENT' | 'AUTH' | 'CACHE_REDIS' | 'SYSTEM';
  message: string;
  details?: any;
}

export async function adminLogin(email: string, pin: string) {
  const res = await adminApiClient.post<{ token: string; user: { id: string; email: string; name: string } }>('/admin/login', { email, pin });
  if (res.data.token) {
    localStorage.setItem('admin_token', res.data.token);
  }
  return res.data;
}

export async function fetchAdminOverview() {
  const res = await adminApiClient.get<{ metrics: AdminMetrics; worker: AdminWorkerStatus }>('/admin/overview');
  return res.data;
}

export async function fetchAdminUsers() {
  const res = await adminApiClient.get<{ users: AdminUserRecord[] }>('/admin/users');
  return res.data;
}

export async function updateAdminUser(id: string, data: Partial<AdminUserRecord>) {
  const res = await adminApiClient.put<{ message: string; user: AdminUserRecord }>(`/admin/users/${id}`, data);
  return res.data;
}

export async function deleteAdminUser(id: string) {
  const res = await adminApiClient.delete<{ message: string }>(`/admin/users/${id}`);
  return res.data;
}

export async function bulkDeleteAdminUsers(ids: string[]) {
  const res = await adminApiClient.post<{ message: string }>('/admin/users/bulk-delete', { ids });
  return res.data;
}

export async function fetchAdminEndpoints() {
  const res = await adminApiClient.get<{ endpoints: AdminEndpointRecord[] }>('/admin/endpoints');
  return res.data;
}

export async function updateAdminEndpoint(id: string, data: Partial<AdminEndpointRecord>) {
  const res = await adminApiClient.put<{ message: string; endpoint: AdminEndpointRecord }>(`/admin/endpoints/${id}`, data);
  return res.data;
}

export async function deleteAdminEndpoint(id: string) {
  const res = await adminApiClient.delete<{ message: string }>(`/admin/endpoints/${id}`);
  return res.data;
}

export async function bulkDeleteAdminEndpoints(ids: string[]) {
  const res = await adminApiClient.post<{ message: string }>('/admin/endpoints/bulk-delete', { ids });
  return res.data;
}

export async function triggerAdminEndpointCheck(id: string) {
  const res = await adminApiClient.post<{ message: string; result: any; endpoint: AdminEndpointRecord }>(`/admin/endpoints/${id}/trigger`);
  return res.data;
}

export async function fetchAdminWorkflows() {
  const res = await adminApiClient.get<{ workflows: AdminWorkflowRecord[] }>('/admin/workflows');
  return res.data;
}

export async function updateAdminWorkflow(id: string, data: Partial<AdminWorkflowRecord>) {
  const res = await adminApiClient.put<{ message: string; workflow: AdminWorkflowRecord }>(`/admin/workflows/${id}`, data);
  return res.data;
}

export async function deleteAdminWorkflow(id: string) {
  const res = await adminApiClient.delete<{ message: string }>(`/admin/workflows/${id}`);
  return res.data;
}

export async function bulkDeleteAdminWorkflows(ids: string[]) {
  const res = await adminApiClient.post<{ message: string }>('/admin/workflows/bulk-delete', { ids });
  return res.data;
}

export async function fetchAdminStatusPages() {
  const res = await adminApiClient.get<{ statusPages: AdminStatusPageRecord[] }>('/admin/status-pages');
  return res.data;
}

export async function updateAdminStatusPage(id: string, data: Partial<AdminStatusPageRecord>) {
  const res = await adminApiClient.put<{ message: string; statusPage: AdminStatusPageRecord }>(`/admin/status-pages/${id}`, data);
  return res.data;
}

export async function deleteAdminStatusPage(id: string) {
  const res = await adminApiClient.delete<{ message: string }>(`/admin/status-pages/${id}`);
  return res.data;
}

export async function bulkDeleteAdminStatusPages(ids: string[]) {
  const res = await adminApiClient.post<{ message: string }>('/admin/status-pages/bulk-delete', { ids });
  return res.data;
}

export async function fetchAdminIncidents() {
  const res = await adminApiClient.get<{ incidents: AdminIncidentRecord[] }>('/admin/incidents');
  return res.data;
}

export async function resolveAdminIncident(id: string) {
  const res = await adminApiClient.put<{ message: string; incident: AdminIncidentRecord }>(`/admin/incidents/${id}/resolve`);
  return res.data;
}

export async function deleteAdminIncident(id: string) {
  const res = await adminApiClient.delete<{ message: string }>(`/admin/incidents/${id}`);
  return res.data;
}

export async function bulkDeleteAdminIncidents(ids: string[]) {
  const res = await adminApiClient.post<{ message: string }>('/admin/incidents/bulk-delete', { ids });
  return res.data;
}

export async function bulkResolveAdminIncidents(ids: string[]) {
  const res = await adminApiClient.post<{ message: string }>('/admin/incidents/bulk-resolve', { ids });
  return res.data;
}

export interface HostSystemInfo {
  platform: string;
  osType: string;
  osRelease: string;
  arch: string;
  hostname: string;
  nodeVersion: string;
  processPid: number;
  systemUptimeSeconds: number;
  processUptimeSeconds: number;
  cpuModel: string;
  cpuCores: number;
  cpuSpeedMhz: number;
  loadAvg: number[];
  totalPhysicalRamMb: number;
  freePhysicalRamMb: number;
  usedPhysicalRamMb: number;
  physicalRamUsagePercent: number;
  redisConnected: boolean;
}

export interface SystemDiagnostics {
  overallStatus: 'OPTIMAL' | 'ELEVATED_LOAD' | 'CRITICAL_OVERWHELM';
  healthScore: number;
  hostSystemInfo?: HostSystemInfo;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    status: 'NORMAL' | 'HIGH' | 'CRITICAL';
  };
  database: {
    queryLatencyMs: number;
    status: 'FAST' | 'DEGRADED' | 'SLOW';
  };
  services: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
    failureRatePercent: number;
    status: 'STABLE' | 'ELEVATED_OUTAGES' | 'CRITICAL_OUTAGES';
  };
  scaling?: {
    cpuCoresCount: number;
    cpuLoad1MinPercent: number;
    processCpuTimeMs: number;
    totalSystemRamMb: number;
    freeSystemRamMb: number;
    usedSystemRamMb: number;
    systemRamUsagePercent: number;
    verdict: 'OPTIMAL_CAPACITY' | 'MODERATE_LOAD' | 'SCALE_UP_RECOMMENDED';
    message: string;
  };
  incidents: {
    activeCount: number;
  };
  anomaliesDetected: Array<{
    id: string;
    severity: 'info' | 'warn' | 'critical';
    title: string;
    description: string;
    recommendation: string;
  }>;
}

export async function fetchAdminLogs() {
  const res = await adminApiClient.get<{ logs: SystemLogEntry[] }>('/admin/logs');
  return res.data;
}

export async function fetchAdminDiagnostics() {
  const res = await adminApiClient.get<{ diagnostics: SystemDiagnostics }>('/admin/diagnostics');
  return res.data;
}

export interface AdminWorkflowRunRecord {
  _id: string;
  workflowId: string;
  userId: string;
  workflowName: string;
  triggerSource: 'github_commit' | 'manual' | 'browser_direct' | 'api' | 'unbound_webhook' | string;
  githubRepo?: string;
  githubBranch?: string;
  commitInfo?: {
    commitMsg?: string;
    author?: string;
    authorEmail?: string;
    commitHash?: string;
    repo?: string;
    branch?: string;
  };
  summary: {
    totalSteps: number;
    successSteps: number;
    failedSteps: number;
    totalTimeMs: number;
    overallStatus: 'success' | 'failed' | 'PASSED' | 'FAILED' | 'UNBOUND_WEBHOOK' | string;
    startedAt: string;
    finishedAt: string;
  };
  stepLogs: any[];
  owner?: { email: string; name: string };
  createdAt: string;
}

export async function fetchAdminWorkflowRuns(params?: { status?: string; repo?: string; search?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.repo) query.append('repo', params.repo);
  if (params?.search) query.append('search', params.search);
  if (params?.limit) query.append('limit', String(params.limit));

  const res = await adminApiClient.get<{ runs: AdminWorkflowRunRecord[]; count: number }>(
    `/admin/workflow-runs?${query.toString()}`
  );
  return res.data;
}

export async function deleteAdminWorkflowRun(id: string) {
  const res = await adminApiClient.delete<{ message: string }>(`/admin/workflow-runs/${id}`);
  return res.data;
}

export async function bulkDeleteAdminWorkflowRuns(ids: string[]) {
  const res = await adminApiClient.post<{ message: string }>('/admin/workflow-runs/delete-bulk', { ids });
  return res.data;
}

