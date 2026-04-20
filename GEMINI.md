# WheelSpin

A clean, purposeful, web-based random decision-making tool.

## Project Overview

**WheelSpin** is a single-page application (SPA) that allows users to create custom spinning wheels to make random choices. It prioritizes a professional and intentional aesthetic over "game-like" or "childish" designs.

- **Main Technologies:**
    - **Frontend:** Vanilla HTML5, CSS3, and TypeScript via Vite.
    - **Graphics:** HTML5 Canvas API for rendering the wheel and handling spin physics.
    - **Styling:** Modern CSS using the **OKLCH** color system and CSS variables for theming (including Dark Mode and High Contrast Mode support).
    - **State Management:** URL parameters for sharing wheels and `localStorage` for persistent user data.

## Building and Running

This is browser-native web project with Vite-based dev and build workflow.

- **Install:** `npm install`
- **Dev Server:** `npm run dev`
- **Production Build:** `npm run build`
- **Preview Build:** `npm run preview`
- **Type Check:** `npm run typecheck`
- **Testing:** `npm run test:e2e` for Playwright smoke coverage, plus manual verification of canvas rendering and spin/audio behavior.

## Development Conventions

### Styling & Design
- **Aesthetic:** Follow the "Clean, Confident, Purposeful" direction defined in `.impeccable.md`. Avoid "childish" elements like neon glows or cartoonish styling.
- **Color System:** Use the OKLCH color tokens defined in `index.css`. Prefer semantic variables (e.g., `--color-primary`, `--wheel-seg-1`) over hardcoded values.
- **Typography:** Uses `Sora` for display/headings and `Source Sans 3` for body text.

### Code Structure
- **Vanilla First:** Do not introduce heavy frameworks (React, Vue, etc.) or utility-first CSS libraries (Tailwind) unless explicitly requested. Maintain the lightweight, zero-dependency nature of the project.
- **TypeScript Modules:** Runtime entrypoint is `src/main.ts`. Keep DOM access centralized in `src/dom.ts`, shared state in `src/state.ts`, pure helpers in `src/lib/`, and feature logic in focused modules.
- **Canvas:** The wheel is pre-rendered to an offscreen canvas for performance when entries haven't changed.
- **Accessibility:** Maintain ARIA labels, screen reader announcements via `#sr-status` and `#sr-alert`, and semantic HTML structures. Ensure `canvas` keeps proper text alternative.

### Sharing & Persistence
- **URL Sync:** Application state uses `?w=` query param with pipe-separated, `encodeURIComponent`-escaped entries. Legacy base64 loading remains fallback path.
- **Persistence:** Use the `wheelspin_entries` key in `localStorage` to save and restore user wheels.
