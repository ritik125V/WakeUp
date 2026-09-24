import { Router, Request, Response } from 'express';
import { IncidentModel } from '../models/Incident.js';

const router = Router();

/**
 * Get incident history for a specific endpoint (last 30 days telemetry)
 */
router.get('/endpoint/:endpointId', async (req: Request, res: Response) => {
  try {
    const { endpointId } = req.params;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const incidents = await IncidentModel.find({
      endpointId,
      startedAt: { $gte: thirtyDaysAgo },
    }).sort({ startedAt: -1 });

    res.json({ incidents, count: incidents.length });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to fetch incident history' });
  }
});

/**
 * Get all incidents for a project
 */
router.get('/project/:projectName', async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const pNameStr = Array.isArray(projectName) ? projectName[0] : projectName;

    const incidents = await IncidentModel.find({
      projectName: pNameStr.toUpperCase(),
    })
      .sort({ startedAt: -1 })
      .limit(100);

    res.json({ incidents, count: incidents.length });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to fetch project incidents' });
  }
});

export default router;
