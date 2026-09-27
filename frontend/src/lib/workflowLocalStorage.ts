import { WorkflowData, IWorkflowStepData, createWorkflow, fetchWorkflows } from './api';

export const FLOW_RUNNER_STORAGE_VERSION = '1.0.0';
const LOCAL_WORKFLOWS_KEY = 'wakeup_local_workflows_v1';
const LOCAL_RUNS_PREFIX = 'wakeup_local_runs_';

export interface LocalStorageWorkflowContainer {
  version: string;
  updatedAt: string;
  workflows: WorkflowData[];
}

/**
 * Migration runner for upgrading local storage schemas across versions
 */
export function migrateLocalStorageWorkflows(container: any): LocalStorageWorkflowContainer {
  if (!container || typeof container !== 'object') {
    return {
      version: FLOW_RUNNER_STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      workflows: [],
    };
  }

  let workflows: WorkflowData[] = Array.isArray(container.workflows) ? container.workflows : [];

  // Migration rules from pre-1.0.0 or raw arrays
  workflows = workflows.map((wf: any) => {
    return {
      _id: wf._id || `local-flow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: wf.userId || 'guest-local-user',
      name: wf.name || 'Untitled Local Workflow',
      description: wf.description || '',
      steps: Array.isArray(wf.steps)
        ? wf.steps.map((st: any, idx: number) => ({
            stepId: st.stepId || `step-${Date.now()}-${idx}`,
            name: st.name || `Step ${idx + 1}`,
            url: st.url || '',
            method: st.method || 'GET',
            headers: st.headers || {},
            queryParams: st.queryParams || {},
            bodyPayload: st.bodyPayload || '',
            expectedStatusCode: st.expectedStatusCode || 200,
            captureCookies: st.captureCookies ?? true,
            carryCookies: st.carryCookies ?? true,
            extractVariables: Array.isArray(st.extractVariables) ? st.extractVariables : [],
            skipped: Boolean(st.skipped),
          }))
        : [],
      lastRunAt: wf.lastRunAt,
      lastRunStatus: wf.lastRunStatus,
      createdAt: wf.createdAt || new Date().toISOString(),
      updatedAt: wf.updatedAt || new Date().toISOString(),
      isLocalOnly: true,
    };
  });

  return {
    version: FLOW_RUNNER_STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    workflows,
  };
}

/**
 * Get all local workflows from LocalStorage
 */
export function getLocalWorkflows(): WorkflowData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_WORKFLOWS_KEY);
    if (!raw) {
      // Seed initial sample workflow ONLY ONCE for new guest visitors
      const hasSeeded = localStorage.getItem('wakeup_seeded_sample_v1');
      if (!hasSeeded && !localStorage.getItem('wakeup_auth_token')) {
        localStorage.setItem('wakeup_seeded_sample_v1', 'true');
        const sampleContainer = getSampleGuestWorkflowsContainer();
        saveLocalContainer(sampleContainer);
        return sampleContainer.workflows;
      }
      return [];
    }

    const parsed = JSON.parse(raw);
    if (parsed.version !== FLOW_RUNNER_STORAGE_VERSION || !Array.isArray(parsed.workflows)) {
      const migrated = migrateLocalStorageWorkflows(parsed);
      saveLocalContainer(migrated);
      return migrated.workflows;
    }

    return parsed.workflows;
  } catch (err) {
    console.error('Failed to read local workflows from LocalStorage:', err);
    return [];
  }
}

/**
 * Get a single local workflow by ID
 */
export function getLocalWorkflowById(id: string): WorkflowData | null {
  const workflows = getLocalWorkflows();
  return workflows.find((w) => w._id === id) || null;
}

/**
 * Save or update a local workflow
 */
export function saveLocalWorkflow(data: Partial<WorkflowData> & { name: string }): WorkflowData {
  const container = getLocalContainer();
  const existingIndex = container.workflows.findIndex((w) => w._id === data._id);

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const updated: WorkflowData = {
      ...container.workflows[existingIndex],
      ...data,
      updatedAt: now,
      isLocalOnly: true,
    };
    container.workflows[existingIndex] = updated;
    saveLocalContainer(container);
    return updated;
  } else {
    const created: WorkflowData = {
      _id: data._id || `local-flow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: 'guest-local-user',
      name: data.name,
      description: data.description || '',
      steps: data.steps || [],
      createdAt: now,
      updatedAt: now,
      isLocalOnly: true,
    };
    container.workflows.unshift(created);
    saveLocalContainer(container);
    return created;
  }
}

/**
 * Replace entire local workflows list with synced database workflows
 */
export function setLocalWorkflowsContainer(workflows: WorkflowData[]): void {
  if (typeof window === 'undefined') return;
  saveLocalContainer({
    version: FLOW_RUNNER_STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    workflows,
  });
}

/**
 * Delete a local workflow
 */
export function deleteLocalWorkflow(id: string): void {
  const container = getLocalContainer();
  container.workflows = container.workflows.filter((w) => w._id !== id);
  saveLocalContainer(container);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${LOCAL_RUNS_PREFIX}${id}`);
  }
}

/**
 * Save run summary for a local workflow
 */
export function saveLocalRunReport(workflowId: string, runData: any): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${LOCAL_RUNS_PREFIX}${workflowId}`;
    const raw = localStorage.getItem(key);
    const runs: any[] = raw ? JSON.parse(raw) : [];
    runs.unshift({
      _id: `run-${Date.now()}`,
      workflowId,
      ...runData,
      createdAt: new Date().toISOString(),
    });
    // Keep max 20 recent runs locally
    localStorage.setItem(key, JSON.stringify(runs.slice(0, 20)));

    // Update lastRunAt and lastRunStatus on workflow
    const container = getLocalContainer();
    const wf = container.workflows.find((w) => w._id === workflowId);
    if (wf) {
      wf.lastRunAt = new Date().toISOString();
      wf.lastRunStatus = runData.summary?.overallStatus === 'success' ? 'success' : 'failed';
      saveLocalContainer(container);
    }
  } catch (err) {
    console.error('Failed to save local run report:', err);
  }
}

