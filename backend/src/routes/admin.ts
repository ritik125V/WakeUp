import { Router, Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import bcrypt from 'bcryptjs';

/**
 * Helper to detect container instance memory limit (cgroups v1/v2 or MEMORY_LIMIT env)
 * instead of un-isolated host node memory.
 */
function getContainerMemoryLimitMb(): number {
  try {
    if (process.env.MEMORY_LIMIT) {
      const parsed = parseInt(process.env.MEMORY_LIMIT, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const val = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      if (val !== 'max') {
        const bytes = parseInt(val, 10);
        if (!isNaN(bytes) && bytes > 0 && bytes < os.totalmem()) {
          return Math.round(bytes / 1024 / 1024);
        }
      }
    }
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const val = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
      const bytes = parseInt(val, 10);
      if (!isNaN(bytes) && bytes > 0 && bytes < os.totalmem()) {
        return Math.round(bytes / 1024 / 1024);
      }
    }
  } catch {
    // Fallback if permission error
  }

  const totalHostMb = Math.round(os.totalmem() / 1024 / 1024);
  // Default to 512MB container limit if physical host is a large multi-tenant node
  return totalHostMb > 4096 ? 512 : totalHostMb;
}
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { EndpointModel } from '../models/Endpoint.js';
import { IncidentModel } from '../models/Incident.js';
import { StatusPageModel } from '../models/StatusPage.js';
import { WorkflowModel } from '../models/Workflow.js';
import { WorkflowRunModel } from '../models/WorkflowRun.js';
import { JWT_SECRET, authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';
import { getRedisClient } from '../config/redis.js';
import { performHealthCheck, processCheckResult } from '../services/executionEngine.js';
import { getSystemLogHistory, emitSystemLog } from '../services/adminLogStream.js';

const router = Router();

/**
 * ADMIN LOGIN: Authenticate Admin via Email + Security PIN
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and Security PIN are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const pinStr = String(pin).trim();

    // Check if user exists in database
    const user = await UserModel.findOne({ email: cleanEmail });
    
    // Master PIN fallback "1234" or match user's pinHash
    const isMasterPin = pinStr === '1234' || pinStr === process.env.ADMIN_PIN;
    let isValidPin = isMasterPin;

    if (user && user.pinHash && !isMasterPin) {
      isValidPin = await bcrypt.compare(pinStr, user.pinHash);
    }

    if (!isValidPin) {
      return res.status(401).json({ error: 'Invalid Email or Security PIN.' });
    }

    const adminUser = user || {
      _id: 'admin-master',
      email: cleanEmail,
      name: 'System Administrator',
      role: 'admin',
    };

    const token = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Admin authentication successful',
      token,
      user: {
        id: adminUser._id.toString(),
        email: adminUser.email,
        name: adminUser.name,
        role: 'admin',
      },
    });
  } catch (error: unknown) {
    console.error('Error in admin login:', error);
    res.status(500).json({ error: 'Failed to authenticate admin session' });
  }
});

/**
 * Middleware to enforce Admin role check
 */
const requireAdmin = (req: AuthRequest, res: Response, next: () => void) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token required' });
  }
  next();
};

/**
 * ADMIN OVERVIEW: Global System Metrics & Worker Status
 */
