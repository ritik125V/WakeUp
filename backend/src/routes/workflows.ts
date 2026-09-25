import { Router, Request, Response } from 'express';
import axios from 'axios';
import { WorkflowModel } from '../models/Workflow';
import { WorkflowRunModel } from '../models/WorkflowRun';
import { WebhookLogModel } from '../models/WebhookLog';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';
import { runWorkflowExecution, executeSingleStepTest } from '../services/workflowRunner';
import { scanGithubRepositoryEndpoints, listGithubRepoFiles } from '../services/codeEndpointScanner';

const router = Router();

/**
 * GET Endpoint for GitHub Webhook health check & manual browser verification
 */
router.get('/github-webhook', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  console.log(`\n[🔍 GITHUB WEBHOOK HEALTH CHECK] GET hit from ${clientIp} at ${new Date().toISOString()}`);

  try {
    await WebhookLogModel.create({
      githubEvent: 'get_ping',
      repoFullName: 'health_check',
      branch: 'main',
      clientIp,
      headersSnippet: req.headers,
      bodySnippet: 'GET Health Check Ping',
      status: 'PING',
      matchedWorkflowCount: 0,
      receivedAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to log GET webhook ping:', err);
  }

  res.json({
    status: 'ONLINE',
    message: 'WakeUp GitHub Webhook endpoint is online and listening for git push events!',
    endpoint: '/api/workflows/github-webhook',
    timestamp: new Date().toISOString(),
    clientIp,
  });
});

/**
 * GET Endpoint to view recent raw GitHub webhook logs (for user/admin monitoring)
 */
router.get('/github-webhook/logs', async (req: Request, res: Response) => {
  try {
    const logs = await WebhookLogModel.find({}).sort({ receivedAt: -1 }).limit(30).lean();
    res.json({ logs });
  } catch (err) {
    console.error('Failed to fetch webhook logs:', err);
    res.status(500).json({ error: 'Failed to fetch webhook delivery logs' });
  }
});

/**
 * GET Endpoint for GitHub App Config & Installation URL
 */
router.get('/github-app/config', async (req: Request, res: Response) => {
  const appName = process.env.GITHUB_APP_NAME || 'wakeup-runner';
  const installUrl = `https://github.com/apps/${appName}/installations/new`;

  res.json({
    appName,
    installUrl,
    enabled: true,
  });
});

/**
 * GET Endpoint for GitHub App Installation Callback
 * GitHub redirects here after a user authorizes/installs the GitHub App.
 */
router.get('/github-app/callback', async (req: Request, res: Response) => {
  const installationId = (req.query.installation_id as string) || '';
  const workflowId = (req.query.state as string) || '';
  const setupAction = (req.query.setup_action as string) || 'install';
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

  console.log(`\n[⚡ GITHUB APP CALLBACK] Installation ID: ${installationId} | Workflow: ${workflowId} | Action: ${setupAction}`);

  if (workflowId && workflowId.length === 24) {
    try {
      const workflow = await WorkflowModel.findById(workflowId);
      if (workflow) {
        workflow.githubInstallationId = installationId;
        workflow.githubAppConnected = true;
        workflow.githubEnabled = true;
        await workflow.save();
        console.log(`✅ [GITHUB APP LINKED] Workflow "${workflow.name}" linked to Installation ID ${installationId}`);
      }
    } catch (err) {
      console.error('Failed to link GitHub App installation to workflow:', err);
    }
  }

  const redirectUrl = workflowId 
    ? `${frontendUrl}/workflows/${workflowId}?github_app_connected=true` 
    : `${frontendUrl}/workflows?github_app_connected=true`;

  res.redirect(redirectUrl);
});

/**
 * PUBLIC UNAUTHENTICATED WEBHOOK: GitHub Push Event Auto-Trigger
 * Called directly by GitHub Webhook servers whenever code is pushed.
 */
router.post('/github-webhook', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  const githubEvent = (req.headers['x-github-event'] as string) || 'push';
  const payload = req.body || {};

  const tokenQuery = (req.query.token as string) || '';
  const rawRepoName = (payload.repository?.full_name || payload.repository?.name || '').trim();
  const repoFullName = rawRepoName.toLowerCase();
  const repoShortName = (payload.repository?.name || '').toLowerCase().trim();

  // Extract branch from ref (e.g., 'refs/heads/main' -> 'main')
  const ref = payload.ref || '';
  const branch = ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref || 'main';

  const commitHash = payload.head_commit?.id || payload.after || '';
  const commitMsg = payload.head_commit?.message?.split('\n')[0] || (commitHash ? commitHash.slice(0, 7) : 'Push code update');
  const author = payload.head_commit?.author?.username || payload.pusher?.name || payload.sender?.login || 'github-user';
  const authorEmail = payload.head_commit?.author?.email || payload.pusher?.email || payload.head_commit?.committer?.email || '';

  console.log('\n===============================================================');
  console.log(`[🚀 GITHUB WEBHOOK POST RECEIVED] ${new Date().toISOString()}`);
  console.log(`Client IP: ${clientIp} | Event: ${githubEvent} | Query Token: ${tokenQuery || 'None'}`);
  console.log(`Repository: "${rawRepoName}" | Branch: "${branch}"`);
  console.log(`Commit: "${commitMsg}" by @${author} (${commitHash.slice(0, 7)})`);
  console.log('===============================================================\n');

  if (githubEvent === 'ping') {
    try {
      await WebhookLogModel.create({
        githubEvent: 'ping',
        repoFullName: rawRepoName,
        branch,
        commitHash,
        commitMsg: 'GitHub Webhook Ping',
        author,
        authorEmail,
        tokenQuery,
        clientIp,
        headersSnippet: req.headers,
        bodySnippet: JSON.stringify(payload).slice(0, 1000),
        status: 'PING',
        matchedWorkflowCount: 0,
        receivedAt: new Date(),
      });
    } catch (logErr) {
      console.error('Failed to save webhook ping log:', logErr);
    }

    return res.json({
      message: 'GitHub Webhook Ping received! WakeUp Flow Runner connected successfully.',
      repository: rawRepoName,
    });
  }

  try {
    const installationIdPayload = payload.installation?.id ? String(payload.installation.id) : '';

    // Fetch candidate workflows
    const candidateWorkflows = await WorkflowModel.find({
      $or: [
        { githubEnabled: true },
        { githubSecretToken: tokenQuery && tokenQuery.length > 0 ? tokenQuery : 'non_existent_token_xxx' },
        { githubInstallationId: installationIdPayload && installationIdPayload.length > 0 ? installationIdPayload : 'non_existent_inst_xxx' }
      ]
    });

    // Flexible Repository, Token & App Installation Matching Logic
    const matchingWorkflows = candidateWorkflows.filter((wf) => {
      // 0. GitHub App Installation ID match
      if (installationIdPayload && wf.githubInstallationId && wf.githubInstallationId === installationIdPayload) {
        return true;
      }

      // 1. Secret Token match
      if (tokenQuery && wf.githubSecretToken && wf.githubSecretToken === tokenQuery) {
        return true;
      }

      // 2. Must be githubEnabled if token does not explicitly match
      if (!wf.githubEnabled) return false;

      // 3. Match repository name flexibly (full name, short name, URL prefix)
      if (!wf.githubRepo) return false;
      const cleanWfRepo = wf.githubRepo.toLowerCase().replace('https://github.com/', '').trim();
      if (!cleanWfRepo) return false;

      const wfShortName = cleanWfRepo.includes('/') ? cleanWfRepo.split('/').pop()! : cleanWfRepo;

      if (cleanWfRepo === repoFullName || cleanWfRepo === repoShortName) {
        return true;
      }
      if (repoShortName && wfShortName === repoShortName) {
        return true;
      }
      if (repoFullName && (cleanWfRepo.endsWith('/' + repoShortName) || repoFullName.endsWith('/' + wfShortName))) {
        return true;
      }

      return false;
    });

    const matchedIds = matchingWorkflows.map((w) => w._id.toString());
    const webhookStatus = matchingWorkflows.length > 0 ? 'SUCCESS' : 'UNBOUND';

    // ALWAYS Save Webhook Audit Log to MongoDB!
    const logDoc = await WebhookLogModel.create({
      githubEvent,
      repoFullName: rawRepoName,
      branch,
      commitHash,
      commitMsg,
      author,
      authorEmail,
      tokenQuery,
      clientIp,
      headersSnippet: req.headers,
      bodySnippet: JSON.stringify(payload).slice(0, 1000),
      status: webhookStatus,
      matchedWorkflowCount: matchingWorkflows.length,
      matchedWorkflowIds: matchedIds,
      receivedAt: new Date(),
    });

    console.log(`[GitHub Webhook Log Saved] ID: ${logDoc._id} | Status: ${webhookStatus} | Matched: ${matchingWorkflows.length} workflow(s)`);

    if (matchingWorkflows.length === 0) {
      // Create WorkflowRun audit record for unbound webhooks
      try {
        await WorkflowRunModel.create({
          workflowId: 'unbound_webhook',
          userId: 'system',
          workflowName: `Unbound GitHub Push: ${rawRepoName || 'Unknown Repo'}`,
          triggerSource: 'unbound_webhook',
          githubRepo: rawRepoName,
          githubBranch: branch,
          commitInfo: {
            commitMsg,
            author,
            authorEmail,
            commitHash,
            repo: rawRepoName,
            branch,
          },
          summary: {
            totalSteps: 0,
            successSteps: 0,
            failedSteps: 1,
            totalTimeMs: Date.now() - startTime,
            overallStatus: 'UNBOUND_WEBHOOK',
            startedAt: new Date(startTime),
            finishedAt: new Date(),
          },
          stepLogs: [
            {
              stepIndex: 1,
              stepId: 'unbound-step',
              stepName: 'Webhook Delivery Audit',
              method: 'POST',
              url: req.originalUrl,
              requestHeaders: req.headers as Record<string, string>,
              latencyMs: Date.now() - startTime,
              status: 'failed',
              errorMessage: `GitHub webhook received for repo "${rawRepoName}" on branch "${branch}", but no active workflow matched the repo binding or secret token.`,
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } catch (logErr) {
        console.error('Failed to log unbound workflow run:', logErr);
      }

      return res.json({
        message: 'GitHub Webhook received & logged in DB, but no active matching workflow was found.',
        webhookLogId: logDoc._id,
        repository: rawRepoName,
        branch,
        commitMsg,
        author,
      });
    }

    const triggeredIds: string[] = [];
    const io = req.app.get('io');

    for (const wf of matchingWorkflows) {
      // Check branch matching if branch is specified (and not wildcard '*')
      if (wf.githubBranch && wf.githubBranch !== '*' && wf.githubBranch.toLowerCase() !== branch.toLowerCase()) {
        console.log(`[Branch Mismatch] Workflow "${wf.name}" target branch (${wf.githubBranch}) !== push branch (${branch}). Skipping.`);
        continue;
      }

      const triggerSource = `GitHub Push (${branch}): "${commitMsg}" by @${author}`;
      wf.lastTriggeredBy = triggerSource;
      wf.lastTriggeredAt = new Date();
      wf.lastRunStatus = 'pending';
      await wf.save();

      console.log(`[🚀 Executing Workflow] ID: ${wf._id} | Name: "${wf.name}" | Steps: ${wf.steps.length}`);

      // Trigger workflow execution with complete commit metadata
      runWorkflowExecution(wf._id.toString(), {
        io,
        targetRoom: `workflow:${wf._id}`,
        triggerSource: 'github_commit',
        commitInfo: {
          commitMsg,
          author,
          authorEmail,
          commitHash,
          repo: rawRepoName || wf.githubRepo,
          branch,
        },
      });
      triggeredIds.push(wf._id.toString());
    }

    res.json({
      message: `Triggered ${triggeredIds.length} workflow(s) automatically via GitHub Push`,
      webhookLogId: logDoc._id,
      triggeredWorkflowIds: triggeredIds,
      repository: rawRepoName,
      branch,
      commitMsg,
      author,
    });
  } catch (error) {
    console.error('Error handling GitHub webhook:', error);

    try {
      await WebhookLogModel.create({
        githubEvent,
        repoFullName: rawRepoName,
        branch,
        commitHash,
        commitMsg,
        author,
        clientIp,
        headersSnippet: req.headers,
        bodySnippet: JSON.stringify(payload).slice(0, 1000),
        status: 'ERROR',
        matchedWorkflowCount: 0,
        receivedAt: new Date(),
      });
    } catch {
      // ignore secondary log error
    }

    res.status(500).json({ error: 'Failed to process GitHub webhook' });
  }
});

// Protect all remaining routes with JWT Auth
router.use(authenticateToken as any);

/**
 * Test a single API step in isolation
 */
router.post('/test-step', async (req: AuthRequest, res: Response) => {
  try {
    const { step, variablesContext, cookiesContext } = req.body;
    if (!step || !step.url || !step.method) {
      return res.status(400).json({ error: 'Valid step data (url, method) is required' });
    }

    const result = await executeSingleStepTest(step, variablesContext || {}, cookiesContext || {});
    res.json({ result });
  } catch (error) {
    console.error('Error testing single step:', error);
    res.status(500).json({ error: 'Failed to execute single step test' });
  }
});

/**
 * Get all workflows for current user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const workflows = await WorkflowModel.find({ userId }).sort({ updatedAt: -1 });
    res.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * Get single workflow details
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const workflow = await WorkflowModel.findOne({ _id: req.params.id, userId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ workflow });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * Create a new workflow
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const { name, description, steps, githubEnabled, githubRepo, githubBranch, notificationEmail } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const defaultSteps = steps || [
      {
        stepId: 'step-1',
        name: 'Initial Step',
        url: 'https://httpbin.org/get',
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        queryParams: {},
        bodyPayload: '',
        expectedStatusCode: 200,
        captureCookies: true,
        carryCookies: true,
        extractVariables: [],
      },
    ];

    const workflow = await WorkflowModel.create({
      userId,
      name: name.trim(),
      description: description || '',
      steps: defaultSteps,
      githubEnabled: Boolean(githubEnabled),
      githubRepo: githubRepo || '',
      githubBranch: githubBranch || 'main',
      notificationEmail: notificationEmail || '',
    });

    res.status(201).json({ message: 'Workflow created successfully', workflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * Update workflow definition (steps, name, description, github settings, notification email)
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const { name, description, steps, githubEnabled, githubRepo, githubBranch, githubSecretToken, notificationEmail } = req.body;

    const workflow = await WorkflowModel.findOne({ _id: req.params.id, userId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (steps !== undefined) workflow.steps = steps;
    if (githubEnabled !== undefined) workflow.githubEnabled = Boolean(githubEnabled);
    if (githubRepo !== undefined) workflow.githubRepo = githubRepo.trim();
    if (githubBranch !== undefined) workflow.githubBranch = githubBranch.trim();
    if (githubSecretToken !== undefined) workflow.githubSecretToken = githubSecretToken;
    if (notificationEmail !== undefined) workflow.notificationEmail = notificationEmail.trim();

    await workflow.save();
    res.json({ message: 'Workflow updated successfully', workflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * Delete workflow
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const workflow = await WorkflowModel.findOneAndDelete({ _id: req.params.id, userId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * Trigger workflow execution via REST API
 */
router.post('/:id/run', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const workflow = await WorkflowModel.findOne({ _id: req.params.id, userId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ error: 'Socket.IO server not initialized' });
    }

    // Run execution in background (fire & stream via WebSocket)
    runWorkflowExecution(workflow._id.toString(), {
      io,
      targetRoom: `workflow:${workflow._id}`,
      triggerSource: `Manual Dashboard Run by User`,
    });

    res.json({ message: 'Workflow execution started', workflowId: workflow._id });
  } catch (error) {
    console.error('Error starting workflow:', error);
    res.status(500).json({ error: 'Failed to start workflow execution' });
  }
});

/**
 * Test simulate a GitHub push event directly from the dashboard
 */
router.post('/:id/github-test-trigger', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const workflow = await WorkflowModel.findOne({ _id: req.params.id, userId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const branch = workflow.githubBranch || 'main';
    const repoName = workflow.githubRepo || 'user/repository';
    const commitMsg = `Test simulated git push to ${branch}`;
    const author = req.user?.email ? req.user.email.split('@')[0] : 'dev-user';
    const authorEmail = req.user?.email || '';

    const triggerSource = `Simulated GitHub Push (${branch}): "${commitMsg}" by @${author}`;
    workflow.lastTriggeredBy = triggerSource;
    workflow.lastTriggeredAt = new Date();
    workflow.lastRunStatus = 'pending';
    await workflow.save();

    const io = req.app.get('io');
    runWorkflowExecution(workflow._id.toString(), {
      io,
      targetRoom: `workflow:${workflow._id}`,
      triggerSource,
      commitInfo: {
        commitMsg,
        author,
        authorEmail,
        repo: repoName,
        branch,
      },
    });

    res.json({
      message: 'Simulated GitHub Push trigger fired successfully',
      triggeredBy: workflow.lastTriggeredBy,
      repoName,
      branch,
    });
  } catch (error) {
    console.error('Error in github test trigger:', error);
    res.status(500).json({ error: 'Failed to simulate GitHub Push trigger' });
  }
});

/**
 * Fetch GitHub user repositories automatically (via GitHub Username or Access Token)
 */
router.get('/github/repos', async (req: AuthRequest, res: Response) => {
  try {
    const username = (req.query.username as string || '').trim();
    const token = (req.query.token as string || '').trim();

    if (!username && !token) {
      return res.status(400).json({ error: 'Please provide a GitHub username or Personal Access Token' });
    }

    let url = 'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member';
    const headers: Record<string, string> = {
      'User-Agent': 'WakeUp-Monitoring-App',
      'Accept': 'application/vnd.github+json',
    };

    const cleanToken = token ? token.trim().replace(/^['"`]+|['"`]+$/g, '').replace(/^(Bearer|token)\s+/i, '') : '';

    if (cleanToken) {
      headers['Authorization'] = `Bearer ${cleanToken}`;
    } else if (username) {
      url = `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`;
    }

    const ghRes = await axios.get(url, { headers, timeout: 10000 });
    const rawRepos = Array.isArray(ghRes.data) ? ghRes.data : [];

    const repos = rawRepos.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner?.login || '',
      default_branch: r.default_branch || 'main',
      private: Boolean(r.private),
      html_url: r.html_url,
      updated_at: r.updated_at,
      description: r.description || '',
    }));

    res.json({ repos, count: repos.length });
  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error?.response?.data || error?.message);
    const status = error?.response?.status || 500;
    const msg = error?.response?.data?.message || error?.message || 'Failed to fetch GitHub repositories';
    res.status(status).json({ error: msg });
  }
});

