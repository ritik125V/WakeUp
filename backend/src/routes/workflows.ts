import { Router, Request, Response } from 'express';
import axios from 'axios';
import { WorkflowModel } from '../models/Workflow';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';
import { runWorkflowExecution, executeSingleStepTest } from '../services/workflowRunner';
import { scanGithubRepositoryEndpoints, listGithubRepoFiles } from '../services/codeEndpointScanner';

const router = Router();

/**
 * PUBLIC UNAUTHENTICATED WEBHOOK: GitHub Push Event Auto-Trigger
 * Called directly by GitHub Webhook servers whenever code is pushed.
 */
router.post('/github-webhook', async (req: Request, res: Response) => {
  try {
    const githubEvent = (req.headers['x-github-event'] as string) || 'push';
    const payload = req.body || {};

    if (githubEvent === 'ping') {
      return res.json({ message: 'GitHub Webhook Ping received! WakeUp Flow Runner connected successfully.' });
    }

    const tokenQuery = (req.query.token as string) || '';
    const repoFullName = (payload.repository?.full_name || payload.repository?.name || '').toLowerCase().trim();
    
    // Extract branch from ref (e.g., 'refs/heads/main' -> 'main')
    const ref = payload.ref || '';
    const branch = ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref || 'main';

    const commitMsg = payload.head_commit?.message?.split('\n')[0] || (payload.head_commit?.id ? payload.head_commit.id.slice(0, 7) : 'Push code update');
    const author = payload.head_commit?.author?.username || payload.pusher?.name || payload.sender?.login || 'github-user';
    const authorEmail = payload.head_commit?.author?.email || payload.pusher?.email || payload.head_commit?.committer?.email || '';

    // Find matching workflows in MongoDB
    const queryConditions: any[] = [];
    if (tokenQuery) {
      queryConditions.push({ githubSecretToken: tokenQuery });
    }
    if (repoFullName) {
      queryConditions.push({ githubRepo: { $regex: new RegExp(`^${repoFullName}$`, 'i') } });
    }

    if (queryConditions.length === 0) {
      return res.status(400).json({ error: 'No repository or token specified in GitHub payload' });
    }

    const matchingWorkflows = await WorkflowModel.find({
      githubEnabled: true,
      $or: queryConditions,
    });

    if (matchingWorkflows.length === 0) {
      return res.json({
        message: 'No active workflows connected to this GitHub repository or token.',
        repository: repoFullName,
        branch,
      });
    }

    const triggeredIds: string[] = [];
    const io = req.app.get('io');

    for (const wf of matchingWorkflows) {
      // Check branch matching if branch is specified
      if (wf.githubBranch && wf.githubBranch !== '*' && wf.githubBranch.toLowerCase() !== branch.toLowerCase()) {
        continue;
      }

      const triggerSource = `GitHub Push (${branch}): "${commitMsg}" by @${author}`;
      wf.lastTriggeredBy = triggerSource;
      wf.lastTriggeredAt = new Date();
      wf.lastRunStatus = 'pending';
      await wf.save();

      // Trigger workflow execution with commit metadata & email options!
      runWorkflowExecution(wf._id.toString(), {
        io,
        targetRoom: `workflow:${wf._id}`,
        triggerSource,
        commitInfo: {
          commitMsg,
          author,
          authorEmail,
          repo: repoFullName,
          branch,
        },
      });
      triggeredIds.push(wf._id.toString());
    }

    res.json({
      message: `Triggered ${triggeredIds.length} workflow(s) automatically via GitHub Push`,
      triggeredWorkflowIds: triggeredIds,
      repository: repoFullName,
      branch,
      commitMsg,
      author,
    });
  } catch (error) {
    console.error('Error handling GitHub webhook:', error);
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

export default router;

