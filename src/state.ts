export interface AppState {
  entries: string[];
  spinning: boolean;
  currentAngle: number;
  angularVelocity: number;
  animFrameId: number | null;
  audioCtx: AudioContext | null;
  lastTickSegment: number;
  lastTickAt: number;
  muted: boolean;
  pointerResetTimer: ReturnType<typeof setTimeout> | null;
  shareOverflow: boolean;
  restoreFocusOnResultClose: boolean;
  savedEntries: string[] | null;
  restoreTimer: ReturnType<typeof setTimeout> | null;
  offscreen: HTMLCanvasElement | null;
  offscreenCtx: CanvasRenderingContext2D | null;
  offscreenSize: number;
  offscreenEntriesHash: string;
  undoEntries: string[] | null;
  errorTimer: ReturnType<typeof setTimeout> | null;
}

export const state: AppState = {
  entries: [],
  spinning: false,
  currentAngle: 0,
  angularVelocity: 0,
  animFrameId: null,
  audioCtx: null,
  lastTickSegment: -1,
  lastTickAt: 0,
  muted: localStorage.getItem("wheelspin_muted") === "1",
  pointerResetTimer: null,
  shareOverflow: false,
  restoreFocusOnResultClose: true,
  savedEntries: null,
  restoreTimer: null,
  offscreen: null,
  offscreenCtx: null,
  offscreenSize: 0,
  offscreenEntriesHash: "",
  undoEntries: null,
  errorTimer: null,
};