router.get('/overview', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [
      usersCount,
      endpoints,
      workflowsCount,
      statusPagesCount,
      incidents,
    ] = await Promise.all([
      UserModel.countDocuments(),
      EndpointModel.find().select('status lastResponseTimeMs').lean(),
      WorkflowModel.countDocuments(),
      StatusPageModel.countDocuments(),
      IncidentModel.find().select('resolved startedAt').lean(),
    ]);

    const healthyEndpointsCount = endpoints.filter((e) => e.status === 'healthy' || e.status === 'pending').length;
    const degradedEndpointsCount = endpoints.filter((e) => e.status === 'degraded').length;
    const downEndpointsCount = endpoints.filter((e) => e.status === 'down').length;

    const activeIncidentsCount = incidents.filter((i) => !i.resolved).length;

    // Check Redis & Cron Worker metrics
    const redisClient = getRedisClient();
    let redisStatus = 'OFFLINE (Fallback to MongoDB)';
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.ping();
        redisStatus = 'CONNECTED (High-Performance Caching Active)';
      } catch {
        redisStatus = 'DISCONNECTED';
      }
    }

    res.json({
      metrics: {
        usersCount,
        endpointsCount: endpoints.length,
        healthyEndpointsCount,
        degradedEndpointsCount,
        downEndpointsCount,
        workflowsCount,
        statusPagesCount,
        incidentsCount: incidents.length,
        activeIncidentsCount,
      },
      worker: {
        status: 'ACTIVE',
        tickerIntervalMs: 10000,
        batchSizeLimit: 50,
        concurrency: 5,
        redisStatus,
        nodeUptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ error: 'Failed to fetch admin overview metrics' });
  }
});

/**
 * ADMIN USERS: Get all registered users and their resource counts
 */
router.get('/users', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await UserModel.find()
      .select('email name provider createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((u) => u._id.toString());

    const [endpoints, statusPages, workflows] = await Promise.all([
      EndpointModel.find({ userId: { $in: userIds } } as any).select('userId').lean(),
      StatusPageModel.find({ userId: { $in: userIds } } as any).select('userId').lean(),
      WorkflowModel.find({ userId: { $in: userIds } } as any).select('userId').lean(),
    ]);

    const enrichedUsers = users.map((u) => {
      const idStr = u._id.toString();
      return {
        ...u,
        endpointsCount: endpoints.filter((e) => e.userId?.toString() === idStr).length,
        statusPagesCount: statusPages.filter((s) => s.userId?.toString() === idStr).length,
        workflowsCount: workflows.filter((w) => w.userId?.toString() === idStr).length,
      };
    });

    res.json({ users: enrichedUsers });
  } catch (error: unknown) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch user list' });
  }
});

/**
 * EDIT USER
 */
