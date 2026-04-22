import { cleanupSpinRuntime, toggleMute } from "./spin-runtime";
import { invalidateWheelCache, refreshWheelTheme } from "./wheel-render";

interface AppEventRefs {
  addBtn: HTMLButtonElement;
  entryInput: HTMLInputElement;
  entryError: HTMLElement;
  entriesList: HTMLOListElement;
  clearAllBtn: HTMLButtonElement;
  spinBtn: HTMLButtonElement;
  resultOverlay: HTMLDialogElement;
  resultCloseBtn: HTMLButtonElement;
  resultSpinAgain: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  resultShareBtn: HTMLButtonElement;
  undoBtn: HTMLButtonElement;
  restoreBtn: HTMLButtonElement;
  dismissRestoreBtn: HTMLButtonElement;
  canvas: HTMLCanvasElement;
  wheelContainer: HTMLElement;
  muteBtn: HTMLButtonElement;
}

interface AppEventHandlers {
  addEntry: (label: string) => boolean;
  renderEntries: () => void;
  requestDraw: () => void;
  hideEntryError: () => void;
  removeEntry: (index: number) => void;
  clearEntries: () => void;
  startSpin: () => void;
  closeResult: (options?: { restoreFocus?: boolean }) => void;
  handleResultOverlayClose: () => void;
  markResultOverlayCancel: () => void;
  shareWheel: (triggerBtn: HTMLButtonElement) => void;
  performUndo: () => void;
  performRestore: () => void;
  dismissRestoreBanner: () => void;
  setupCanvas: () => void;
  startWheelDrag: (event: PointerEvent) => void;
  moveWheelDrag: (event: PointerEvent) => void;
  endWheelDrag: (event: PointerEvent) => void;
  cancelWheelDrag: (event?: PointerEvent) => void;
}

interface BindAppEventsOptions {
  refs: AppEventRefs;
  handlers: AppEventHandlers;
}

function shouldIgnoreGlobalSpace(activeElement: Element | null): boolean {
  if (!activeElement) return true;

  const tag = activeElement.tagName;
  return Boolean(
    tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "BUTTON" ||
      tag === "SELECT" ||
      (activeElement as HTMLElement).isContentEditable ||
      activeElement.closest(
        'a, button, input, textarea, select, [role="button"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"])',
      ),
  );
}

function bindResizeEvents(refs: AppEventRefs, handlers: AppEventHandlers): void {
  const resizeCanvas = (): void => {
    handlers.setupCanvas();
    invalidateWheelCache();
    handlers.requestDraw();
  };

  if (window.ResizeObserver) {
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 200);
    });
    if (refs.canvas.parentElement) {
      observer.observe(refs.canvas.parentElement);
    }
    return;
  }

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 200);
    },
    { passive: true },
  );
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function restartSpinAfterResult(handlers: Pick<BindAppEventsOptions["handlers"], "closeResult" | "startSpin">): void {
  handlers.closeResult({ restoreFocus: false });
  setTimeout(handlers.startSpin, 200);
}

export function bindAppEvents(options: BindAppEventsOptions): void {
  const { refs, handlers } = options;

  refs.addBtn.addEventListener("click", () => {
    const added = handlers.addEntry(refs.entryInput.value);
    if (added) {
      refs.entryInput.value = "";
    }
    refs.entryInput.focus();
    handlers.renderEntries();
    handlers.requestDraw();
  });

  refs.entryInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const added = handlers.addEntry(refs.entryInput.value);
    if (added) {
      refs.entryInput.value = "";
    }
    handlers.renderEntries();
    handlers.requestDraw();
  });

  refs.entryInput.addEventListener("input", () => {
    if (!refs.entryError.hidden) {
      handlers.hideEntryError();
    }
  });

  refs.entriesList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest<HTMLButtonElement>(".entry-remove");
    if (!btn) return;
    const idx = Number.parseInt(btn.dataset.index ?? "", 10);
    if (Number.isNaN(idx)) return;
    handlers.removeEntry(idx);
  });

  refs.clearAllBtn.addEventListener("click", handlers.clearEntries);
  refs.spinBtn.addEventListener("click", handlers.startSpin);
  refs.wheelContainer.addEventListener("pointerdown", handlers.startWheelDrag);
  refs.wheelContainer.addEventListener("pointermove", handlers.moveWheelDrag);
  refs.wheelContainer.addEventListener("pointerup", handlers.endWheelDrag);
  refs.wheelContainer.addEventListener("pointercancel", handlers.cancelWheelDrag);

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.key !== " ") return;

    if (refs.resultOverlay.open) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
        return;
      }
      event.preventDefault();
      restartSpinAfterResult(handlers);
      return;
    }

    if (shouldIgnoreGlobalSpace(document.activeElement)) return;

    event.preventDefault();
    handlers.startSpin();
  });

  refs.resultCloseBtn.addEventListener("click", () => handlers.closeResult());
  refs.resultSpinAgain.addEventListener("click", () => {
    restartSpinAfterResult(handlers);
  });

  refs.resultOverlay.addEventListener("click", (event) => {
    if (event.target === refs.resultOverlay) {
      handlers.closeResult();
    }
  });
  refs.resultOverlay.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.key !== " ") return;
    if (isTextEntryTarget(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    restartSpinAfterResult(handlers);
  });
  refs.resultOverlay.addEventListener("keyup", (event) => {
    if (event.code !== "Space" && event.key !== " ") return;
    if (isTextEntryTarget(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
  });
  refs.resultOverlay.addEventListener("close", handlers.handleResultOverlayClose);
  refs.resultOverlay.addEventListener("cancel", handlers.markResultOverlayCancel);

  refs.shareBtn.addEventListener("click", () => handlers.shareWheel(refs.shareBtn));
  refs.resultShareBtn.addEventListener("click", () =>
    handlers.shareWheel(refs.resultShareBtn),
  );

  refs.undoBtn.addEventListener("click", handlers.performUndo);
  refs.restoreBtn.addEventListener("click", handlers.performRestore);
  refs.dismissRestoreBtn.addEventListener("click", handlers.dismissRestoreBanner);

  bindResizeEvents(refs, handlers);

  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const hcmQuery = window.matchMedia("(forced-colors: active)");
  const updateThemeAndDraw = (): void => {
    refreshWheelTheme();
    invalidateWheelCache();
    handlers.requestDraw();
  };
  darkModeQuery.addEventListener("change", updateThemeAndDraw);
  hcmQuery.addEventListener("change", updateThemeAndDraw);

  window.addEventListener("blur", () => handlers.cancelWheelDrag());
  window.addEventListener("beforeunload", cleanupSpinRuntime);
  refs.muteBtn.addEventListener("click", () => toggleMute(refs.muteBtn));
}