/**
 * Automatically create Webhook on GitHub repository via GitHub REST API
 */
router.post('/github/create-webhook', async (req: AuthRequest, res: Response) => {
  try {
    const { repoFullName, token, webhookUrl } = req.body;

    if (!repoFullName || !token || !webhookUrl) {
      return res.status(400).json({ error: 'repoFullName, token, and webhookUrl are required' });
    }

    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Invalid repository full_name format. Expected owner/repo.' });
    }

    const ghRes = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        name: 'web',
        active: true,
        events: ['push'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          insecure_ssl: '0',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'WakeUp-Monitoring-App',
        },
        timeout: 10000,
      }
    );

    res.json({
      message: `Successfully created Webhook on GitHub repo ${repoFullName}!`,
      hookId: ghRes.data.id,
      repoFullName,
    });
  } catch (error: any) {
    console.error('Error creating GitHub webhook:', error?.response?.data || error?.message);
    const msg = error?.response?.data?.message || 'Failed to auto-create GitHub webhook. Ensure token has admin:repo_hook or repo permissions.';
    res.status(500).json({ error: msg });
  }
});

/**
 * List files in a GitHub repo tree available for scanning
 */
router.post('/github/files', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { repoFullName, token, branch = 'main' } = req.body;
    if (!repoFullName) {
      return res.status(400).json({ error: 'repoFullName is required' });
    }
    const files = await listGithubRepoFiles(repoFullName, token, branch);
    res.json({ files, count: files.length });
  } catch (error: any) {
    console.error('Error listing repo files:', error?.message);
    res.status(500).json({ error: error.message || 'Failed to list repo files' });
  }
});

