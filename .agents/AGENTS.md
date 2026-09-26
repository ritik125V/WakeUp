# WakeUp Workspace Agent Rules & Knowledge Base

Welcome to the **WakeUp** codebase. This document serves as the master entry point and rule set for all AI agents working on this project.

Whenever modifying existing features or building new capabilities, follow the core guidelines and refer to the specialized documentation modules below.

---

## 📚 Documentation Index for AI Agents

All AI agents working on this repository **must read and adhere to** the following documentation modules in `.agents/`:

| Module | Location | Purpose & Core Topics |
| :--- | :--- | :--- |
| **Architecture & Fallbacks** | [.agents/ARCHITECTURE.md](file:///home/ritikk/Projects/WakeUp/.agents/ARCHITECTURE.md) | Zero hard dependencies, Redis/Mongo fallbacks, $O(\log N)/O(1)$ indexing, 30-Day Incident Storage strategy, HTTP connection pooling, bounded CPU/RAM cron execution. |
| **Features & Specifications** | [.agents/FEATURES.md](file:///home/ritikk/Projects/WakeUp/.agents/FEATURES.md) | **Flow Runner** (Local browser-direct vs production, Postman UX, cookie inheritance, PDF/MD reports), **API Monitoring** (Cron batching, degradation rules, Redis memory optimization), **Status Pages** (100% customizability, 16/28-digit encoded layout tokens). |
| **UI & Theme Guidelines** | [.agents/UI_THEME.md](file:///home/ritikk/Projects/WakeUp/.agents/UI_THEME.md) | **Zero Border Policy**, dark mode color depth (`#000000` -> `#0a0a0a` -> `#141414`), no neon/poppy elements, HTTP method badge standards. |
| **Frontend Guidelines** | [.agents/FRONTEND.md](file:///home/ritikk/Projects/WakeUp/.agents/FRONTEND.md) | **Component Reusability**, dynamic PIN box standards, context-aware CTAs, unauthenticated fallbacks, minimalist UI. |
| **Agent Guidelines & DOs/DON'Ts** | [.agents/AGENT_GUIDELINES.md](file:///home/ritikk/Projects/WakeUp/.agents/AGENT_GUIDELINES.md) | Mandatory DOs and DON'Ts, explicit admin approval requirements, verification checklist. |

---

## ⚡ Core Rules & Engineering Principles Summary

### 1. Mandatory Fallbacks (Zero Hard Dependencies)
- Infrastructure services like Redis, Supabase, or external mailers must **never** break application startup or crash worker loops when missing or offline.
- Wrap Redis with `isRedisAvailable()` checks and fall back seamlessly to MongoDB queries using database indexes (`{ nextCheckAt: 1, status: 1 }`).

### 2. Time & Space Complexity Guidelines
- **Time**: Every high-frequency database path must be covered by single or compound MongoDB indexes.
- **Space**: Use `.select(...)` to fetch only required fields and `.lean()` for read-only operations. Truncate dynamic response payloads safely (`MAX_RESPONSE_SNIPPET_BYTES`).
- **30-Day Incident Log Optimization**: Store records **only on status transitions / incidents**. Never insert rows for every single successful health check ping.

### 3. Resource & CPU Safety
- Reuse HTTP/HTTPS agents (`keepAlive: true`) with strict socket bounds (`maxSockets`) and request timeouts (`SYSTEM_CONFIG.HTTP_TIMEOUT_MS`).
- Process cron monitor checks in controlled parallel batches using `Promise.allSettled()`.

### 4. Flow Runner Execution Standards
- **Local machine APIs (`localhost:xxx`)**: Executed **directly in the browser** (`window.fetch`) with CORS fallback handling.
- **Standardized API Response Drawer**: Localhost and production API responses must display in an identical UI drawer with full latency breakdown, HTTP status code, headers, body snippet, cookies, and extracted variables.
- **Postman-like UX**: Tabbed right-side panel, step-to-step cookie inheritance (`carryCookies: true`), single-step testing, PDF/MD report exports.

### 5. Status Pages Lightweight Encoding
- Public status pages utilize **16/28-digit encoded layout configuration tokens** stored in DB/config, enabling instant client-side rendering without backend calculation bloat.

### 6. Zero Border Policy & UI Theme
- Never use visible 1px borders (`border`, `border-white/10`, `border-neutral-800`).
- Create structure using dark surface elevation (`#000000` -> `#0a0a0a` -> `#141414`).
- Avoid flashy neon glows or poppy animations.

### 7. Explicit Admin Approval Rule
> [!IMPORTANT]
> **Admin Approval Required**: Agents must NEVER modify core architecture, database schemas, or core data models without proposing an implementation plan and receiving explicit admin/user approval first.

---

## 📋 Pre-Completion Checklist
1. [ ] Did I verify backend execution **without Redis**?
2. [ ] Are database queries indexed and projected using `.select()` / `.lean()`?
3. [ ] Are HTTP connections pooled and bounded by timeouts?
4. [ ] Did I follow the **Zero Border Policy** in UI updates?
5. [ ] Is the API Response tab standardized for both `localhost` and remote URLs?
6. [ ] Did `npm run build` pass cleanly in affected workspace directories?
