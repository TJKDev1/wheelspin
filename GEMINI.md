# WheelSpin

A clean, purposeful, web-based random decision-making tool.

## Project Overview

**WheelSpin** is a single-page application (SPA) that allows users to create custom spinning wheels to make random choices. It prioritizes a professional and intentional aesthetic over "game-like" or "childish" designs.

- **Main Technologies:**
    - **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES6+).
    - **Graphics:** HTML5 Canvas API for rendering the wheel and handling spin physics.
    - **Styling:** Modern CSS using the **OKLCH** color system and CSS variables for theming (including Dark Mode and High Contrast Mode support).
    - **State Management:** URL parameters for sharing wheels and `localStorage` for persistent user data.

## Building and Running

This is a static web project with no build step required.

- **Running Locally:** Open `index.html` directly in any modern web browser or use a simple static file server (e.g., `npx serve .` or Python's `http.server`).
- **Testing:** No automated testing suite is currently configured. Manual verification of the canvas rendering and spin logic is required.

## Development Conventions

### Styling & Design
- **Aesthetic:** Follow the "Clean, Confident, Purposeful" direction defined in `.impeccable.md`. Avoid "childish" elements like neon glows or cartoonish styling.
- **Color System:** Use the OKLCH color tokens defined in `index.css`. Prefer semantic variables (e.g., `--color-primary`, `--wheel-seg-1`) over hardcoded values.
- **Typography:** Uses `Sora` for display/headings and `Source Sans 3` for body text.

### Code Structure
- **Vanilla First:** Do not introduce heavy frameworks (React, Vue, etc.) or utility-first CSS libraries (Tailwind) unless explicitly requested. Maintain the lightweight, zero-dependency nature of the project.
- **JavaScript:** Logic is contained in `index.js`, organized by functional sections (DOM refs, State, Canvas Setup, Spin Physics, etc.). Use the established IIFE pattern to avoid global scope pollution.
- **Canvas:** The wheel is pre-rendered to an offscreen canvas for performance when entries haven't changed.
- **Accessibility:** Maintain ARIA labels, screen reader announcements (via `#sr-announcement`), and semantic HTML structures. Ensure the `canvas` has a proper text alternative.

### Sharing & Persistence
- **URL Sync:** The application state (entries) is serialized into the URL hash to allow for easy sharing.
- **Persistence:** Use the `wheelspin_entries` key in `localStorage` to save and restore user wheels.
