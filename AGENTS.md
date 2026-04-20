# WheelSpin Agent Notes

## Repo Shape
- Static single-page app built through Vite + TypeScript.
- Main entrypoints: `index.html`, `index.css`, `src/main.ts`.
- App logic lives in focused TS modules under `src/`; preserve current module boundaries and avoid rebuilding monolithic bootstrap.

## Run And Verify
- `npm install`
- `npm run dev` for local work.
- `npm run build` for production output in `dist/`.
- `npm run typecheck` and `npm run test:e2e` for verification.
- Manual in-browser verification still matters for canvas, audio, dark mode, and forced-colors.

## Manual Checks That Matter
- Verify add/remove/clear/undo flows.
- Verify spin: 2+ entries, winner selection, result dialog.
- Verify share: disabled below 2 entries, copies on desktop, native share on touch, fallback to temp input when APIs fail.
- Verify persistence: `wheelspin_entries`, `wheelspin_muted`, restore banner only when URL empty and stored entries ≥2.
- Verify a11y after UI changes: `#sr-status`, `#sr-alert`, canvas `aria-label`, Space to spin, reduced-motion, dark mode, forced-colors.

## Behavior Constraints From Code
- Shared state in `?w=` as pipe-separated, `encodeURIComponent`-escaped entries.
- `loadFromURL()` accepts legacy base64 as fallback.
- Entry cap: 30. Share disabled (not truncated) if URL exceeds ~2000 chars.
- Wheel rendering uses offscreen canvas cache; invalidated on entry/size/theme change. No DOM-driven rendering unless requested.

## Styling And UX
- Follow `.impeccable.md`: clean, restrained, professional; no playful/game treatments.
- Reuse CSS custom properties from `index.css`, esp. OKLCH semantic tokens and wheel segment tokens.
- Responsive layout hand-authored in `index.css`; preserve `840px` breakpoint stacked mobile layout unless redesigning responsiveness.

## Module Boundaries
- `src/dom.ts` owns required DOM refs and canvas context creation.
- `src/state.ts` owns shared mutable app state.
- `src/lib/` holds pure helpers.
- Feature modules such as entries/spin/share/restore/undo/wheel-render keep browser side effects narrow.