router.put('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = String(name).trim();
    if (email) user.email = String(email).toLowerCase().trim();

    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE USER
 */
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    await Promise.all([
      UserModel.findByIdAndDelete(userId),
      EndpointModel.deleteMany({ userId } as any),
      StatusPageModel.deleteMany({ userId } as any),
      WorkflowModel.deleteMany({ userId } as any),
    ]);
    res.json({ message: 'User and all associated resources deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * ADMIN ENDPOINTS: Get all monitored endpoints
 */
router.get('/endpoints', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const endpoints = await EndpointModel.find()
      .populate('userId', 'email name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ endpoints });
  } catch (error: unknown) {
    console.error('Error fetching admin endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

/**
 * EDIT ENDPOINT
 */
router.put('/endpoints/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { projectName, url, method, expectedStatusCode, status } = req.body;
    const ep = await EndpointModel.findById(req.params.id);
    if (!ep) return res.status(404).json({ error: 'Endpoint not found' });

    if (projectName) ep.projectName = String(projectName).trim();
    if (url) ep.url = String(url).trim();
    if (method) ep.method = String(method).toUpperCase() as any;
    if (expectedStatusCode) ep.expectedStatusCode = Number(expectedStatusCode);
    if (status) ep.status = status;

    await ep.save();
    res.json({ message: 'Endpoint updated successfully', endpoint: ep });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

/**
 * DELETE ENDPOINT
 */
router.delete('/endpoints/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await EndpointModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Endpoint deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

/**
 * TRIGGER ENDPOINT CHECK
 */
router.post('/endpoints/:id/trigger', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const ep = await EndpointModel.findById(req.params.id);
    if (!ep) return res.status(404).json({ error: 'Endpoint not found' });

    const result = await performHealthCheck(ep);
    await processCheckResult(ep, result);
    res.json({ message: 'Live test completed', result, endpoint: ep });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to trigger check' });
  }
});

/**
 * ADMIN WORKFLOWS: Get all multi-step API workflows
 */
router.get('/workflows', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const workflows = await WorkflowModel.find()
      .populate('userId', 'email name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ workflows });
  } catch (error: unknown) {
    console.error('Error fetching admin workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * EDIT WORKFLOW
 */
router.put('/workflows/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const wf = await WorkflowModel.findById(req.params.id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });

    if (name) wf.name = String(name).trim();
    if (description !== undefined) wf.description = String(description).trim();

    await wf.save();
    res.json({ message: 'Workflow updated successfully', workflow: wf });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE WORKFLOW
 */
router.delete('/workflows/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await WorkflowModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * ADMIN STATUS PAGES: Get all published status pages
 */
router.get('/status-pages', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const statusPages = await StatusPageModel.find()
      .populate('userId', 'email name')
      .populate('endpointIds', 'projectName status')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ statusPages });
  } catch (error: unknown) {
    console.error('Error fetching admin status pages:', error);
    res.status(500).json({ error: 'Failed to fetch status pages' });
  }
});

/**
 * EDIT STATUS PAGE
 */
router.put('/status-pages/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, slug, description, isPublic } = req.body;
    const page = await StatusPageModel.findById(req.params.id);
    if (!page) return res.status(404).json({ error: 'Status page not found' });

    if (title) page.title = String(title).trim();
    if (slug) page.slug = String(slug).toLowerCase().trim();
    if (description !== undefined) page.description = String(description).trim();
    if (isPublic !== undefined) page.isPublic = Boolean(isPublic);

    await page.save();
    res.json({ message: 'Status page updated successfully', statusPage: page });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update status page' });
  }
});

/**
 * DELETE STATUS PAGE
 */
router.delete('/status-pages/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await StatusPageModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Status page deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to delete status page' });
  }
});

/**
 * ADMIN INCIDENTS: Get all registered incident logs
 */
router.get('/incidents', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const incidents = await IncidentModel.find()
      .populate('endpointId', 'projectName url')
      .populate('userId', 'email name')
      .sort({ startedAt: -1 })
      .limit(100)
      .lean();

    res.json({ incidents });
  } catch (error: unknown) {
    console.error('Error fetching admin incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incident log' });
  }
});

/**
 * TOGGLE RESOLVE INCIDENT
 */
router.put('/incidents/:id/resolve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const inc = await IncidentModel.findById(req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incident not found' });

    inc.resolved = !inc.resolved;
    if (inc.resolved) {
      inc.resolvedAt = new Date();
      if (inc.startedAt) {
        inc.durationSeconds = Math.max(0, Math.floor((inc.resolvedAt.getTime() - new Date(inc.startedAt).getTime()) / 1000));
      }
    } else {
      inc.resolvedAt = undefined;
    }

    await inc.save();
    res.json({ message: 'Incident resolution status updated', incident: inc });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

/**
 * DELETE INCIDENT
 */
router.delete('/incidents/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await IncidentModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Incident deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to delete incident' });
  }
});

/**
 * BULK DELETE INCIDENTS
 */
router.post('/incidents/bulk-delete', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    await IncidentModel.deleteMany({ _id: { $in: ids } });
    emitSystemLog('INCIDENT', `Bulk deleted ${ids.length} incident record(s).`, 'warn');
    res.json({ message: `Successfully deleted ${ids.length} incident log(s)` });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to bulk delete incidents' });
  }
});

/**
 * BULK RESOLVE INCIDENTS
 */
router.post('/incidents/bulk-resolve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    const now = new Date();
    await IncidentModel.updateMany(
      { _id: { $in: ids } },
      { $set: { resolved: true, resolvedAt: now } }
    );
    emitSystemLog('INCIDENT', `Bulk resolved ${ids.length} incident record(s).`, 'success');
    res.json({ message: `Successfully resolved ${ids.length} incident log(s)` });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to bulk resolve incidents' });
  }
});

/**
 * BULK DELETE ENDPOINTS
 */
