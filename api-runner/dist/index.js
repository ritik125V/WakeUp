"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const runnerEngine_1 = require("./runnerEngine");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Security & CORS Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS || '*',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '5mb' }));
// Rate Limiting Protection (60 requests per minute per IP for flow runs)
const stepExecutionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000,
    max: 120,
    message: { error: 'Execution rate limit exceeded. Please wait 60 seconds.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const flowExecutionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'Workflow flow run rate limit exceeded. Please wait 60 seconds.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'WakeUp Dedicated API Runner Engine',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Root Endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'WakeUp Dedicated API Runner Service',
        status: 'online',
        endpoints: {
            health: 'GET /health',
            executeStep: 'POST /api/execute-step',
            executeFlow: 'POST /api/execute-flow',
        },
    });
});
/**
 * Single Step Execution Endpoint (For Test Step / Test Now calls)
 * Works for both guest (non-login) and logged-in users with 0 CORS limitations
 */
app.post('/api/execute-step', stepExecutionLimiter, async (req, res) => {
    try {
        const { step, variablesContext, cookiesContext } = req.body;
        if (!step || !step.url || !step.method) {
            return res.status(400).json({ error: 'Valid step payload (url, method) is required' });
        }
        const result = await (0, runnerEngine_1.executeSingleStep)(step, variablesContext || {}, cookiesContext || {});
        res.json({ result });
    }
    catch (error) {
        console.error('Error executing single API step:', error);
        res.status(500).json({ error: error?.message || 'Failed to execute API step' });
    }
});
/**
 * Full Workflow Execution Endpoint (For multi-step workflow flow runs)
 * Executes all steps sequentially carrying cookies & variables step-to-step
 */
app.post('/api/execute-flow', flowExecutionLimiter, async (req, res) => {
    try {
        const { steps, workflowName, variablesContext, cookiesContext } = req.body;
        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ error: 'Valid workflow steps array is required' });
        }
        const summary = await (0, runnerEngine_1.executeWorkflowFlow)(steps, workflowName || 'API Workflow Run', variablesContext || {}, cookiesContext || {});
        res.json({ summary });
    }
    catch (error) {
        console.error('Error executing workflow flow:', error);
        res.status(500).json({ error: error?.message || 'Failed to execute workflow flow' });
    }
});
// Start Server
app.listen(PORT, () => {
    console.log(`\n🚀 WakeUp Dedicated API Runner Service is active on port ${PORT}`);
    console.log(`👉 Step Execution Endpoint: http://localhost:${PORT}/api/execute-step`);
    console.log(`👉 Flow Execution Endpoint: http://localhost:${PORT}/api/execute-flow`);
    console.log(`👉 Health Check: http://localhost:${PORT}/health\n`);
});