/**
 * Scan GitHub repository (or selected files) for API endpoints
 */
router.post('/github/scan-endpoints', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { repoFullName, token, targetFiles, branch = 'main' } = req.body;
    if (!repoFullName) {
      return res.status(400).json({ error: 'repoFullName is required' });
    }

    const endpoints = await scanGithubRepositoryEndpoints(repoFullName, token, targetFiles, branch);
    res.json({ endpoints, count: endpoints.length });
  } catch (error: any) {
    console.error('Error scanning repo endpoints:', error?.message);
    res.status(500).json({ error: error.message || 'Failed to scan repository endpoints' });
  }
});

/**
 * Import scanned endpoints as steps into an existing workflow
 */
router.post('/:id/import-scanned-steps', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'guest-user';
    const { endpoints, baseUrl = 'https://api.example.com', replaceExisting = false } = req.body;

    if (!Array.isArray(endpoints) || endpoints.length === 0) {
      return res.status(400).json({ error: 'endpoints array is required and cannot be empty' });
    }

    const workflow = await WorkflowModel.findOne({ _id: id, userId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    const newSteps = endpoints.map((ep: any, idx: number) => {
      const cleanPath = ep.path.startsWith('/') ? ep.path : `/${ep.path}`;
      const fullUrl = cleanBaseUrl ? `${cleanBaseUrl}${cleanPath}` : cleanPath;
      const stepName = ep.name || `${ep.method} ${cleanPath}`;
      const stepId = `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`;

      return {
        stepId,
        name: stepName,
        url: fullUrl,
        method: ep.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        queryParams: {},
        bodyPayload: ep.suggestedBody || (['POST', 'PUT', 'PATCH'].includes(ep.method) ? '{\n  "key": "value"\n}' : ''),
        expectedStatusCode: ep.expectedStatus || 200,
        captureCookies: true,
        carryCookies: true,
        skipped: false,
        extractVariables: [],
      };
    });

    if (replaceExisting) {
      workflow.steps = newSteps as any;
    } else {
      workflow.steps.push(...(newSteps as any));
    }

    await workflow.save();

    res.json({
      message: `Successfully imported ${newSteps.length} step(s) into workflow!`,
      workflow,
      importedCount: newSteps.length,
    });
  } catch (error: any) {
    console.error('Error importing scanned steps:', error?.message);
    res.status(500).json({ error: error.message || 'Failed to import scanned steps' });
  }
});
/**
 * Persist client-side / browser-direct execution report to DB
 */