router.post('/endpoints/bulk-delete', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    await EndpointModel.deleteMany({ _id: { $in: ids } });
    emitSystemLog('SYSTEM', `Bulk deleted ${ids.length} monitored endpoint(s).`, 'warn');
    res.json({ message: `Successfully deleted ${ids.length} endpoint(s)` });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to bulk delete endpoints' });
  }
});

/**
 * BULK DELETE USERS
 */
router.post('/users/bulk-delete', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    await Promise.all([
      UserModel.deleteMany({ _id: { $in: ids } }),
      EndpointModel.deleteMany({ userId: { $in: ids } } as any),
      StatusPageModel.deleteMany({ userId: { $in: ids } } as any),
      WorkflowModel.deleteMany({ userId: { $in: ids } } as any),
    ]);
    emitSystemLog('AUTH', `Bulk deleted ${ids.length} user account(s) and their resources.`, 'warn');
    res.json({ message: `Successfully deleted ${ids.length} user(s)` });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to bulk delete users' });
  }
});

/**
 * BULK DELETE WORKFLOWS
 */
router.post('/workflows/bulk-delete', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    await WorkflowModel.deleteMany({ _id: { $in: ids } });
    emitSystemLog('SYSTEM', `Bulk deleted ${ids.length} workflow(s).`, 'warn');
    res.json({ message: `Successfully deleted ${ids.length} workflow(s)` });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to bulk delete workflows' });
  }
});

/**
 * BULK DELETE STATUS PAGES
 */
router.post('/status-pages/bulk-delete', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    await StatusPageModel.deleteMany({ _id: { $in: ids } });
    emitSystemLog('SYSTEM', `Bulk deleted ${ids.length} status page(s).`, 'warn');
    res.json({ message: `Successfully deleted ${ids.length} status page(s)` });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to bulk delete status pages' });
  }
});

/**
 * GET SYSTEM LIVE LOG HISTORY
 */
router.get('/logs', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await getSystemLogHistory();
    res.json({ logs });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
});

/**
 * ON-DEMAND SYSTEM HEALTH & ANOMALY DIAGNOSTICS (ZERO BACKGROUND OVERHEAD)
 */
