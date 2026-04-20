# Migration Phases

## Phase 0: Lock current behavior

Goal: define baseline before moving code.

Tasks:

1. Audit current app behavior against AGENTS notes and existing Playwright smoke coverage.
2. Expand Playwright coverage before major refactor where gaps exist:
   - duplicate entry validation
   - 30-entry cap
   - restore banner dismissal behavior
   - mute persistence
   - legacy base64 URL fallback
   - fallback share input path when clipboard unavailable
   - forced-colors and dark mode redraw-sensitive behavior where feasible
3. Record manual checks still required because automation cannot fully cover them:
   - canvas rendering correctness
   - audio tick/stop feel
   - assistive live-region announcements

Exit criteria:

- Smoke suite green.
- Missing critical regression cases added or explicitly documented.

## Phase 1: Introduce tooling foundation

Goal: add TypeScript and Vite without moving all logic at once.

Tasks:

1. Add Vite.
2. Add TypeScript and `tsconfig.json`.
3. Add `src/main.ts` as thin bootstrap file.
4. Update `index.html` to load Vite entry.
5. Add npm scripts:
   - `dev`
   - `build`
   - `preview`
   - existing `test:e2e`
6. Update Playwright base flow to run against Vite dev server or preview server.

Guideline:

- Do not convert entire app yet.
- Keep initial bootstrap minimal, even if it temporarily imports existing JS.

Exit criteria:

- App runs under Vite dev server.
- App builds successfully.
- Existing smoke tests green against Vite-served app.

## Phase 2: Break monolith into ESM modules

Status: complete.

Goal: remove single-file architecture before strict typing fight starts.

Tasks:

1. Extract DOM refs.
2. Extract shared state container.
3. Extract pure helpers first:
   - text truncation
   - segment brightness detection
   - entry hash
   - share URL encode/decode
4. Extract storage logic.
5. Extract share logic.
6. Extract wheel theme/canvas setup/draw helpers.
7. Extract spin logic.
8. Extract result overlay behavior.
9. Extract accessibility announcers and wheel description sync.
10. Reduce `main.ts` to bootstrap + wiring only.

Guideline:

- During this phase, mixed `.js` and `.ts` files acceptable if needed.
- Prefer preserving function bodies first, then improve types second.

Exit criteria:

- No large monolith file remains.
- Each module has single clear responsibility.
- Runtime behavior unchanged.

## Phase 3: Convert modules to TypeScript

Goal: move all runtime app logic to `.ts` modules.

Recommended order:

1. Pure helper modules.
2. State and shared type modules.
3. Storage/share encoding modules.
4. DOM refs and render helpers.
5. Wheel/theme/canvas modules.
6. Spin/audio/result modules.
7. Final bootstrap and event binding modules.

Why this order:

- Pure logic gives fast type wins.
- Shared types become stable before side-effect-heavy modules depend on them.
- DOM and browser API typing gets easier once state contracts are explicit.

Exit criteria:

- No runtime app source remains in JavaScript.
- Build and tests green.

## Phase 4: Tighten TypeScript

Goal: move from permissive compile to useful compile guarantees.

Tasks:

1. Turn on stricter compiler options incrementally.
2. Remove unsafe casts and non-null assertions where avoidable.
3. Replace broad `any` with real types.
4. Add explicit return types on exported functions where clarity helps.
5. Move ambient constants and shared interfaces into `src/types`.

Recommended strictness order:

1. `noImplicitReturns`
2. `noFallthroughCasesInSwitch`
3. `noUncheckedIndexedAccess`
4. `strictNullChecks`
5. full `strict`

Note:

- Order may change depending on pain points. `strictNullChecks` may need to come earlier if module boundaries rely on null-safe DOM refs.

Exit criteria:

- TypeScript strict mode on, or explicit documented rationale for any remaining relaxed flag.

## Phase 5: Convert tests and supporting config

Goal: align surrounding code with TS codebase.

Tasks:

1. Convert Playwright config to TypeScript if desired.
2. Convert smoke tests from `.js` to `.ts`.
3. Add shared test helpers with typed fixtures where useful.
4. Keep tests readable; avoid type noise.

Exit criteria:

- App and test code both type-checked or deliberately scoped.

## Phase 6: Final cleanup and cutover

Goal: remove legacy leftovers.

Tasks:

1. Delete obsolete JS files.
2. Remove temporary compatibility shims used during migration.
3. Update repo docs for Vite/TS workflow.
4. Confirm final output shape for deployment.
5. Freeze module boundaries so later work does not collapse back into one giant bootstrap file.

Exit criteria:

- Repo default workflow is Vite + TypeScript.
- Legacy JS app path removed.
