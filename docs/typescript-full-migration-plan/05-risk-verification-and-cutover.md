# Risk, Verification, And Cutover

## Main migration risks

### 1. Behavior drift during module split

Biggest risk. Code today shares implicit mutable state everywhere.

Mitigation:

- refactor structure before refactor behavior
- preserve function logic first
- run tests after each extraction slice

### 2. DOM nullability noise causing bad casts

Common TS migration failure mode: many `!` and `as` assertions hide real problems.

Mitigation:

- central required-element loader
- fail fast during bootstrap
- avoid repeated ad hoc DOM queries

### 3. Browser/Node type pollution

Playwright, Vite, and TS can pull in Node types that complicate browser timer and global types.

Mitigation:

- keep browser app code in browser-targeted tsconfig environment
- scope Node types only where needed

### 4. Share URL compatibility break

High user-facing risk. Existing shared links must keep working.

Mitigation:

- write encode/decode tests before moving share code
- keep legacy base64 parser until deliberate removal decision

### 5. Canvas rendering regressions

Typing itself will not catch visual breakage.

Mitigation:

- keep draw code mostly copy-first during extraction
- verify theme changes, resize, empty state, and spinning path manually

### 6. Accessibility regressions

Refactors often drop focus management and live region updates.

Mitigation:

- keep a11y behavior in dedicated module
- verify keyboard and announcement paths after each phase

## Verification matrix

Every major phase should verify these flows:

1. Add entry via button.
2. Add entry via Enter.
3. Duplicate entry rejected.
4. Empty input rejected.
5. Remove one entry.
6. Clear all.
7. Undo clear.
8. Restore saved entries.
9. Dismiss restore banner.
10. Spin with reduced motion.
11. Spin with normal motion.
12. Space key spins from page.
13. Space key does not hijack input typing.
14. Result dialog close and spin-again flow.
15. Share works on clipboard path.
16. Share fallback input appears when clipboard/share unavailable.
17. Share disabled below 2 entries.
18. Share disabled when encoded URL too long.
19. Dark mode redraw still correct.
20. Forced-colors mode still readable.
21. Mute toggle persists.
22. Offscreen cache still invalidates on entry/theme/size change.

## Recommended PR slicing

Do not ship migration in one huge PR if avoidable.

Recommended slices:

1. Add Vite + TS scaffolding.
2. Add baseline regression tests.
3. Extract pure modules.
4. Extract DOM/state/render modules.
5. Extract wheel/spin/share/audio modules.
6. Convert remaining runtime files to TS.
7. Tighten strictness.
8. Convert tests/config to TS.
9. Remove legacy JS leftovers.

If team prefers fewer PRs, keep boundaries by phase anyway.

## Definition of done

Migration complete only when all are true:

1. App entrypoint is TypeScript.
2. App logic lives under `src/` as modules.
3. No runtime app logic remains in root `index.js`.
4. `vite build` succeeds.
5. `tsc --noEmit` succeeds.
6. Playwright smoke and added migration coverage succeed.
7. Manual verification passes for audio, canvas, accessibility-sensitive flows.
8. Developer docs updated for `npm install`, `npm run dev`, `npm run build`, and `npm run test:e2e`.

## Cutover checklist

Before deleting final JS path, confirm:

1. No HTML still points at legacy script.
2. No tests depend on old server assumptions.
3. No module still imports from temporary JS shim.
4. No `allowJs` dependency remains for runtime code.
5. Deployment target supports Vite build output.

## Post-migration cleanup

After cutover:

1. Review modules for over-splitting and merge where simpler.
2. Remove dead compatibility code used only during transition.
3. Consider linting and formatter cleanup only after behavior stable.
4. Consider moving tests to richer typed helper model if test suite grows.
