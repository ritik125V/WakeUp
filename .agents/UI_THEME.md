# WakeUp UI & Theme Style Guidelines for AI Agents

These rules govern the user interface design, styling, color palette, and visual architecture across all frontend pages in the WakeUp project.

---

## 1. Core Visual Principles

### A. Zero Border Policy (No Visible Borders)
- **Do NOT add visible border lines**: Never use 1px solid borders, outline strokes, high-contrast grid borders (`border-white/10`, `border-neutral-800`), or dashed frames around panels, cards, inputs, or tables.
- **Layering via Depth & Background Contrast**: Use subtle background elevation (`#000000` -> `#0a0a0a` -> `#121212` -> `#1a1a1a`) to separate UI elements cleanly without drawing border lines.

### B. No Flashy / Poppy / Over-Saturated Elements
- **Avoid Neon & Over-Saturated Accents**: Do NOT use bright neon glows, flashy pulse rings, aggressive gradient borders, or distracting pop animated elements.
- **Muted & Professional Tone**: Use dark, sleek, muted accent colors (e.g. muted rose `#e11d48`, muted emerald `#059669`, muted amber `#d97706`).
- **No Heavy Shadows**: Avoid colored drop-shadow glows (`shadow-rose-500/50`). Keep shadows flat or completely borderless/shadowless.

---

## 2. Color System & Surfaces

| UI Layer | Dark Theme Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| **Page Background** | `#000000` | Main application backdrop |
| **Base Panel / Card** | `#0a0a0a` | Container cards, dashboard widgets |
| **Hovered Panel** | `#141414` | Interactive item hover state |
| **Input / Field Fill** | `#121212` | Form text fields, textareas, selects |
| **Primary Text** | `#e5e5e5` | Headers, primary titles |
| **Muted Text** | `#888888` | Secondary labels, timestamps, metadata |
| **Method: GET** | Fill `#064e3b` / Text `#6ee7b7` | HTTP GET badge |
| **Method: POST** | Fill `#78350f` / Text `#fde047` | HTTP POST badge |
| **Method: PUT / PATCH** | Fill `#0c4a6e` / Text `#7dd3fc` | HTTP PUT/PATCH badge |
| **Method: DELETE** | Fill `#7f1d1d` / Text `#fca5a5` | HTTP DELETE badge |

---

## 3. UI Component Construction Rules

1. **Card & Container Styling**:
   - Use `bg-neutral-950` or `glass-panel` without `border` or `shadow-xl`.
   - Hover states should transition background color smoothly: `hover:bg-neutral-900 transition-colors duration-150`.

2. **Buttons & Actions**:
   - Primary Action: `bg-rose-700 hover:bg-rose-600 text-white px-3.5 py-1.5 rounded-md font-bold text-xs border-none`.
   - Secondary Action: `bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-md text-xs border-none`.

3. **Form Inputs**:
   - `bg-neutral-900 text-white px-3 py-2 rounded-md text-xs border-none focus:outline-none focus:bg-neutral-850`.

4. **Status & Method Badges**:
   - Use predefined badge classes (`.badge-get`, `.badge-post`, `.badge-put`, `.badge-delete`) which rely solely on muted fill & text color without border lines.

---

## 4. Agent Execution Checklist for UI Tasks
1. [ ] Did I remove all unnecessary border classes (`border`, `border-neutral-900`, `border-white/10`)?
2. [ ] Are colors muted, subtle, and professional without bright poppy/neon glows?
3. [ ] Does the UI feel clean, fast, borderless, and consistent with the dark theme?
4. [ ] Did `npm run build` pass in `frontend` without errors?
