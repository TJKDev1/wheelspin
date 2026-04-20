function getRequiredElement<T extends Element>(
  selector: string,
  parent: ParentNode = document,
): T {
  const element = parent.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }
  return ctx;
}

export const dom = {
  canvas: getRequiredElement<HTMLCanvasElement>("#wheel-canvas"),
  wheelContainer: getRequiredElement<HTMLElement>(".wheel-container"),
  entryInput: getRequiredElement<HTMLInputElement>("#entry-input"),
  addBtn: getRequiredElement<HTMLButtonElement>("#add-entry-btn"),
  clearAllBtn: getRequiredElement<HTMLButtonElement>("#clear-all-btn"),
  entriesList: getRequiredElement<HTMLOListElement>("#entries-list"),
  spinBtn: getRequiredElement<HTMLButtonElement>("#spin-btn"),
  shareBtn: getRequiredElement<HTMLButtonElement>("#share-btn"),
  shareStatus: getRequiredElement<HTMLElement>("#share-status"),
  resultOverlay: getRequiredElement<HTMLDialogElement>("#result-overlay"),
  resultText: getRequiredElement<HTMLElement>("#result-text"),
  resultSpinAgain: getRequiredElement<HTMLButtonElement>("#result-spin-again"),
  resultShareBtn: getRequiredElement<HTMLButtonElement>("#result-share-btn"),
  shareToast: getRequiredElement<HTMLElement>("#share-toast"),
  srStatus: getRequiredElement<HTMLElement>("#sr-status"),
  srAlert: getRequiredElement<HTMLElement>("#sr-alert"),
  wheelPointer: getRequiredElement<HTMLElement>(".wheel-pointer"),
  wheelChoicesList: getRequiredElement<HTMLElement>("#wheel-choices-list"),
  spinStatus: getRequiredElement<HTMLElement>("#spin-status"),
  entryError: getRequiredElement<HTMLElement>("#entry-error"),
  undoToast: getRequiredElement<HTMLElement>("#undo-toast"),
  undoToastText: getRequiredElement<HTMLElement>("#undo-toast-text"),
  undoBtn: getRequiredElement<HTMLButtonElement>("#undo-btn"),
  restoreBanner: getRequiredElement<HTMLElement>("#restore-banner"),
  restoreBtn: getRequiredElement<HTMLButtonElement>("#restore-btn"),
  dismissRestoreBtn: getRequiredElement<HTMLButtonElement>("#dismiss-restore-btn"),
  muteBtn: getRequiredElement<HTMLButtonElement>("#mute-btn"),
  resultCloseBtn: getRequiredElement<HTMLButtonElement>("#result-close-btn"),
  entriesPanel: getRequiredElement<HTMLElement>(".entries-panel"),
} as const;

export const ctx = getCanvasContext(dom.canvas);
