# WakeUp System — Centralized UI Theme & Design Token Architecture

This document serves as the single authoritative design token specification for the **WakeUp** platform.

---

## 🎨 1. Centralized Design Token System (`src/styles/theme.ts`)

All color values, typography rules, surface elevation depths, and layout tokens are defined in [src/styles/theme.ts](file:///home/ritikk/Projects/WakeUp/frontend/src/styles/theme.ts) and `:root` variables in [src/app/globals.css](file:///home/ritikk/Projects/WakeUp/frontend/src/app/globals.css).

```typescript
export const theme = {
  surfaces: {
    background: '#000000',       // Pure Obsidian Backdrop
    panelBase: '#121214',        // Container Panels & Main Containers
    panelInteractive: '#1a1a1e',  // Interactive List Items / Endpoint Cards
    panelHover: '#242429',        // Hover Elevation Surface
    inputFill: '#161619',         // Form Inputs, Code Boxes & Textareas
    codeBlock: '#0a0a0c',         // Terminal Logs & Snippets
  },
  accent: {
    primary: '#f5f0e8',           // Warm Ivory / Off-White Primary CTA Accent
    primaryHover: '#e8e2d8',      // Primary Button Hover Fill
    primaryActive: '#dad4ca',     // Primary Button Active Scale
    textOnPrimary: '#000000',     // High-Contrast Text on Primary Accent
    focusRing: 'rgba(245, 240, 232, 0.4)',  // Subtle Focus Ring Outline
  },
  radius: {
    badge: '9999px', // rounded-full (Status Pills)
    input: '6px',    // rounded-md (Form Inputs & Buttons)
    button: '6px',   // rounded-md (Action CTAs)
    card: '8px',     // rounded-lg (Dashboard Cards & Panels)
    modal: '12px',   // rounded-xl (Modals & Full Drawers)
  },
  status: {
    operational: { fill: '#064e3b', text: '#6ee7b7', dot: '#10b981' },
    degraded:    { fill: '#78350f', text: '#fde047', dot: '#f59e0b' },
    outage:      { fill: '#7f1d1d', text: '#fca5a5', dot: '#e11d48' },
  },
} as const;
```

---

## 🚫 2. Zero Gradients Policy

- **Flat Surface Fills Only**: No background gradients, radial glows, mesh overlays, or gradient text anywhere across the system.
- All cards, panels, modals, and navigation elements use 100% flat surface colors (`#000000`, `#121214`, `#1a1a1e`, `#242429`, `#161619`).

---

## 👑 3. Primary Accent System: Warm Off-White / Ivory (`#f5f0e8`)

- **Primary Action CTAs**: Solid fill `#f5f0e8` with `#000000` text (`bg-[#f5f0e8] text-black font-bold hover:bg-[#e8e2d8] rounded-md touch-press`).
- **Active Navigation Pill**: Active desktop and mobile route pills use `#f5f0e8` background with dark bold text (`rounded-md`).
- **Focus Rings**: Focused inputs and interactive triggers feature subtle off-white focus outlines (`outline: 1px solid rgba(245, 240, 232, 0.4)`).
- **Strict Status Separation**: System health indicators (Operational Green, Degraded Amber, Outage Red) remain **100% separate** from the primary ivory accent system.

---

## 📐 4. Minimal Border Radius Scale

To maintain a crisp, modern, technical aesthetic, border radius is kept tightly controlled:

- **Modals & Drawers**: `rounded-xl` (12px)
- **Cards & Dashboard Panels**: `rounded-lg` (8px)
- **Buttons, Inputs & Code Blocks**: `rounded-md` (6px)
- **Status Pills**: `rounded-full` (9999px)

---

## 🏔️ 5. Surface Elevation Contrast

WakeUp maintains a **Zero Border Policy**, creating structural definition solely via dark surface elevation:

| Layer Level | Color Hex | Class / Selector | Usage |
| :--- | :--- | :--- | :--- |
| **Viewport Background** | `#000000` | `bg-black` | Main page background |
| **Container Panel** | `#121214` | `.glass-panel` / `bg-[#121214]` | Dashboard project cards, section containers |
| **Interactive Card** | `#1a1a1e` | `.glass-panel-interactive` | Selectable endpoint rows, workflow steps |
| **Hover Panel** | `#242429` | `hover:bg-[#242429]` | Hover elevation highlight |
| **Input / Field Fill** | `#161619` | `bg-[#161619]` | Text fields, selects, PIN inputs |

---

## 🔤 6. Typographic Hierarchy on Dense Views

- **Font Families**:
  - Primary Sans-Serif: `Plus Jakarta Sans`, fallback to `Geist Sans`, `system-ui`, `sans-serif`.
  - Monospace Telemetry: `Geist Mono`, `monospace` for URLs, HTTP methods, latency, headers, JSON body payloads.
- **Hierarchy Scale**:
  - Section Headers: `text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#f5f0e8]`
  - Grouped Section Spacing: `space-y-6 sm:space-y-8` (vertical information chunking)

---

## 🧩 7. Main Component Integration Registry

| Component Name | File Location | Key Styling Tokens Applied |
| :--- | :--- | :--- |
| **`Navbar`** | `src/components/Navbar.tsx` | Flat `#121214` bar, active nav pill in `#f5f0e8` warm ivory (`rounded-md`), mobile drawer. |
| **`DynamicPinInput`** | `src/components/DynamicPinInput.tsx` | Dynamic expandable PIN boxes (`rounded-md`) with warm ivory focus rings. |
| **`ApiResponseDrawer`** | `src/components/ApiResponseDrawer.tsx` | Postman-like right drawer (`rounded-lg`) with monospace technical telemetry tabs. |
| **`RegisterModal`** | `src/components/RegisterModal.tsx` | Borderless modal (`rounded-xl`) with `#121214` depth fill and warm ivory submit button (`rounded-md`). |
| **`StatusBuilderModal`** | `src/components/StatusBuilderModal.tsx` | Studio modal (`rounded-xl`) with flat preview studio and warm ivory publication CTA (`rounded-md`). |
| **`AiSpecImportModal`** | `src/components/AiSpecImportModal.tsx` | Spec parser modal (`rounded-xl`) with flat `#161619` code blocks and warm ivory CTAs (`rounded-md`). |
| **`IncidentDetailModal`** | `src/components/IncidentDetailModal.tsx` | Incident telemetry viewer (`rounded-xl`) with status badge separation. |
| **`IncidentTimeline`** | `src/components/IncidentTimeline.tsx` | Visual 30-day health status bar grid with operational/outage status colors. |
