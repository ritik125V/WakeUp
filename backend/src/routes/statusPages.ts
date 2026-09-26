import { Router, Request, Response } from 'express';
import { StatusPageModel } from '../models/StatusPage.js';
import { IncidentModel } from '../models/Incident.js';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

const getUserId = (req: AuthRequest): string => {
  return req.user?.id || (req.headers['x-user-id'] as string) || 'guest-user';
};

/**
 * Create a new custom status page (Protected)
 */
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { title, slug, description, endpointIds, customization } = req.body;
    const userId = getUserId(req);

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let cleanSlug = String(slug || title).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!cleanSlug) {
      cleanSlug = `status-${Date.now()}`;
    }

    // Handle slug collision gracefully by appending a unique random suffix if needed
    const existing = await StatusPageModel.findOne({ slug: cleanSlug });
    if (existing) {
      cleanSlug = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const statusPage = await StatusPageModel.create({
      userId,
      title: title.trim(),
      slug: cleanSlug,
      description: description ? String(description).trim() : '',
      endpointIds: endpointIds || [],
      customization: customization || {},
      isPublic: true,
    });

    res.status(201).json({ message: 'Status page published successfully', statusPage });
  } catch (error: unknown) {
    console.error('Error creating status page:', error);
    res.status(500).json({ error: 'Failed to create status page' });
  }
});

/**
 * Update an existing status page (Protected)
 */
router.put('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { title, slug, description, endpointIds, customization, isPublic } = req.body;

    const page = await StatusPageModel.findOne({
      _id: id,
      $or: [{ userId }, { userId: 'default-user-id' }, { userId: 'guest-user' }],
    });

    if (!page) {
      return res.status(404).json({ error: 'Status page not found or unauthorized' });
    }

    // Auto-claim page ownership if it belonged to default/guest user
    page.userId = userId;

    if (slug && slug !== page.slug) {
      let cleanSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (cleanSlug) {
        const existing = await StatusPageModel.findOne({ slug: cleanSlug, _id: { $ne: id } });
        if (existing) {
          cleanSlug = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        page.slug = cleanSlug;
      }
    }

    if (title !== undefined) page.title = String(title).trim();
    if (description !== undefined) page.description = String(description).trim();
    if (endpointIds !== undefined) page.endpointIds = endpointIds;
    if (isPublic !== undefined) page.isPublic = isPublic;
    if (customization !== undefined) {
      page.customization = {
        ...page.customization,
        ...customization,
      };
    }

    await page.save();
    res.json({ message: 'Status page updated successfully', statusPage: page });
  } catch (error: unknown) {
    console.error('Error updating status page:', error);
    res.status(500).json({ error: 'Failed to update status page' });
  }
});

/**
 * Delete a status page (Protected)
 */
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const page = await StatusPageModel.findOneAndDelete({
      _id: id,
      $or: [{ userId }, { userId: 'default-user-id' }, { userId: 'guest-user' }],
    });

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    res.json({ message: 'Status page deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting status page:', error);
    res.status(500).json({ error: 'Failed to delete status page' });
  }
});

/**
 * Get all status pages owned by current user (Protected with fallback query for default/guest pages)
 */
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const pages = await StatusPageModel.find({
      $or: [{ userId }, { userId: 'default-user-id' }, { userId: 'guest-user' }],
    }).populate('endpointIds');
    res.json({ statusPages: pages });
  } catch (error: unknown) {
    console.error('Error fetching status pages:', error);
    res.status(500).json({ error: 'Failed to fetch status pages' });
  }
});

/**
 * PUBLIC API: Get status page data by slug for public visitors
 */
router.get('/public/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const slugStr = Array.isArray(slug) ? slug[0] : slug;
    const page = await StatusPageModel.findOne({ slug: slugStr.toLowerCase() }).populate('endpointIds');

    if (!page || !page.isPublic) {
      return res.status(404).json({ error: 'Status page not found or is private' });
    }

    const endpoints = (page.endpointIds || []) as unknown as Array<{
      _id: string;
      projectName: string;
      url: string;
      method?: string;
      status: string;
      lastCheckedAt: Date;
      lastResponseTimeMs?: number;
      expectedStatusCode?: number;
    }>;

    // Get active and history incidents for these endpoints
    const endpointIds = endpoints.map((ep) => ep._id);
    const incidents = await IncidentModel.find({
      endpointId: { $in: endpointIds },
    }).sort({ startedAt: -1 });

    const activeIncidents = incidents.filter((inc) => !inc.resolved);

    // Group incidents by endpointId for 30-day timeline rendering
    const incidentsMap: Record<string, typeof incidents> = {};
    endpointIds.forEach((id) => {
      const idStr = id.toString();
      incidentsMap[idStr] = incidents.filter((inc) => inc.endpointId.toString() === idStr);
    });

    const allHealthy = endpoints.every((ep) => ep.status === 'healthy' || ep.status === 'pending');

    res.json({
      _id: page._id.toString(),
      title: page.title,
      slug: page.slug,
      description: page.description,
      overallStatus: allHealthy ? 'ALL_SYSTEMS_OPERATIONAL' : 'DEGRADED_PERFORMANCE',
      endpoints,
      activeIncidents,
      incidentsMap,
      customization: page.customization || {
        themePreset: 'cyberpunk',
        artworkStyle: 'synthwave_sun',
        artworkPosition: 'top_hero',
        logoEmoji: '⚡',
        logoUrl: '',
        backgroundPattern: 'grid',
        fontFamily: 'mono',
        layoutStyle: 'standard',
        announcementBarText: '',
        announcementBarType: 'info',
        backgroundColor: '#050505',
        cardBackgroundColor: '#0d0d0d',
        textColor: '#ffffff',
        accentColor: '#f43f5e',
        fontSize: 'standard',
        customHeaderBadge: 'PUBLIC STATUS MONITOR',
        customBannerMessage: 'ALL SYSTEMS OPERATIONAL',
        showBanner: true,
        showIncidents: true,
        showHistoryBars: true,
        showMetrics: true,
        showFooter: true,
        showArtwork: true,
        showLatencyGraph: true,
        customFooterText: 'POWERED BY WAKEUP MONITORING',
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error fetching public status page:', error);
    res.status(500).json({ error: 'Failed to fetch public status page' });
  }
});

export default router;
