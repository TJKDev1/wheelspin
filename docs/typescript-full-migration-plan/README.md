# WheelSpin TypeScript Full Migration Plan

This plan covers complete transfer of WheelSpin from single-file browser JavaScript to modular TypeScript with Vite-based local development and build flow.

Current status:

- Phase 1 complete.
- Phase 2 complete.
- Phase 3 complete.
- Phase 4 complete.
- Phase 5 complete.
- Phase 6 complete.

It is tailored to current repo state:

- App is static single-page app with `index.html`, `index.css`, and Vite-loaded `src/main.ts`.
- App logic now lives in focused TypeScript modules under `src/`.
- Repo uses Vite, TypeScript, and Playwright smoke tests as default workflow.
- Production build outputs to `dist/`.

Use documents in this order:

1. `01-goals-and-target-architecture.md`
2. `02-migration-phases.md`
3. `03-module-and-type-design.md`
4. `04-tooling-and-config-plan.md`
5. `05-risk-verification-and-cutover.md`

Success definition:

- No runtime app logic remains in `.js` files.
- Main app entrypoint is TypeScript.
- App runs through Vite in development.
- App builds through Vite for production.
- Playwright smoke coverage still passes.
- Existing user-visible behavior remains compatible, especially share URLs, storage restore flow, accessibility behavior, and wheel rendering.
