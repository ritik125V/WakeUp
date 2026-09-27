/**
 * Centralized Design Token System for WakeUp Platform
 * 
 * Rules:
 * 1. Zero Border Policy: Structural separation via surface depth contrast over 1px borders.
 * 2. Pure Black Foundation: Viewport backdrop remains #000000.
 * 3. Primary Accent: Warm Off-White / Ivory (#f5f0e8) for CTAs, active nav states, focus rings.
 * 4. Status Colors: Operational (Green), Degraded (Amber), Outage (Rose) remain 100% separate.
 * 5. Minimal Radius Scale: Cards (8px / rounded-lg), Buttons/Inputs (6px / rounded-md), Modals (12px / rounded-xl).
 * 6. Zero Gradients: All surfaces use 100% flat token colors.
 */

export const theme = {
  // Surface Layers (Subtle & Elegant Depth Contrast)
  surfaces: {
    background: '#000000',     // Pure Obsidian Viewport Backdrop
    panelBase: '#121214',      // Base Container Cards, Modals, Section Cards
    panelInteractive: '#1a1a1e',// Interactive Cards & List Rows
    panelHover: '#242429',      // Hover Elevation Surface
    inputFill: '#161619',       // Form Fields, Textareas, PIN Inputs
    codeBlock: '#050505',       // Terminal Logs, Snippet Containers
  },

  // Primary Accent System (Warm Ivory / Off-White)
  accent: {
    primary: '#f5f0e8',         // Warm Ivory Primary Accent
    primaryHover: '#e8e2d8',    // Hover State for Primary Fills
    primaryActive: '#dad4ca',   // Active State for Primary Fills
    textOnPrimary: '#000000',   // High-Contrast Text on Ivory Fills
    focusRing: 'rgba(245, 240, 232, 0.4)', // Subtle Focus Indicator
  },

  // Text Color Tokens
  text: {
    primary: '#e5e5e5',         // Primary Titles & Headers
    secondary: '#a3a3a3',       // Subtitles & Helper Text
    muted: '#737373',           // Captions, Meta Labels, Timestamps
    accentTitle: '#f5f0e8',     // Section Headers on Dense Views
    inverse: '#000000',         // Text on Light Accent Fills
  },

  // System Health Status (100% Separate from Accent System)
  status: {
    operational: {
      fill: '#064e3b',
      text: '#6ee7b7',
      dot: '#10b981',
    },
    degraded: {
      fill: '#78350f',
      text: '#fde047',
      dot: '#f59e0b',
    },
    outage: {
      fill: '#7f1d1d',
      text: '#fca5a5',
      dot: '#e11d48',
    },
  },

  // HTTP Method Badges (Muted Fill & Text Standard)
  methods: {
    get: { fill: '#064e3b', text: '#6ee7b7' },
    post: { fill: '#78350f', text: '#fde047' },
    put: { fill: '#0c4a6e', text: '#7dd3fc' },
    delete: { fill: '#7f1d1d', text: '#fca5a5' },
  },

  // Typography Tokens
  typography: {
    fontSans: 'var(--font-jakarta-sans), var(--font-geist-sans), system-ui, sans-serif',
    fontMono: 'var(--font-geist-mono), monospace',
  },

  // Minimal Border Radius Scale
  radius: {
    badge: '4px',       // Micro badges
    input: '6px',       // rounded-md
    button: '6px',      // rounded-md
    card: '8px',        // rounded-lg
    modal: '12px',      // rounded-xl
    full: '9999px',     // rounded-full
  },

  // Spacing & Layout Gaps
  spacing: {
    containerPx: 'px-3.5 sm:px-6',
    containerPy: 'py-4 sm:py-8',
    sectionGap: 'space-y-6 sm:space-y-8',
    touchMinHeight: 'min-h-[44px]',
  },
} as const;

export type ThemeTokens = typeof theme;
