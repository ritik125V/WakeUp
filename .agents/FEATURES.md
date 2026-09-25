# WakeUp Feature Architecture & Technical Specifications

This document provides a detailed breakdown of the three primary product modules in WakeUp: **Flow Runner**, **API Monitoring**, and **Status Pages**.

---

## 1. Feature 1: Flow Runner (Workflow Automation Engine)

The **Flow Runner** allows developers to build, test, and execute multi-step API chains with variable passing, cookie inheritance, and detailed step telemetry.

```
                  ┌──────────────────────────────────────────┐
                  │          Flow Runner Modes               │
                  └────────────────────┬─────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  Local Machine Testing (Localhost)           Production / Staging URLs
  • Executed in Browser (window.fetch)        • Executed via Telemetry Engine
  • Direct local port access                  • Socket.IO Live Streaming
  • Direct CORS fallback handling             • PDF & MD Report Generation
```

### A. Dual Execution Modes

1. **Local Machine Testing (Browser-Direct Execution)**:
   - **Problem**: A cloud-deployed backend server cannot connect to a user's `http://localhost:3000` or `http://127.0.0.1:5001`.
   - **Solution**: When a user inputs a `localhost` URL, the test is executed **directly inside the user's browser** using `window.fetch`.
   - Supports GET, POST, PUT, DELETE, PATCH, dynamic variable substitution (`{{authToken}}`), and request headers.
   - Includes graceful CORS detection: if local backend lacks CORS headers, falls back to `no-cors` connection probing while providing actionable 1-line CORS code snippets.

2. **Production & Remote Server Testing**:
   - Executed via backend telemetry engine with real-time Socket.IO event streaming (`workflow:step_completed`, `workflow:finished`).

### B. Unified / Standardized API Response Modal & Tab
Whether an API request targets a local `localhost` port or a remote production server, the UI **must display a standardized, identical API Response Tab/Drawer**:
- **HTTP Status Code & Status Badge**: (e.g. `200 OK`, `201 Created`, `400 Bad Request`).
- **Timing & Latency Breakdown**: Total duration in `ms`, handshake, TCP/TLS, TTFB metrics where available.
- **Headers & Cookies**: Complete request and response header list, active cookies.
- **Payload & Response Body**: Syntax-highlighted JSON/Text response preview (truncated safely at 2000 characters).
- **Extracted Variables**: Summary of variables extracted via JSONPath for downstream workflow steps.

### C. Developer UX & Postman-like Interface
- **Split Panel Ergonomics**: Tabbed right-side panel familiar to developers (Params, Headers, Body, Cookies, Variables).
- **Cookie Carryover**: Checkbox (`carryCookies: true`) to automatically forward set cookies from preceding steps to subsequent steps.
- **Single Step Test Button**: Test individual workflow steps independently without running the entire multi-step flow.
- **Step Dependency & Variable Extraction**: Easily extract values (e.g., `json.token` -> `authToken`) to pass into future steps (`Authorization: Bearer {{authToken}}`).

### D. Exportable Flow Telemetry Reports
- Full execution results can be downloaded as **PDF** or **Markdown (.md)** reports.
- Reports include executive summary, pass/fail status, step latency breakdown, request payloads, response snippets, and timestamped audit logs.

---

## 2. Feature 2: API Monitoring & Uptime Service

The **API Monitoring Engine** monitors endpoints at scheduled intervals, evaluates response health, and alerts users upon downtime or degradation.

### A. High-Throughput Batch Cron Scheduler
- **Parallel Batch Execution**: Endpoints due for checking are fetched in batches (e.g., 50 parallel requests).
- **CPU & Socket Protection**: Outbound requests reuse pooled HTTP Agents (`keepAlive: true`) with strict socket bounds and timeouts to prevent server CPU spikes.
- **Circuit Breaker**: Uses Redis for active endpoint locks. If Redis is unavailable, falls back gracefully to MongoDB queries using `{ nextCheckAt: 1, status: 1 }`.

### B. Flexible Degradation Rules
Evaluates API health beyond simple HTTP pings:
- **Status Code Checks**: Expects specific status codes (e.g., `200`, `204`).
- **Latency Thresholds**: Marks endpoint as `degraded` if latency exceeds set limits (e.g., > 1500ms).
- **Payload & String Verification**: Validates whether response body contains required keywords or JSON fields.

### C. DB & Memory Optimizations
- Employs **Incident-Only Recording** (only stores records on status transitions).
- Uses `.select()` and `.lean()` for high-frequency database lookups.

---

## 3. Feature 3: Status Pages

**Status Pages** provide public-facing dashboard views displaying live service health, 30-day historical uptime bars, active incident banners, and maintenance schedules.

### A. 100% Customizability
Users can customize every visual aspect of their status page:
- Branding, colors, logo images, title texts.
- Active endpoint selections, component groupings.
- Custom domain mappings and announcement banners.

### B. Lightweight Configuration Encoding Strategy
- **Zero Backend Bloat**: Status page layout configurations are compressed into compact **16/28-digit encoded tokens** stored in the database.
- **Instant Client-Side Rendering**: The frontend decodes this compact token into complete layout component trees, eliminating complex database joins or backend computation when serving public traffic.
