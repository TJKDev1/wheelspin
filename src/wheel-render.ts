import { ctx } from "./dom";
import { state } from "./state";
import { truncateText } from "./lib/text";
import { getEntriesHash, segmentNeedsDarkText } from "./lib/wheel";

interface WheelTheme {
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

const DPR = Math.min(window.devicePixelRatio || 1, 2);

let drawPending = false;
let wheelTheme: WheelTheme = {
  segColors: [],
  segText: "",
  segTextDark: "",
  segBorder: "",
  centerFill: "",
  centerStroke: "",
  ringStroke: "",
  emptyFill: "",
  emptyStroke: "",
  emptyText: "",
  fontDisplay: "'Sora', system-ui, sans-serif",
  fontBody: "'Figtree', system-ui, sans-serif",
};

function createOffscreenCanvas(size: number): void {
  state.offscreen = document.createElement("canvas");
  state.offscreen.width = size * DPR;
  state.offscreen.height = size * DPR;
  state.offscreenCtx = state.offscreen.getContext("2d");
  if (!state.offscreenCtx) {
    state.offscreen = null;
    return;
  }
  state.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
  state.offscreenCtx.scale(DPR, DPR);
  state.offscreenSize = size;
}

function getTextSize(count: number, canvasSize: number): number {
  const base = canvasSize / 28;
  if (count <= 4) return Math.min(base, 24);
  if (count <= 6) return Math.min(base * 0.85, 20);
  if (count <= 10) return Math.min(base * 0.7, 17);
  return Math.min(base * 0.55, 14);
}

function drawSegmentText(
  renderCtx: CanvasRenderingContext2D,
  startAngle: number,
  sliceAngle: number,
  radius: number,
  size: number,
  entry: string,
  segColor: string,
): void {
  renderCtx.save();
  renderCtx.translate(size / 2, size / 2);
  const textAngle = startAngle + sliceAngle / 2;
  const normalizedAngle = ((textAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const isFlipped =
    normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;
  renderCtx.rotate(isFlipped ? textAngle + Math.PI : textAngle);

  renderCtx.fillStyle = segmentNeedsDarkText(segColor)
    ? wheelTheme.segTextDark
    : wheelTheme.segText;
  renderCtx.font = `600 ${getTextSize(state.entries.length, size)}px ${wheelTheme.fontDisplay}`;
  renderCtx.textAlign = isFlipped ? "left" : "right";
  renderCtx.textBaseline = "middle";

  const maxTextWidth = radius * 0.62;
  const text = truncateText(renderCtx, entry, maxTextWidth);
  renderCtx.fillText(text, isFlipped ? -(radius - 18) : radius - 18, 0);
  renderCtx.restore();
}

function drawEmptyWheel(cx: number, cy: number, radius: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.fillStyle = wheelTheme.emptyFill;
  ctx.fill();
  ctx.strokeStyle = wheelTheme.emptyStroke;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.65, 0, 2 * Math.PI);
  ctx.strokeStyle = wheelTheme.emptyStroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.35, 0, 2 * Math.PI);
  ctx.strokeStyle = wheelTheme.emptyStroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = wheelTheme.emptyText;
  ctx.font = `500 16px ${wheelTheme.fontBody}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Add choices to spin!", cx, cy - 8);

  ctx.font = `400 13px ${wheelTheme.fontBody}`;
  ctx.fillStyle = wheelTheme.emptyText;
  ctx.globalAlpha = 0.7;
  ctx.fillText("Type a choice and press Enter", cx, cy + 16);
  ctx.globalAlpha = 1;
}

function renderWheelToOffscreen(size: number): void {
  if (
    !state.offscreen ||
    state.offscreenSize !== size ||
    state.offscreenEntriesHash !== getEntriesHash(state.entries)
  ) {
    createOffscreenCanvas(size);
    state.offscreenEntriesHash = getEntriesHash(state.entries);
  }

  if (!state.offscreenCtx) return;

  const cx = size / 2;
  const cy = size / 2;
  const radius = cx - 6;
  const sliceAngle = (2 * Math.PI) / state.entries.length;

  state.offscreenCtx.clearRect(0, 0, size, size);

  state.entries.forEach((entry, i) => {
    const startAngle = i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const segColor = getSegmentColor(i);

    state.offscreenCtx!.beginPath();
    state.offscreenCtx!.moveTo(cx, cy);
    state.offscreenCtx!.arc(cx, cy, radius, startAngle, endAngle);
    state.offscreenCtx!.closePath();
    state.offscreenCtx!.fillStyle = segColor;
    state.offscreenCtx!.fill();

    state.offscreenCtx!.beginPath();
    state.offscreenCtx!.moveTo(cx, cy);
    state.offscreenCtx!.arc(cx, cy, radius, startAngle, endAngle);
    state.offscreenCtx!.closePath();
    state.offscreenCtx!.strokeStyle = wheelTheme.segBorder;
    state.offscreenCtx!.lineWidth = 2;
    state.offscreenCtx!.stroke();

    drawSegmentText(state.offscreenCtx!, startAngle, sliceAngle, radius, size, entry, segColor);
  });
}

export function invalidateWheelCache(): void {
  state.offscreenEntriesHash = "";
  state.offscreen = null;
  state.offscreenCtx = null;
  state.offscreenSize = 0;
}

export function refreshWheelTheme(): void {
  const styles = getComputedStyle(document.documentElement);
  const hcm = window.matchMedia("(forced-colors: active)").matches;

  const segColors: string[] = [];
  for (let i = 1; i <= 12; i += 1) {
    segColors.push(styles.getPropertyValue(`--wheel-seg-${i}`).trim());
  }

  if (hcm) {
    const hcmColors = ["Canvas", "ButtonFace"];
    wheelTheme = {
      segColors: Array.from({ length: 12 }, (_, i) => hcmColors[i % 2] ?? "Canvas"),
      segText: "CanvasText",
      segTextDark: "CanvasText",
      segBorder: "CanvasText",
      centerFill: "Canvas",
      centerStroke: "CanvasText",
      ringStroke: "CanvasText",
      emptyFill: "Canvas",
      emptyStroke: "CanvasText",
      emptyText: "CanvasText",
      fontDisplay:
        styles.getPropertyValue("--font-display").trim() ||
        "'Sora', system-ui, sans-serif",
      fontBody:
        styles.getPropertyValue("--font-body").trim() ||
        "'Figtree', system-ui, sans-serif",
    };
    return;
  }

  wheelTheme = {
    segColors,
    segText: styles.getPropertyValue("--wheel-seg-text").trim(),
    segTextDark: styles.getPropertyValue("--wheel-seg-text-dark").trim(),
    segBorder: styles.getPropertyValue("--wheel-seg-border").trim(),
    centerFill: styles.getPropertyValue("--wheel-center-fill").trim(),
    centerStroke: styles.getPropertyValue("--wheel-center-stroke").trim(),
    ringStroke: styles.getPropertyValue("--wheel-ring-stroke").trim(),
    emptyFill: styles.getPropertyValue("--wheel-empty-fill").trim(),
    emptyStroke: styles.getPropertyValue("--wheel-empty-stroke").trim(),
    emptyText: styles.getPropertyValue("--wheel-empty-text").trim(),
    fontDisplay:
      styles.getPropertyValue("--font-display").trim() ||
      "'Sora', system-ui, sans-serif",
    fontBody:
      styles.getPropertyValue("--font-body").trim() ||
      "'Figtree', system-ui, sans-serif",
  };
}

export function getSegmentColor(index: number): string {
  return wheelTheme.segColors[index % wheelTheme.segColors.length] || "transparent";
}

export function setupCanvas(canvas: HTMLCanvasElement): void {
  const container = canvas.parentElement;
  const size = container?.clientWidth ?? 0;
  if (size === 0) {
    requestAnimationFrame(() => setupCanvas(canvas));
    return;
  }

  canvas.width = size * DPR;
  canvas.height = size * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(DPR, DPR);
}

export function drawWheel(canvas: HTMLCanvasElement): void {
  const size = canvas.width / DPR;
  const cx = size / 2;
  const cy = size / 2;
  const radius = cx - 6;

  ctx.clearRect(0, 0, size, size);

  if (state.entries.length === 0) {
    drawEmptyWheel(cx, cy, radius);
    return;
  }

  if (state.spinning && state.offscreen) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.currentAngle);
    ctx.drawImage(state.offscreen, -cx, -cy, size, size);
    ctx.restore();
  } else {
    if (!state.spinning) {
      renderWheelToOffscreen(size);
    }

    const sliceAngle = (2 * Math.PI) / state.entries.length;
    state.entries.forEach((entry, i) => {
      const startAngle = state.currentAngle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const segColor = getSegmentColor(i);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segColor;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = wheelTheme.segBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      drawSegmentText(ctx, startAngle, sliceAngle, radius, size, entry, segColor);
    });
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.12, 0, 2 * Math.PI);
  ctx.fillStyle = wheelTheme.centerFill;
  ctx.fill();
  ctx.strokeStyle = wheelTheme.centerStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = wheelTheme.ringStroke;
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function requestDraw(canvas: HTMLCanvasElement): void {
  if (drawPending || state.spinning) return;
  drawPending = true;
  requestAnimationFrame(() => {
    drawPending = false;
    drawWheel(canvas);
  });
}
