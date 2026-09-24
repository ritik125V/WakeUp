import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectMongoDB } from './config/mongodb.js';
import { connectRedis, getRedisClient } from './config/redis.js';
import { getSupabaseClient } from './config/supabase.js';
import { startMonitoringWorker } from './services/cronWorker.js';

import createServer from 'http';
import { Server } from 'socket.io';
import authRouter from './routes/auth.js';
import endpointsRouter from './routes/endpoints.js';
import incidentsRouter from './routes/incidents.js';
import statusPagesRouter from './routes/statusPages.js';
import workflowsRouter from './routes/workflows.js';
import adminRouter from './routes/admin.js';
import { runWorkflowExecution } from './services/workflowRunner.js';
import { setSocketIOInstance, emitSystemLog } from './services/adminLogStream.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configurable CORS Origins from environment variables (comma-separated or '*')
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

const httpServer = createServer.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);
setSocketIOInstance(io);

emitSystemLog('SYSTEM', `Server starting on port ${PORT}...`, 'info');

io.on('connection', (socket) => {
  socket.on('join:workflow', (workflowId: string) => {
    socket.join(`workflow:${workflowId}`);
  });

  socket.on('run:workflow', ({ workflowId }: { workflowId: string }) => {
    runWorkflowExecution(workflowId, io, socket.id);
  });
});

// Initialize database connections
connectMongoDB().then(() => {
  // Start background monitoring worker once MongoDB & Redis are initialized
  startMonitoringWorker(10000); // 10-second ticker cycle
});
connectRedis();
getSupabaseClient();

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/endpoints', endpointsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/status-pages', statusPagesRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/hello', (req: Request, res: Response) => {
  res.json({
    message: 'Hello from WakeUp Server Monitoring Backend!',
  });
});

app.get('/api/db-status', async (req: Request, res: Response) => {
  const mongoConfigured = Boolean(process.env.MONGO_URI);
  const redisConfigured = Boolean(process.env.REDIS_URL);
  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));

  const redisClient = getRedisClient();
  let redisPing = false;
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.ping();
      redisPing = true;
    } catch {
      redisPing = false;
    }
  }

  res.json({
    databases: {
      mongoDB: {
        configured: mongoConfigured,
        status: mongoConfigured ? 'configured' : 'missing_MONGO_URI',
      },
      redis: {
        configured: redisConfigured,
        connected: redisPing,
        status: redisConfigured ? (redisPing ? 'connected' : 'connecting_or_offline') : 'missing_REDIS_URL',
      },
      supabase: {
        configured: supabaseConfigured,
        status: supabaseConfigured ? 'configured' : 'missing_SUPABASE_URL_or_KEY',
      },
    },
  });
});

httpServer.listen(PORT, () => {
  console.log(`⚡️[server]: WakeUp Backend server running with Socket.IO at http://localhost:${PORT}`);
});

