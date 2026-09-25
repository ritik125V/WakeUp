# WakeUp Agent Instructions, Guidelines & Rules

This document outlines mandatory operational guidelines, explicit instructions, forbidden practices (DOs and DON'Ts), and verification procedures for all AI agents working on the WakeUp project.

---

## 1. Things Agents MUST DO (DOs)

1. **Verify Redis & Service Fallbacks**: Always test or verify that new backend features run successfully **without Redis** installed or running.
2. **Ensure Database Query Optimization**: Ensure every new database query path is backed by compound indexes (`{ nextCheckAt: 1, status: 1 }`, `{ userId: 1, createdAt: -1 }`). Use `.select()` and `.lean()` on all read paths.
3. **Follow the Zero Border Policy**: Use background elevation (`#000000` -> `#0a0a0a` -> `#141414`) for visual hierarchy. Remove 1px solid borders (`border-white/10`, `border-neutral-800`).
4. **Use HTTP Connection Pooling**: Always reuse HTTP/HTTPS agents with explicit `keepAlive: true`, `maxSockets`, and strict timeouts.
5. **Standardize API Responses**: Ensure local (`localhost`) and production API test results share the exact same UI tab/modal structure with complete latency, status, headers, and body visibility.
6. **Verify Code with Builds**: Always execute `npm run build` across affected projects (`backend`, `frontend`, `admin-frontend`) to confirm clean TypeScript compilation before ending a task.

---

## 2. Things Agents MUST NOT DO (DON'Ts)

1. **DON'T Introduce Hard Infrastructure Dependencies**: Never write code that throws uncaught exceptions or crashes startup if Redis, Mail/SMTP, or external caches are offline.
2. **DON'T Store Raw Check Logs for Every Ping**: Never insert a database row for every single successful `200 OK` health ping. Use the **Incident-Only Recording Model** to prevent DB bloat.
3. **DON'T Use Poppy / Neon / Flashy UI Elements**: Never add neon glows, flashy pulsing rings, over-saturated gradient borders, or distracting pop animations.
4. **DON'T Perform Non-Atomic Queue Operations**: Never write check-then-act logic in distributed workers without atomic locks or `findOneAndUpdate` timestamp locks.
5. **DON'T Make Core Architecture / Schema Changes Without Approval**: Never change database schemas, core architectural models, or major system contracts without proposing an implementation plan and receiving explicit admin approval.
6. **DON'T Patch Symptoms Silently**: Never catch and swallow runtime errors, return dummy mock data, or comment out broken tests to pass build checks.

---

## 3. Mandatory Admin Approval Checklist

Before making any of the following changes, you **must get approval from the user/admin**:

- [ ] Modifying Mongoose database schemas (`EndpointModel`, `IncidentModel`, `WorkflowModel`, `UserModel`).
- [ ] Changing core scheduler batching logic or Redis queue locking mechanisms.
- [ ] Altering public API route contracts or response structure.
- [ ] Adding new external npm packages or third-party infrastructure services.

---

## 4. Agent Pre-Completion Summary Checklist

Before marking any task as complete, verify all items:

1. [ ] Did I test or verify backend operation **without Redis**?
2. [ ] Are all database queries covered by indexes and projected using `.select()` / `.lean()`?
3. [ ] Are HTTP connections pooled and bounded by timeouts?
4. [ ] Did I enforce the **Zero Border Policy** and minimalist dark theme in UI components?
5. [ ] Is the API Response tab standardized for both `localhost` and remote URLs?
6. [ ] Did `npm run build` complete with 0 errors in all modified workspace directories?
