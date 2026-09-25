# WakeUp System Architecture & Engineering Principles

This document defines the core technical architecture, performance guidelines, fallbacks, and resource optimization strategies for all AI agents and developers working on the WakeUp codebase.

---

## 1. Core Architecture Philosophy

The WakeUp platform is designed for **maximum reliability, zero single-point-of-failure, low resource consumption, and high operational speed**. All code contributions must adhere to these foundational principles:

1. **Zero Hard Dependencies & Mandatory Fallbacks**
2. **Strict Time ($O(\log N) / O(1)$) and Space Complexity Bounds**
3. **Decoupled, Low-Dependency Function Design**
4. **Data Storage Minimization (Event-Driven Logging)**
5. **Bounded CPU & Memory Usage During Batch Operations**

---

## 2. Infrastructure Fallbacks & Circuit Breakers

No external infrastructure service (Redis, SMTP, external proxy, cache server) should ever cause application failure, service crashes, or startup blockage.

### A. Redis Circuit Breaker & Fallback System
- **Availability Guard**: Every Redis interaction must be wrapped with availability checks (e.g. `isRedisAvailable()`).
- **Scheduler Operations**: If Redis is offline, scheduler tickers and queues must fall back seamlessly to MongoDB queries using the `{ nextCheckAt: 1, status: 1 }` index.
- **Incident State Tracking**: If Redis cache is offline, active incident lookups must query MongoDB using `{ endpointId: 1, resolved: false }` to prevent duplicate incident creation or memory leaks.

### B. Mail & Notification Service Degradation
- If external SMTP or mail services fail or are misconfigured, alert dispatchers must log warning metrics without throwing uncaught exceptions or blocking background cron batch processing.

---

## 3. Storage Optimization: The 30-Day Incident Log Strategy

A core architectural optimization in WakeUp is our **Event-Driven Incident Recording Model**:

- **The Problem**: Traditional uptime monitors store a database entry for *every single HTTP check* (e.g. every 60 seconds). For thousands of endpoints, this generates millions of rows per month, creating severe database bloat, expensive index updates, and slow query performance.
- **Our Solution (Incident-Only Recording)**:
  - WakeUp **only logs actual state changes and incidents** (when an endpoint transitions from `up` -> `down`, `down` -> `up`, or degraded).
  - Successful `200 OK` pings update lightweight status fields (`lastCheckedAt`, `latencyMs`, `uptime24h`, `uptime30d`) in-place on the `Endpoint` document.
  - **Result**: 99%+ database space savings, $O(1)$ status updates during normal operations, and instant 30-day incident report queries without scanning millions of uptime logs.

---

## 4. Time & Space Complexity Guidelines

### A. Time Complexity ($O(\log N)$ or $O(1)$ Database Queries)
Every database query in high-frequency paths (scheduler tickers, API status lookups, user workflows) **must** be covered by compound MongoDB indexes.

**Required Indexes**:
- `EndpointModel`: `{ nextCheckAt: 1, status: 1 }` and `{ userId: 1, createdAt: -1 }`
- `IncidentModel`: `{ endpointId: 1, resolved: 1 }` and `{ userId: 1, startedAt: -1 }`
- `WorkflowModel`: `{ userId: 1, updatedAt: -1 }`

### B. Space Complexity & Memory Bounds
- **Projections**: Always use `.select(...)` to fetch only necessary fields when executing batch operations or list views.
- **Lean Queries**: Use `.lean()` for read-only database operations to eliminate Mongoose Document overhead.
- **Payload Truncation**: Slice dynamic response payloads (`MAX_RESPONSE_SNIPPET_BYTES = 2000`) before writing to the database or emitting over Socket.IO WebSockets.

---

## 5. Resource Management & CPU Safety

### A. HTTP Connection Pooling
- All outbound monitoring and workflow requests must use pooled HTTP/HTTPS agents (`keepAlive: true`) with explicitly tuned `maxSockets` (e.g., 100) and `maxFreeSockets` (e.g., 20).
- Strict network timeouts (`SYSTEM_CONFIG.HTTP_TIMEOUT_MS`) must be enforced on every request to prevent socket leaks and hanging background threads.

### B. Bounded Cron Batch Execution
- Cron jobs process endpoints in controlled parallel batches (e.g., 50 requests per tick).
- Always use `Promise.allSettled()` for batch processing so an individual request failure never crashes the worker process or halts the batch.

### C. Atomic Operations & Horizontally Scalable Workers
- Worker processes must remain **stateless** so multiple container instances can run concurrently.
- Distributed locks or atomic updates (`findOneAndUpdate` with timestamp locks, or Redis Lua scripts) must be used to prevent worker race conditions.

---

## 6. Admin Approval Requirement for Core Architectural Changes

> [!IMPORTANT]
> **Approval Rule**: Agents must NEVER modify core architecture, database schemas, or database models without explicit approval from the admin/user first. Always propose changes in an implementation plan before modifying core infrastructure.
