# WakeUp Workspace Agent Rules: Performance, Fallbacks, Complexity & Scalability

These guidelines are strictly enforced for all AI agents working on the WakeUp codebase. Whenever modifying existing features or building new features, follow these core engineering principles:

---

## 1. Zero Hard Dependencies & Mandatory Fallbacks
- **Optional Infrastructure Services**: Third-party services like Redis, Supabase, or external caches must **never** cause service breakdown or app startup failure when missing or offline.
- **Circuit Breaker / Safe Accessors**: Wrap external service interactions with availability guards (e.g., `isRedisAvailable()`).
- **Graceful Fallbacks**:
  - If Redis is unavailable, scheduler operations must fall back to MongoDB database state (`nextCheckAt`).
  - Active incident caching must fall back to MongoDB index queries (`{ endpointId: 1, resolved: false }`) to avoid duplicate incident creation or memory leaks.

---

## 2. Time & Space Complexity Guidelines
- **Time Complexity ($O(\log N)$ or $O(1)$ Queries)**:
  - Every MongoDB query used in high-frequency paths (scheduler tickers, status lookups, user listing routes) **must** be covered by appropriate single or compound indexes.
  - Required Indexes:
    - `EndpointModel`: `{ nextCheckAt: 1, status: 1 }` and `{ userId: 1, createdAt: -1 }`.
    - `IncidentModel`: `{ endpointId: 1, resolved: 1 }` and `{ userId: 1, startedAt: -1 }`.
- **Space Complexity & Memory Efficiency**:
  - Always use `.select(...)` to fetch only required fields when pulling records for batch execution or background jobs.
  - Use `.lean()` for read-only database queries to avoid heavy Mongoose Document overhead.
  - Slice/truncate dynamic response payloads (e.g., `MAX_RESPONSE_SNIPPET_BYTES`) before storing in database or sending over WebSockets.

---

## 3. Resource Management & Lifecycles
- **HTTP / Socket Agent Connection Pooling**:
  - Always reuse HTTP/HTTPS agents (`keepAlive: true`) with explicitly tuned `maxSockets` and `maxFreeSockets`.
  - Always set strict HTTP timeouts (e.g., `SYSTEM_CONFIG.HTTP_TIMEOUT_MS`) on network requests to avoid hanging sockets and memory exhaustion.
- **Uncaught Errors & Cleanup**:
  - Never allow background tasks, tickers, or queue workers to fail silently or crash the Node process. Use `Promise.allSettled` for batch processing so individual failures do not block the batch.

---

## 4. Scalability & Concurrency Safety
- **Atomic Operations**:
  - Avoid non-atomic check-then-act operations in distributed queue/scheduler paths.
  - In Redis mode, use atomic Lua scripts (`EVAL`) or transaction commands so multiple horizontal worker instances never execute duplicate checks.
  - In MongoDB fallback mode, use atomic updates (`updateMany` / `findOneAndUpdate`) with lock timestamps to prevent worker race conditions.
- **Stateless Backend Design**:
  - Keep backend worker loops stateless so multiple backend containers can scale horizontally across clusters.

---

## 5. UI Design & Theme Guidelines (Zero Border & Minimalist Standard)
- **Zero Border Policy**: Never use visible 1px borders (`border`, `border-white/10`, `border-neutral-800`). Create visual structure using background depth (`#000000` -> `#0a0a0a` -> `#141414`).
- **No Flashy / Poppy Elements**: Avoid high-intensity neon glows, flashy animations, over-saturated gradient borders, or distracting pop effects.
- **Reference**: See [.agents/UI_THEME.md](file:///home/ritikk/Projects/WakeUp/.agents/UI_THEME.md) for full design tokens and color specs.

---

## 6. Summary Checklist Before Completing Any Code Task
1. [ ] Did I test or verify that the backend starts and functions properly **without Redis**?
2. [ ] Are all new query paths covered by database indexes?
3. [ ] Are HTTP connections pooled and bounded by timeouts?
4. [ ] Are database reads projected using `.select()` or `.lean()` where appropriate?
5. [ ] Did I follow the **Zero Border Policy** and avoid poppy/flashy elements in UI?
6. [ ] Does TypeScript compile without errors (`npm run build`)?