router.post('/:id/runs', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { summary, stepLogs, triggerSource, commitInfo, githubRepo, githubBranch } = req.body;

    const workflow = await WorkflowModel.findById(id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const runDoc = await WorkflowRunModel.create({
      workflowId: workflow._id,
      userId: workflow.userId || 'guest-user',
      workflowName: workflow.name,
      triggerSource: triggerSource || 'browser_direct',
      githubRepo: githubRepo || workflow.githubRepo || '',
      githubBranch: githubBranch || workflow.githubBranch || 'main',
      commitInfo: commitInfo || {},
      summary: summary || {
        totalSteps: workflow.steps.length,
        successSteps: stepLogs ? stepLogs.filter((s: any) => s.status === 'success').length : 0,
        failedSteps: stepLogs ? stepLogs.filter((s: any) => s.status === 'failed' || s.status === 'error').length : 0,
        totalTimeMs: 0,
        overallStatus: 'success',
        startedAt: new Date(),
        finishedAt: new Date(),
      },
      stepLogs: stepLogs || [],
    });

    await WorkflowModel.updateOne(
      { _id: id },
      {
        $set: {
          lastRunStatus: runDoc.summary.overallStatus,
          lastTriggeredAt: new Date(),
        },
      }
    );

    res.status(201).json({ message: 'Execution run report saved successfully', run: runDoc });
  } catch (error: any) {
    console.error('Error saving workflow run report:', error?.message);
    res.status(500).json({ error: 'Failed to save workflow run report' });
  }
});

/**
 * Fetch execution run history for a workflow
 */
router.get('/:id/runs', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const runs = await WorkflowRunModel.find({ workflowId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ runs, count: runs.length });
  } catch (error: any) {
    console.error('Error fetching workflow run history:', error?.message);
    res.status(500).json({ error: 'Failed to fetch workflow run history' });
  }
});

/**
 * Fetch details of a specific execution run report
 */
router.get('/runs/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const run = await WorkflowRunModel.findById(runId).lean();
    if (!run) {
      return res.status(404).json({ error: 'Workflow run report not found' });
    }
    res.json({ run });
  } catch (error: any) {
    console.error('Error fetching workflow run details:', error?.message);
    res.status(500).json({ error: 'Failed to fetch workflow run details' });
  }
});

export default router;

