# WakeUp Frontend Architecture, Usability & Performance Guidelines

This document defines the core architecture, usability standards, component reusability guidelines, security rules, and performance practices for all frontend applications in the **WakeUp** ecosystem.

---

## 1. Usability & UI Performance Principles

### A. Component Reusability First
- **Zero Duplicate Implementations**: Never re-create ad-hoc inputs, modals, or status badges when standard components exist in `@/components/`.
- **Standardized PIN Component**: Always use `DynamicPinInput` (`@/components/DynamicPinInput`) for all PIN-related input fields (Login, Signup, Profile settings, Security verification).

### B. Minimalist & Lightweight UI (No Text Clutter)
- **Remove Redundant Helper Labels**: Avoid verbose instructional captions under inputs (e.g., "boxes change dynamically after 4 digits"). Keep UI labels concise and self-explanatory.
- **Micro-Feedback Over Static Text**: Use smooth toast banners or inline icons instead of wall-of-text explanations.

### C. Zero Border Policy & Surface Elevation
- **No 1px Outline Borders**: Do NOT use visible 1px borders (`border`, `border-neutral-800`, `border-white/10`).
- **Surface Elevation**: Separate containers using subtle background contrast (`bg-black` -> `bg-neutral-950` -> `bg-neutral-900` -> `bg-neutral-850`).

---

## 2. Authentication & Unauthenticated Usability Rules

1. **Context-Aware CTAs**:
   - When a user is **unauthenticated** on public/dashboard routes, interactive actions requiring an account (e.g. Registering an Endpoint, Creating a Workflow) must display `"Log in to Register Endpoint"` or `"Log in to Continue"` and route cleanly to `/login`.
2. **Protected Route Fallback**:
   - Protected client pages (`/workflows`, `/status-pages`, `/profile`) must check for an auth token in `useEffect` and redirect unauthenticated visitors to `/login`.

---

## 3. Dynamic PIN Input Component Standards

- **Default Box Count**: Always render 4 boxes minimum.
- **Seamless Auto-Advance**:
  - As soon as the 4th digit is entered, the input automatically expands to 5 boxes and advances focus to the 5th box without requiring arrow keys or manual clicks.
  - Typing the 5th character immediately inputs into the 5th box.
  - Backspacing contracts the box count back down to 4 dynamically.
- **Masking & Security**: Include a toggle button to show/hide PIN values. Never expose plain text PINs in persistent storage or log statements.

---

## 4. Performance & Bundle Optimization Checklist

1. [ ] **Component Imports**: Import specific icons directly from `lucide-react`.
2. [ ] **Image & Asset Optimization**: Use Next.js `<Image>` or optimized SVG assets.
3. [ ] **State Boundaries**: Keep transient modal/input state within local components to prevent unnecessary tree re-renders.
4. [ ] **Build Verification**: Run `npm run build` in `frontend` before finalizing work to ensure 0 build errors.
