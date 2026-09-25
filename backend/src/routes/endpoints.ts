import mongoose from 'mongoose';
import { Router, Request, Response } from 'express';
import { EndpointModel, extractProjectName } from '../models/Endpoint.js';
import { IncidentModel } from '../models/Incident.js';
import { assignBatch } from '../services/redisScheduler.js';
import { performHealthCheck, processCheckResult } from '../services/executionEngine.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// Apply auth middleware to all endpoint operations
router.use(authenticateToken as any);


/**
 * Register a new endpoint / backend service
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { url, name, method = 'GET', expectedStatusCode = 200, checkIntervalMinutes = 5 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const userId = req.user?.id || 'guest-user';
    const projectName = name ? String(name).trim().toUpperCase() : extractProjectName(url);

    // Create endpoint in MongoDB
    const endpoint = await EndpointModel.create({
      userId,
      projectName,
      url,
      method,
      expectedStatusCode,
      checkIntervalMinutes,
      batchId: 'unassigned',
      status: 'pending',
    });

    // Assign batch and schedule in Redis
    const batchId = await assignBatch(endpoint._id.toString(), checkIntervalMinutes);

    // Run initial health check asynchronously immediately
    performHealthCheck(endpoint).then((result) => {
      processCheckResult(endpoint, result);
    });

    res.status(201).json({
      message: 'Endpoint registered successfully',
      endpoint: {
        ...endpoint.toObject(),
        batchId,
      },
    });
  } catch (error: unknown) {
    console.error('Error registering endpoint:', error);
    res.status(500).json({ error: 'Failed to register endpoint' });
  }
});

/**
 * Get all endpoints grouped by project name for current user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const endpoints = await EndpointModel.find({ userId }).sort({ createdAt: -1 });

    // Group endpoints by projectName
    const grouped: Record<string, typeof endpoints> = {};
    for (const ep of endpoints) {
      if (!grouped[ep.projectName]) {
        grouped[ep.projectName] = [];
      }
      grouped[ep.projectName].push(ep);
    }

    res.json({
      projects: grouped,
      totalEndpoints: endpoints.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

/**
 * Get details for a single endpoint with recent incidents
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';

    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) {
      return res.status(404).json({ error: 'Endpoint not found or invalid ID' });
    }

    const endpoint = await EndpointModel.findOne({ _id: req.params.id, userId });
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }


    const incidents = await IncidentModel.find({ endpointId: endpoint._id })
      .sort({ startedAt: -1 })
      .limit(50);

    res.json({ endpoint, incidents });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to fetch endpoint details' });
  }
});

/**
 * Manually trigger a health check for an endpoint
 */
router.post('/:id/trigger', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const endpoint = await EndpointModel.findOne({ _id: req.params.id, userId });
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const result = await performHealthCheck(endpoint);
    await processCheckResult(endpoint, result);

    const updated = await EndpointModel.findById(endpoint._id);
    res.json({ message: 'Health check completed', result, endpoint: updated });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to trigger health check' });
  }
});

/**
 * Update endpoint settings or check interval
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { projectName, url, checkIntervalMinutes, expectedStatusCode } = req.body;
    const userId = req.user?.id || 'guest-user';
    const endpoint = await EndpointModel.findOne({ _id: req.params.id, userId });
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    if (projectName) endpoint.projectName = String(projectName).toUpperCase();
    if (url) endpoint.url = url;
    if (expectedStatusCode) endpoint.expectedStatusCode = expectedStatusCode;

    if (checkIntervalMinutes && checkIntervalMinutes !== endpoint.checkIntervalMinutes) {
      endpoint.checkIntervalMinutes = checkIntervalMinutes;
      await assignBatch(endpoint._id.toString(), checkIntervalMinutes);
    }

    await endpoint.save();
    res.json({ message: 'Endpoint updated successfully', endpoint });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

/**
 * Delete an endpoint
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || 'guest-user';
    const endpoint = await EndpointModel.findOneAndDelete({ _id: req.params.id, userId });
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    await IncidentModel.deleteMany({ endpointId: req.params.id });
    res.json({ message: 'Endpoint and related incidents deleted' });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

export default router;
