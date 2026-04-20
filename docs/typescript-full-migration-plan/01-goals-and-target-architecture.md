# Goals And Target Architecture

## Why migrate

Current codebase has crossed threshold where plain single-file JavaScript is main maintenance cost.

Current constraints:

- `index.js` is roughly 1,469 lines in one IIFE.
- State and side effects are shared across unrelated concerns.
- Many browser API contracts are implicit: DOM refs, `AudioContext`, canvas APIs, storage payloads, URL parsing, timer handles, dialog behavior.
- Refactors carry high regression risk because dependencies are hidden in file-local mutable variables.

TypeScript migration should solve maintainability problem, not only add syntax.

## Primary goals

1. Replace monolithic `index.js` with small TypeScript modules grouped by behavior.
2. Add compile-time checks for state shape, DOM contracts, browser API usage, and inter-module boundaries.
3. Move local development to Vite for ESM-first workflow and predictable dev/build commands.
4. Preserve all behavior constraints already encoded in app and tests.
5. Make future features cheaper to add without reintroducing global shared-state sprawl.

## Non-goals

1. No framework rewrite.
2. No redesign of visual system unless separate task requests it.
3. No change to share-link format except maintaining current format and legacy fallback.
4. No replacement of canvas wheel with DOM/SVG renderer.
5. No broad UX rewrite during migration.

## Target architecture

Target app structure should stay small and browser-native:

```text
src/
  main.ts
  app/
    bootstrap.ts
    state.ts
    actions.ts
  dom/
    refs.ts
    renderEntries.ts
    status.ts
  wheel/
    canvas.ts
    draw.ts
    theme.ts
    text.ts
    spin.ts
  share/
    encode.ts
    share.ts
  storage/
    entries.ts
    mute.ts
  result/
    overlay.ts
  audio/
    ticks.ts
  accessibility/
    announcements.ts
    keyboard.ts
  types/
    app.ts
    dom.ts
```

Exact file names may vary. Boundary intent should not.

## Architectural rules

1. Prefer functions over classes.
2. Keep state shape explicit in one place.
3. Push pure logic to pure modules.
4. Keep DOM querying centralized.
5. Keep browser-side effects near app edge, not mixed into shared helpers.
6. Export narrow function interfaces, not mutable globals.
7. Prefer one-way flow:

```text
events -> actions/state update -> render/sync side effects
```

## Behavior invariants migration must preserve

1. Shared wheel state remains encoded in `?w=` as pipe-separated `encodeURIComponent`-escaped entries.
2. Legacy base64 URL loading still works as fallback.
3. Entry cap remains 30.
4. Share becomes disabled, not truncated, when URL exceeds practical limit.
5. Restore banner appears only when URL state is empty and stored entries contain at least 2 choices.
6. Reduced-motion spin path still skips animation correctly.
7. Screen-reader announcements and canvas `aria-label` remain intact.
8. Keyboard Space behavior remains intact.
9. Offscreen wheel cache invalidation still keys off entries, theme, and size changes.
10. Mute persistence still uses `wheelspin_muted`.

## End-state file ownership

- Root keeps `index.html` and `index.css` unless later task moves styles too.
- Root `index.js` disappears.
- Entry script becomes Vite-managed TypeScript entry, imported from HTML.
- Business logic lives under `src/`.
- Tests can remain JavaScript initially, then optionally move to TypeScript after app migration stabilizes.
