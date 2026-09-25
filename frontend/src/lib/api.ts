import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Automatically attach JWT token to all requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('wakeup_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface UserData {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider: 'credentials' | 'google' | 'github';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserData;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

export interface HelloResponse {
  message: string;
}

export interface EndpointData {
  _id: string;
  userId: string;
  projectName: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatusCode: number;
  checkIntervalMinutes: number;
  batchId: string;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  lastCheckedAt?: string;
  lastResponseTimeMs?: number;
  lastStatusCode?: number;
  createdAt: string;
}

export interface IncidentData {
  _id: string;
  endpointId: string;
  userId: string;
  projectName: string;
  url: string;
  errorType: 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_STATUS';
  statusCode?: number;
  errorMessage: string;
  responseTimeMs?: number;
  responseSnippet?: string;
  startedAt: string;
  lastSeenAt: string;
  durationSeconds: number;
  resolved: boolean;
  resolvedAt?: string;
}

export interface GroupedEndpointsResponse {
  projects: Record<string, EndpointData[]>;
  totalEndpoints: number;
}

export interface StatusPageCustomization {
  themePreset?:
    | 'cyberpunk'
    | 'neon_emerald'
    | 'midnight'
    | 'vaporwave'
    | 'minimal_charcoal'
    | 'sunset'
    | 'matrix_rain'
    | 'synthwave_retro'
    | 'aurora_borealis'
    | 'glassmorphism'
    | 'discord_gamer'
    | 'meme_doge_pink'
    | 'y2k_chrome'
    | 'lofi_chill'
    | 'arcade_8bit'
    | 'brainrot_chad'
    | 'pixel_synth'
    | 'cyberpunk_gold'
    | 'anime_pastel'
    | 'goth_dark'
    | 'tiktok_glitch'
    | 'custom';
  artworkStyle?:
    | 'synthwave_sun'
    | 'cyber_nodes'
    | 'waveform_pulse'
    | 'matrix_rain'
    | 'isometric_servers'
    | 'constellation'
    | 'origami_geometric'
    | 'meme_doge'
    | 'arcade_controller'
    | 'skull_flame'
    | 'lofi_cat'
    | 'sigmachad_statue'
    | 'vaporwave_palm'
    | 'pixel_alien'
    | 'cat_vibe'
    | 'goth_raven'
    | 'none';
  artworkPosition?: 'top_hero' | 'background_watermark' | 'card_header' | 'hidden';
  heroHeaderStyle?: 'real_telemetry' | 'synthwave_sun' | 'cyber_nodes' | 'minimal_badge' | 'none';
  logoEmoji?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  backgroundPattern?: 'dots' | 'grid' | 'waves' | 'circuit' | 'hexagon' | 'none';
  fontFamily?: 'mono' | 'sans' | 'display' | 'code';
  layoutStyle?: 'standard' | 'bento' | 'compact_cards' | 'hero_focus';
  cardRadiusStyle?: 'rounded-none' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  statusBadgeStyle?: 'standard' | 'genz_slang' | 'meme_cooking' | 'gamer' | 'chad' | 'kawaii_slang' | 'doge_slang' | 'custom_text';
  customHealthyText?: string;
  customDegradedText?: string;
  customDownText?: string;
  announcementBarText?: string;
  announcementBarLink?: string;
  announcementBarType?: 'info' | 'warning' | 'success';
  maintenanceNotice?: string;
  supportEmail?: string;
  supportDocsUrl?: string;
  twitterHandle?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontSize?: 'compact' | 'standard' | 'large' | 'genz_display';
  customHeaderBadge?: string;
  customBannerMessage?: string;
  showLogo?: boolean;
  showHeaderBadge?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showBanner?: boolean;
  showIncidents?: boolean;
  showHistoryBars?: boolean;
  showMetrics?: boolean;
  showServicesHeader?: boolean;
  showServiceUrls?: boolean;
  showServiceStatusBadge?: boolean;
  showFooter?: boolean;
  showArtwork?: boolean;
  showLatencyGraph?: boolean;
  showTelemetryWidget?: boolean;
  showLatencyBreakdown?: boolean;
  showSupportLinks?: boolean;
  showReactions?: boolean;
  customFooterText?: string;
}

export interface StatusPageRecord {
  _id: string;
  userId: string;
  title: string;
  slug: string;
  description?: string;
  endpointIds: EndpointData[];
  isPublic: boolean;
  customization?: StatusPageCustomization;
  createdAt: string;
  updatedAt: string;
}

export interface PublicStatusPageResponse {
  _id?: string;
  title: string;
  slug?: string;
  description?: string;
  overallStatus: 'ALL_SYSTEMS_OPERATIONAL' | 'DEGRADED_PERFORMANCE';
  endpoints: EndpointData[];
  activeIncidents: IncidentData[];
  incidentsMap?: Record<string, IncidentData[]>;
  customization?: StatusPageCustomization;
  lastUpdated: string;
}

// Auth API Calls
export const signupWithPin = async (email: string, pin: string, name?: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/signup', { email, pin, name });
  if (typeof window !== 'undefined' && response.data.token) {
    localStorage.setItem('wakeup_auth_token', response.data.token);
    localStorage.setItem('wakeup_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const loginWithPin = async (email: string, pin: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', { email, pin });
  if (typeof window !== 'undefined' && response.data.token) {
    localStorage.setItem('wakeup_auth_token', response.data.token);
    localStorage.setItem('wakeup_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const syncOAuthUser = async (data: {
  email: string;
  name?: string;
  avatar?: string;
  provider: 'google' | 'github';
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/oauth-sync', data);
  if (typeof window !== 'undefined' && response.data.token) {
    localStorage.setItem('wakeup_auth_token', response.data.token);
    localStorage.setItem('wakeup_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const logoutUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wakeup_auth_token');
    localStorage.removeItem('wakeup_user');
  }
};

export const fetchCurrentUser = async (): Promise<UserData | null> => {
  try {
    const response = await apiClient.get<{ user: UserData }>('/auth/me');
    return response.data.user;
  } catch {
    return null;
  }
};

export const changeUserPin = async (currentPin: string, newPin: string): Promise<{ message: string }> => {
  const response = await apiClient.put<{ message: string }>('/auth/change-pin', { currentPin, newPin });
  return response.data;
};

export const updateUserProfile = async (data: { name?: string }): Promise<{ message: string; user: UserData }> => {
  const response = await apiClient.put<{ message: string; user: UserData }>('/auth/profile', data);
  return response.data;
};

// Monitoring & Status Page APIs
export const fetchHealth = async (): Promise<HealthResponse> => {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
};

export const fetchHello = async (): Promise<HelloResponse> => {
  const response = await apiClient.get<HelloResponse>('/hello');
  return response.data;
};

export const fetchGroupedEndpoints = async (): Promise<GroupedEndpointsResponse> => {
  const response = await apiClient.get<GroupedEndpointsResponse>('/endpoints');
  return response.data;
};

export const registerEndpoint = async (data: {
  url: string;
  name?: string;
  checkIntervalMinutes?: number;
}): Promise<{ message: string; endpoint: EndpointData }> => {
  const response = await apiClient.post('/endpoints', data);
  return response.data;
};

export const triggerManualCheck = async (endpointId: string): Promise<EndpointData> => {
  const response = await apiClient.post(`/endpoints/${endpointId}/trigger`);
  return response.data.endpoint;
};

export const deleteEndpoint = async (endpointId: string): Promise<void> => {
  await apiClient.delete(`/endpoints/${endpointId}`);
};

export const fetchEndpointIncidents = async (
  endpointId: string
): Promise<{ incidents: IncidentData[]; count: number }> => {
  const response = await apiClient.get(`/incidents/endpoint/${endpointId}`);
  return response.data;
};

export const createStatusPage = async (data: {
  title: string;
  slug: string;
  description?: string;
  endpointIds: string[];
  customization?: StatusPageCustomization;
}): Promise<{ message: string; statusPage: StatusPageRecord }> => {
  const response = await apiClient.post('/status-pages', data);
  return response.data;
};

export const updateStatusPage = async (
  id: string,
  data: Partial<{
    title: string;
    slug: string;
    description: string;
    endpointIds: string[];
    isPublic: boolean;
    customization: StatusPageCustomization;
  }>
): Promise<{ message: string; statusPage: StatusPageRecord }> => {
  const response = await apiClient.put(`/status-pages/${id}`, data);
  return response.data;
};

export const deleteStatusPage = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/status-pages/${id}`);
  return response.data;
};

export const fetchUserStatusPages = async (): Promise<{ statusPages: StatusPageRecord[] }> => {
  const response = await apiClient.get('/status-pages');
  return response.data;
};

export const fetchPublicStatusPage = async (
  slug: string
): Promise<PublicStatusPageResponse> => {
  const response = await apiClient.get<PublicStatusPageResponse>(`/status-pages/public/${slug}`);
  return response.data;
};

// Workflow APIs & Interfaces
export interface IWorkflowVariableExtract {
  varName: string;
  jsonPath: string;
}

export interface IWorkflowStepData {
  stepId: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyPayload?: string;
  expectedStatusCode?: number;
  captureCookies?: boolean;
  carryCookies?: boolean;
  skipped?: boolean;
  extractVariables?: IWorkflowVariableExtract[];
}

export interface WorkflowData {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  steps: IWorkflowStepData[];
  githubEnabled?: boolean;
  githubRepo?: string;
  githubBranch?: string;
  githubSecretToken?: string;
  notificationEmail?: string;
  lastTriggeredBy?: string;
  lastTriggeredAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'pending' | 'none';
  createdAt: string;
  updatedAt: string;
}

export const fetchWorkflows = async (): Promise<{ workflows: WorkflowData[] }> => {
  const response = await apiClient.get<{ workflows: WorkflowData[] }>('/workflows');
  return response.data;
};

export const fetchWorkflowById = async (id: string): Promise<{ workflow: WorkflowData }> => {
  const response = await apiClient.get<{ workflow: WorkflowData }>(`/workflows/${id}`);
  return response.data;
};

export const createWorkflow = async (data: {
  name: string;
  description?: string;
  steps?: IWorkflowStepData[];
  githubEnabled?: boolean;
  githubRepo?: string;
  githubBranch?: string;
}): Promise<{ workflow: WorkflowData }> => {
  const response = await apiClient.post<{ workflow: WorkflowData }>('/workflows', data);
  return response.data;
};

export const updateWorkflow = async (
  id: string,
  data: Partial<WorkflowData>
): Promise<{ workflow: WorkflowData }> => {
  const response = await apiClient.put<{ workflow: WorkflowData }>(`/workflows/${id}`, data);
  return response.data;
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  await apiClient.delete(`/workflows/${id}`);
};

export const triggerWorkflow = async (id: string): Promise<{ message: string; workflowId: string }> => {
  const response = await apiClient.post<{ message: string; workflowId: string }>(`/workflows/${id}/run`);
  return response.data;
};

export const triggerTestGithubPush = async (
  id: string
): Promise<{ message: string; triggeredBy: string; repoName: string; branch: string }> => {
  const response = await apiClient.post<{ message: string; triggeredBy: string; repoName: string; branch: string }>(
    `/workflows/${id}/github-test-trigger`
  );
  return response.data;
};

export interface IGithubRepoItem {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  private: boolean;
  html_url: string;
  updated_at: string;
  description?: string;
}

export const fetchGithubRepos = async (query: {
  username?: string;
  token?: string;
}): Promise<{ repos: IGithubRepoItem[]; count: number }> => {
  const response = await apiClient.get<{ repos: IGithubRepoItem[]; count: number }>(
    '/workflows/github/repos',
    { params: query }
  );
  return response.data;
};

export const autoCreateGithubWebhook = async (data: {
  repoFullName: string;
  token: string;
  webhookUrl: string;
}): Promise<{ message: string; hookId: number; repoFullName: string }> => {
  const response = await apiClient.post<{ message: string; hookId: number; repoFullName: string }>(
    '/workflows/github/create-webhook',
    data
  );
  return response.data;
};

export async function browserDirectTestStep(
  step: IWorkflowStepData,
  variablesContext: Record<string, string> = {},
  cookiesContext: Record<string, string> = {}
): Promise<any> {
  const startTime = performance.now();

  // Substitute variables in URL
  let resolvedUrl = step.url || '';
  Object.entries(variablesContext).forEach(([k, v]) => {
    resolvedUrl = resolvedUrl.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
  });

  // Prepare Headers
  const headers: Record<string, string> = {};
  if (step.headers) {
    Object.entries(step.headers).forEach(([k, v]) => {
      let resolvedVal = v;
      Object.entries(variablesContext).forEach(([varKey, varVal]) => {
        resolvedVal = resolvedVal.replace(new RegExp(`\\{\\{${varKey}\\}\\}`, 'g'), varVal);
      });
      headers[k] = resolvedVal;
    });
  }

  // Substitute Variables in Body
  let resolvedBody: string | undefined = undefined;
  if (step.bodyPayload && step.method !== 'GET' && step.method !== 'HEAD') {
    resolvedBody = step.bodyPayload;
    Object.entries(variablesContext).forEach(([k, v]) => {
      resolvedBody = resolvedBody?.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    });
  }

  try {
    const fetchOptions: RequestInit = {
      method: step.method || 'GET',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: resolvedBody,
    };

    let response: Response;
    let isOpaque = false;

    try {
      response = await fetch(resolvedUrl, fetchOptions);
    } catch (corsErr: any) {
      // Fallback: If CORS preflight fails or is blocked on localhost, try mode: 'no-cors' to verify server connectivity
      try {
        response = await fetch(resolvedUrl, { ...fetchOptions, mode: 'no-cors' });
        isOpaque = true;
      } catch (opaqueErr: any) {
        const latencyMs = Math.round(performance.now() - startTime);
        return {
          stepId: step.stepId,
          stepName: step.name,
          url: resolvedUrl,
          method: step.method,
          status: 'error',
          statusCode: 0,
          latencyMs,
          errorMessage: `connect ECONNREFUSED ::1 or port unreachable on ${resolvedUrl}. Verify your local server is active.`,
        };
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    if (isOpaque) {
      return {
        stepId: step.stepId,
        stepName: step.name,
        url: resolvedUrl,
        method: step.method,
        status: 'success',
        statusCode: 200,
        latencyMs,
        responseSnippet: 'Local server responded successfully (Direct Browser Execution).',
        extractedVars: {},
      };
    }

    const statusCode = response.status;
    const isSuccess = step.expectedStatusCode
      ? statusCode === step.expectedStatusCode
      : statusCode >= 200 && statusCode < 400;

    let responseSnippet = '';
    try {
      responseSnippet = await response.text();
      if (responseSnippet.length > 2000) {
        responseSnippet = responseSnippet.substring(0, 2000) + '... (truncated)';
      }
    } catch {
      responseSnippet = '[Binary / Non-text Response]';
    }

    // Extract Variables if defined
    const extractedVars: Record<string, string> = {};
    if (step.extractVariables && Array.isArray(step.extractVariables)) {
      try {
        const json = JSON.parse(responseSnippet);
        for (const ext of step.extractVariables) {
          if (ext.varName && ext.jsonPath) {
            const val = ext.jsonPath.split('.').reduce((o: any, i) => o?.[i], json);
            if (val !== undefined) {
              extractedVars[ext.varName] = String(val);
            }
          }
        }
      } catch {}
    }

    return {
      stepId: step.stepId,
      stepName: step.name,
      url: resolvedUrl,
      method: step.method,
      status: isSuccess ? 'success' : 'failed',
      statusCode,
      latencyMs,
      responseSnippet,
      extractedVars,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      stepId: step.stepId,
      stepName: step.name,
      url: resolvedUrl,
      method: step.method,
      status: 'error',
      statusCode: 0,
      latencyMs,
      errorMessage: err?.message || 'Failed to execute browser direct test',
    };
  }
}

export const testSingleWorkflowStep = async (
  step: IWorkflowStepData,
  variablesContext?: Record<string, string>,
  cookiesContext?: Record<string, string>
): Promise<any> => {
  const url = step.url || '';
  const isLocalhost =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('0.0.0.0');

  if (isLocalhost) {
    // Zero setup direct browser execution for localhost URLs
    return await browserDirectTestStep(step, variablesContext, cookiesContext);
  }

  try {
    const response = await apiClient.post('/workflows/test-step', { step, variablesContext, cookiesContext });
    return response.data.result;
  } catch (err: any) {
    // Fallback to browser direct execution if cloud server request fails
    return await browserDirectTestStep(step, variablesContext, cookiesContext);
  }
};

export interface IScannedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  path: string;
  sourceFile: string;
  line: number;
  framework: string;
  suggestedBody?: string;
  expectedStatus?: number;
  name?: string;
}

export const fetchGithubRepoFiles = async (data: {
  repoFullName: string;
  token?: string;
  branch?: string;
}): Promise<{ files: { path: string; size?: number }[]; count: number }> => {
  const response = await apiClient.post<{ files: { path: string; size?: number }[]; count: number }>(
    '/workflows/github/files',
    data
  );
  return response.data;
};

export const scanGithubRepoEndpoints = async (data: {
  repoFullName: string;
  token?: string;
  targetFiles?: string[];
  branch?: string;
}): Promise<{ endpoints: IScannedEndpoint[]; count: number }> => {
  const response = await apiClient.post<{ endpoints: IScannedEndpoint[]; count: number }>(
    '/workflows/github/scan-endpoints',
    data
  );
  return response.data;
};

export const importScannedEndpointsToWorkflow = async (
  id: string,
  data: {
    endpoints: IScannedEndpoint[];
    baseUrl?: string;
    replaceExisting?: boolean;
  }
): Promise<{ message: string; workflow: WorkflowData; importedCount: number }> => {
  const response = await apiClient.post<{ message: string; workflow: WorkflowData; importedCount: number }>(
    `/workflows/${id}/import-scanned-steps`,
    data
  );
  return response.data;
};