/**
 * Get run history for a local workflow
 */
export function getLocalRunHistory(workflowId: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_RUNS_PREFIX}${workflowId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const CLOUD_SYNC_PREF_KEY = 'wakeup_cloud_sync_enabled';

/**
 * Check if cloud synchronization is enabled in user settings (default: false)
 */
export function isCloudSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CLOUD_SYNC_PREF_KEY) === 'true';
}

/**
 * Enable or disable cloud synchronization in user settings
 */
export function setCloudSyncEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLOUD_SYNC_PREF_KEY, enabled ? 'true' : 'false');
}

/**
 * Get only local workflows created offline/unauthenticated that are not yet synced to MongoDB
 */
export function getUnsyncedLocalWorkflows(): WorkflowData[] {
  const workflows = getLocalWorkflows();
  return workflows.filter((w) => w.isLocalOnly === true || w._id.startsWith('local-flow-'));
}

/**
 * Sync local guest workflows to cloud MongoDB one-by-one sequentially when enabled by user
 */
export async function syncLocalWorkflowsToCloud(
  onStatusChange?: (syncing: boolean, count: number) => void,
  bypassPrefCheck: boolean = false
): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (!bypassPrefCheck && !isCloudSyncEnabled()) return 0;
  const token = localStorage.getItem('wakeup_auth_token');
  if (!token) return 0;

  const unsyncedWorkflows = getUnsyncedLocalWorkflows();
  if (unsyncedWorkflows.length === 0) return 0;

  let syncedCount = 0;
  if (onStatusChange) onStatusChange(true, unsyncedWorkflows.length);

  try {
    for (const flow of unsyncedWorkflows) {
      try {
        await createWorkflow({
          name: flow.name,
          description: flow.description,
          steps: flow.steps,
        });
        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync workflow "${flow.name}" to cloud:`, err);
      }
    }

    // Refetch fresh database workflows to overwrite local storage container cleanly
    try {
      const dbRes = await fetchWorkflows();
      if (dbRes.workflows) {
        setLocalWorkflowsContainer(dbRes.workflows);
      }
    } catch {
      const remaining = getLocalWorkflows().filter((w) => !w.isLocalOnly && !w._id.startsWith('local-flow-'));
      setLocalWorkflowsContainer(remaining);
    }
  } finally {
    if (onStatusChange) onStatusChange(false, syncedCount);
  }

  return syncedCount;
}

function getLocalContainer(): LocalStorageWorkflowContainer {
  if (typeof window === 'undefined') {
    return { version: FLOW_RUNNER_STORAGE_VERSION, updatedAt: new Date().toISOString(), workflows: [] };
  }
  try {
    const raw = localStorage.getItem(LOCAL_WORKFLOWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateLocalStorageWorkflows(parsed);
    }
  } catch {}
  return { version: FLOW_RUNNER_STORAGE_VERSION, updatedAt: new Date().toISOString(), workflows: [] };
}

function saveLocalContainer(container: LocalStorageWorkflowContainer): void {
  if (typeof window === 'undefined') return;
  try {
    container.updatedAt = new Date().toISOString();
    container.version = FLOW_RUNNER_STORAGE_VERSION;
    localStorage.setItem(LOCAL_WORKFLOWS_KEY, JSON.stringify(container));
  } catch (err) {
    console.error('Failed to write local workflows to LocalStorage:', err);
  }
}

function getSampleGuestWorkflowsContainer(): LocalStorageWorkflowContainer {
  const initialSteps: IWorkflowStepData[] = [
    {
      stepId: `step-sample-1`,
      name: '1. User Signup',
      url: 'https://httpbin.org/post',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      queryParams: {},
      bodyPayload: JSON.stringify({ email: 'guest_user@example.com', password: 'securepassword123' }, null, 2),
      expectedStatusCode: 200,
      captureCookies: true,
      carryCookies: true,
      extractVariables: [{ varName: 'userEmail', jsonPath: 'json.email' }],
    },
    {
      stepId: `step-sample-2`,
      name: '2. User Login',
      url: 'https://httpbin.org/post',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      queryParams: {},
      bodyPayload: JSON.stringify({ email: '{{userEmail}}', password: 'securepassword123' }, null, 2),
      expectedStatusCode: 200,
      captureCookies: true,
      carryCookies: true,
      extractVariables: [{ varName: 'authToken', jsonPath: 'json.email' }],
    },
    {
      stepId: `step-sample-3`,
      name: '3. Fetch User Profile',
      url: 'https://httpbin.org/get',
      method: 'GET',
      headers: { Authorization: 'Bearer {{authToken}}' },
      queryParams: {},
      bodyPayload: '',
      expectedStatusCode: 200,
      captureCookies: true,
      carryCookies: true,
      extractVariables: [],
    },
  ];

  const sampleWorkflow: WorkflowData = {
    _id: `local-flow-sample-1`,
    userId: 'guest-local-user',
    name: 'Sample E2E Auth & API Journey',
    description: 'Local-first sample API workflow. Runs directly in browser with WakeUp API Engine.',
    steps: initialSteps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isLocalOnly: true,
  };

  return {
    version: FLOW_RUNNER_STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    workflows: [sampleWorkflow],
  };
}