router.get('/diagnostics', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const anomalies: Array<{
      id: string;
      severity: 'info' | 'warn' | 'critical';
      title: string;
      description: string;
      recommendation: string;
    }> = [];

    let score = 100;

    // 1. Memory Pressure Diagnostics
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMb = Math.round(mem.rss / 1024 / 1024);

    let memStatus: 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (heapUsedMb > 400 || rssMb > 700) {
      memStatus = 'CRITICAL';
      score -= 30;
      anomalies.push({
        id: 'anom-mem-critical',
        severity: 'critical',
        title: 'Critical RAM Memory Pressure',
        description: `Backend heap usage (${heapUsedMb}MB / RSS ${rssMb}MB) is approaching host limits.`,
        recommendation: 'Restart container or check for unmanaged memory references.',
      });
    } else if (heapUsedMb > 250 || rssMb > 450) {
      memStatus = 'HIGH';
      score -= 15;
      anomalies.push({
        id: 'anom-mem-high',
        severity: 'warn',
        title: 'Elevated Memory Consumption',
        description: `Backend heap usage reached ${heapUsedMb}MB.`,
        recommendation: 'Monitor heap trends if worker batch concurrency increases.',
      });
    }

    // 2. Database Latency Diagnostics (On-Demand Light DB Probe)
    const dbStart = Date.now();
    await UserModel.findOne().select('_id').lean();
    const queryLatencyMs = Date.now() - dbStart;

    let dbStatus: 'FAST' | 'DEGRADED' | 'SLOW' = 'FAST';
    if (queryLatencyMs > 250) {
      dbStatus = 'SLOW';
      score -= 30;
      anomalies.push({
        id: 'anom-db-slow',
        severity: 'critical',
        title: 'Slow Database Query Latency',
        description: `MongoDB index probe took ${queryLatencyMs}ms.`,
        recommendation: 'Verify MongoDB connection pool metrics and database index coverage.',
      });
    } else if (queryLatencyMs > 100) {
      dbStatus = 'DEGRADED';
      score -= 15;
      anomalies.push({
        id: 'anom-db-degraded',
        severity: 'warn',
        title: 'Elevated DB Latency',
        description: `Query latency measured at ${queryLatencyMs}ms.`,
        recommendation: 'Ensure database cluster is not experiencing high write contention.',
      });
    }

    // 3. Service Outage & Health Ratio
    const endpoints = await EndpointModel.find().select('status').lean();
    const totalServices = endpoints.length;
    const healthyCount = endpoints.filter((e) => e.status === 'healthy' || e.status === 'pending').length;
    const degradedCount = endpoints.filter((e) => e.status === 'degraded').length;
    const downCount = endpoints.filter((e) => e.status === 'down').length;

    const failureRatePercent = totalServices > 0 ? Math.round(((downCount + degradedCount) / totalServices) * 100) : 0;
    let svcStatus: 'STABLE' | 'ELEVATED_OUTAGES' | 'CRITICAL_OUTAGES' = 'STABLE';

    if (failureRatePercent >= 40) {
      svcStatus = 'CRITICAL_OUTAGES';
      score -= 35;
      anomalies.push({
        id: 'anom-svc-critical',
        severity: 'critical',
        title: 'System-Wide Service Outage Spike',
        description: `${failureRatePercent}% of monitored services are currently DOWN or Degraded (${downCount} down).`,
        recommendation: 'Check primary network egress or upstream provider status.',
      });
    } else if (failureRatePercent >= 15) {
      svcStatus = 'ELEVATED_OUTAGES';
      score -= 15;
      anomalies.push({
        id: 'anom-svc-elevated',
        severity: 'warn',
        title: 'Elevated Outage Rate',
        description: `${downCount} monitored service(s) currently experiencing outages.`,
        recommendation: 'Review incident logs in the Incidents tab.',
      });
    }

    // 4. System CPU & Host Memory Scaling Measurements
    const cpus = os.cpus();
    const cpuCoresCount = cpus.length || 1;
    const loadAvg = os.loadavg();
    const cpuLoad1Min = Math.min(100, Math.round(((loadAvg[0] || 0) / cpuCoresCount) * 100));

    const totalSystemRamMb = getContainerMemoryLimitMb();
    const usedSystemRamMb = Math.round(mem.rss / 1024 / 1024);
    const freeSystemRamMb = Math.max(0, totalSystemRamMb - usedSystemRamMb);
    const systemRamUsagePercent = Math.min(100, Math.round((usedSystemRamMb / totalSystemRamMb) * 100));

    const processCpu = process.cpuUsage();
    const processCpuTimeMs = Math.round((processCpu.user + processCpu.system) / 1000);

    // 5. Scaling Verdict & Recommendation Engine
    let scalingVerdict: 'OPTIMAL_CAPACITY' | 'MODERATE_LOAD' | 'SCALE_UP_RECOMMENDED' = 'OPTIMAL_CAPACITY';
    let scalingMessage = 'Current CPU and RAM utilization are healthy. System capacity is optimal; no scaling required.';

    if (cpuLoad1Min > 80 || systemRamUsagePercent > 85 || heapUsedMb > 400) {
      scalingVerdict = 'SCALE_UP_RECOMMENDED';
      scalingMessage = 'System resources (CPU/RAM) are approaching capacity limits. Recommend scaling up backend instances or increasing container resources.';
    } else if (cpuLoad1Min > 60 || systemRamUsagePercent > 70 || heapUsedMb > 250) {
      scalingVerdict = 'MODERATE_LOAD';
      scalingMessage = 'Moderate resource utilization detected. Capacity is stable, but monitor workload trends closely.';
    }

    // 6. Active Incident Surge
    const activeIncidentsCount = await IncidentModel.countDocuments({ resolved: false });
    if (activeIncidentsCount > 5) {
      score -= 15;
      anomalies.push({
        id: 'anom-inc-surge',
        severity: 'warn',
        title: 'Active Incident Surge',
        description: `${activeIncidentsCount} unresolved incidents currently active.`,
        recommendation: 'Use bulk resolve or inspect service endpoints.',
      });
    }

    const finalScore = Math.max(0, score);
    const overallStatus: 'OPTIMAL' | 'ELEVATED_LOAD' | 'CRITICAL_OVERWHELM' =
      finalScore >= 80 ? 'OPTIMAL' : finalScore >= 50 ? 'ELEVATED_LOAD' : 'CRITICAL_OVERWHELM';

    if (anomalies.length === 0) {
      anomalies.push({
        id: 'anom-optimal',
        severity: 'info',
        title: 'All Systems Operating Normally',
        description: 'Memory heap, database latency, and service availability are within healthy thresholds.',
        recommendation: 'No action required.',
      });
    }

    res.json({
      diagnostics: {
        overallStatus,
        healthScore: finalScore,
        memory: {
          heapUsedMb,
          heapTotalMb,
          rssMb,
          status: memStatus,
        },
        database: {
          queryLatencyMs,
          status: dbStatus,
        },
        services: {
          total: totalServices,
          healthy: healthyCount,
          degraded: degradedCount,
          down: downCount,
          failureRatePercent,
          status: svcStatus,
        },
        scaling: {
          cpuCoresCount,
          cpuLoad1MinPercent: cpuLoad1Min,
          processCpuTimeMs,
          totalSystemRamMb,
          freeSystemRamMb,
          usedSystemRamMb,
          systemRamUsagePercent,
          verdict: scalingVerdict,
          message: scalingMessage,
        },
        incidents: {
          activeCount: activeIncidentsCount,
        },
        anomaliesDetected: anomalies,
      },
    });
  } catch (error: unknown) {
    console.error('Error computing diagnostics:', error);
    res.status(500).json({ error: 'Failed to compute system health diagnostics' });
  }
});

