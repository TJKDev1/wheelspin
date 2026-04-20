# Module And Type Design

## Core app types

Create central types early. They reduce drift while modules move.

Suggested types:

```ts
export type EntryLabel = string;

export interface AppState {
  entries: EntryLabel[];
  spinning: boolean;
  currentAngle: number;
  angularVelocity: number;
  muted: boolean;
  shareOverflow: boolean;
  savedEntries: EntryLabel[] | null;
  restoreFocusOnResultClose: boolean;
}

export interface UndoState {
  entries: EntryLabel[] | null;
}

export interface WheelTheme {
  segColors: string[];
  segText: string;
  segTextDark: string;
  segBorder: string;
  centerFill: string;
  centerStroke: string;
  ringStroke: string;
  emptyFill: string;
  emptyStroke: string;
  emptyText: string;
  fontDisplay: string;
  fontBody: string;
}
```

Do not over-model every transient local variable. Model shared contracts first.

## DOM refs typing

Current app relies on many required DOM nodes. Centralize lookup in one module that either:

1. throws immediately if required element missing, or
2. returns strongly typed refs after invariant checks.

Suggested pattern:

```ts
function requireElement<T extends Element>(value: T | null, id: string): T {
  if (!value) throw new Error(`Missing required element: ${id}`);
  return value;
}
```

Then build typed `refs` object once.

Reason:

- Better than scattering `!` assertions everywhere.
- Failure happens early and clearly.

## State ownership

Avoid multiple mutable module-level globals spread across files.

Use one of two patterns:

1. Single mutable state object passed into modules.
2. Small app context object containing state, refs, timers, cache, and services.

Recommended shape for this repo:

```ts
export interface AppContext {
  state: AppState;
  refs: DomRefs;
  wheelTheme: WheelTheme;
  cache: WheelRenderCache;
  timers: AppTimers;
  audio: AudioService;
}
```

This keeps architecture simple without introducing framework/store complexity.

## Canvas and cache types

Current offscreen cache uses nullable variables and implicit invalidation. Make that explicit.

Suggested types:

```ts
export interface WheelRenderCache {
  offscreen: HTMLCanvasElement | null;
  offscreenCtx: CanvasRenderingContext2D | null;
  offscreenSize: number;
  offscreenEntriesHash: string;
}

export interface CanvasSize {
  cssSize: number;
  dpr: number;
  pixelWidth: number;
  pixelHeight: number;
}
```

## Timers and animation handles

Browser timer typing can get noisy when mixed with Node types. Prefer browser-targeted config and explicit nullable number handles.

Suggested types:

```ts
export interface AppTimers {
  animFrameId: number | null;
  pointerResetTimer: number | null;
  restoreTimer: number | null;
  errorTimer: number | null;
}
```

If TypeScript environment pulls Node timer types, fix config rather than spreading unions everywhere.

## Audio typing

Wrap audio behavior behind tiny service module.

Suggested interface:

```ts
export interface AudioService {
  getAudioContext(): AudioContext;
  playTick(velocity: number): void;
  playStopSound(): void;
  dispose(): Promise<void> | void;
}
```

Reason:

- Browser vendor-prefixed constructor handling lives in one place.
- App code no longer owns raw `audioCtx` details.

## Share and URL types

Important because current app has compatibility obligations.

Suggested types:

```ts
export interface ParsedWheelState {
  entries: string[];
  source: "query" | "legacy-base64" | "none";
}

export interface ShareAvailability {
  canShare: boolean;
  shareOverflow: boolean;
  url: string | null;
  reason: "needs-more-entries" | "overflow" | "ok";
}
```

This makes edge-case reasoning more explicit than current boolean-only flow.

## Recommended module map from existing file

Map current responsibilities into future modules:

- `src/dom/refs.ts`
  - all `document.getElementById` / `querySelector` refs now near lines 24-53
- `src/audio/ticks.ts`
  - audio context, tick, stop sound near lines 61-154
- `src/storage/entries.ts`
  - `saveToStorage`, `loadFromStorage`, restore banner eligibility
- `src/wheel/cache.ts`
  - offscreen cache creation and invalidation
- `src/wheel/theme.ts`
  - `refreshWheelTheme`, dark/high-contrast token reads
- `src/wheel/text.ts`
  - `segmentNeedsDarkText`, `getTextSize`, `truncateText`
- `src/wheel/draw.ts`
  - `setupCanvas`, `requestDraw`, `renderWheelToOffscreen`, `drawWheel`, `drawEmptyWheel`
- `src/entries/actions.ts`
  - `addEntry`, `removeEntry`, `clearEntries`
- `src/entries/render.ts`
  - `renderEntries`, limit indicator, wheel description sync
- `src/spin/run.ts`
  - `startSpin`, `tick`, winner selection helpers
- `src/share/url.ts`
  - `buildShareURL`, `syncURL`, `loadFromURL`, legacy format support
- `src/share/share.ts`
  - `shareWheel`, copied state, fallback input, toast
- `src/result/overlay.ts`
  - dialog open/close, focus restoration, spin again
- `src/accessibility/announcements.ts`
  - `announceStatus`, `announceAlert`
- `src/app/events.ts`
  - event binding and resize/theme listeners
- `src/main.ts`
  - bootstrap only

## Anti-patterns to avoid during migration

1. Massive `types.ts` dumping ground with unrelated interfaces.
2. Replacing one giant file with one giant `main.ts` plus tiny wrappers.
3. Overusing classes for browser utility code.
4. Blanket `as HTMLElement` casts without invariant checks.
5. Turning every helper into generic abstraction with no real need.
6. Splitting so aggressively that simple event flow becomes hard to follow.
