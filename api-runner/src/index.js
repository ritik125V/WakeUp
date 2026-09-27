import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { executeSingleStep, executeWorkflowFlow } from './runnerEngine';
const app = new Hono();
// Global CORS Middleware
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));
// Health Check Endpoint
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        service: 'WakeUp API Runner (Cloudflare Worker Edge Engine)',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// Root Info Endpoint
app.get('/', (c) => {
    return c.json({
        name: 'WakeUp Cloudflare Worker Edge API Runner',
        status: 'online',
        runtime: 'Cloudflare Workers Edge Network (300+ Cities)',
        endpoints: {
            health: 'GET /health',
            executeStep: 'POST /api/execute-step',
            executeFlow: 'POST /api/execute-flow',
        },
    });
});
/**
 * Single Step Execution Endpoint (For Test Step / Test Now calls)
 * Executes HTTP requests natively from Cloudflare Workers edge (0 CORS limitations)
 */
app.post('/api/execute-step', async (c) => {
    try {
        const body = await c.req.json();
        const { step, variablesContext, cookiesContext } = body || {};
        if (!step || !step.url || !step.method) {
            return c.json({ error: 'Valid step payload (url, method) is required' }, 400);
        }
        const result = await executeSingleStep(step, variablesContext || {}, cookiesContext || {});
        return c.json({ result });
    }
    catch (error) {
        console.error('Error executing single step on Cloudflare Worker:', error);
        return c.json({ error: error?.message || 'Failed to execute API step on edge' }, 500);
    }
});
/**
 * Full Workflow Execution Endpoint
 * Executes multi-step workflows sequentially at Cloudflare edge
 */
app.post('/api/execute-flow', async (c) => {
    try {
        const body = await c.req.json();
        const { steps, workflowName, variablesContext, cookiesContext } = body || {};
        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return c.json({ error: 'Valid workflow steps array is required' }, 400);
        }
        const summary = await executeWorkflowFlow(steps, workflowName || 'API Workflow Run', variablesContext || {}, cookiesContext || {});
        return c.json({ summary });
    }
    catch (error) {
        console.error('Error executing workflow flow on Cloudflare Worker:', error);
        return c.json({ error: error?.message || 'Failed to execute workflow flow on edge' }, 500);
    }
});
export default app;