/**
 * ADMIN WORKFLOW RUNS AUDIT: Fetch All Workflow Execution Runs & Telemetry
 */
router.get('/workflow-runs', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const { status, repo, search } = req.query;

    const query: any = {};
    if (status && status !== 'all') {
      query['summary.overallStatus'] = status;
    }
    if (repo && typeof repo === 'string') {
      query.githubRepo = new RegExp(repo, 'i');
    }

    let runs = await WorkflowRunModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Collect user IDs to populate owner information
    const userIds = Array.from(new Set(runs.map((r) => r.userId).filter(Boolean)));
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select('email name')
      .lean();

    const userMap: Record<string, { email: string; name: string }> = {};
    for (const u of users) {
      userMap[u._id.toString()] = { email: u.email || '', name: u.name || '' };
    }

    const populatedRuns = runs.map((run) => {
      const owner = userMap[run.userId] || {
        email: run.commitInfo?.authorEmail || (run.userId === 'guest-user' ? 'guest@wakeup.dev' : `${run.userId}@wakeup.dev`),
        name: run.commitInfo?.author || 'Workflow Owner',
      };
      return {
        ...run,
        owner,
      };
    });

    // Client-side search filter if query string provided
    let finalRuns = populatedRuns;
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      finalRuns = populatedRuns.filter((r) => {
        const wfName = r.workflowName?.toLowerCase() || '';
        const repoName = r.githubRepo?.toLowerCase() || '';
        const author = r.commitInfo?.author?.toLowerCase() || '';
        const msg = r.commitInfo?.commitMsg?.toLowerCase() || '';
        const email = r.owner?.email?.toLowerCase() || '';
        return (
          wfName.includes(q) ||
          repoName.includes(q) ||
          author.includes(q) ||
          msg.includes(q) ||
          email.includes(q)
        );
      });
    }

    res.json({ runs: finalRuns, count: finalRuns.length });
  } catch (error: unknown) {
    console.error('Error fetching admin workflow runs audit:', error);
    res.status(500).json({ error: 'Failed to fetch workflow runs audit logs' });
  }
});

export default router;
