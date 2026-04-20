import { bindAppEvents } from "./app-events";
import { dom } from "./dom";
import { createEntryRuntime } from "./entries-runtime";
import {
  dismissRestoreBanner as dismissRestoreBannerUI,
  performRestore as performRestoreUI,
  showRestoreBanner as showRestoreBannerUI,
} from "./restore";
import {
  closeResult as closeResultUI,
  handleResultOverlayClose as handleResultOverlayCloseUI,
  shouldRestoreFocusOnClose,
  showResult as showResultUI,
} from "./result-overlay";
import { shareWheel as shareWheelUI } from "./share-runtime";
import { startSpin as startSpinUI, updateMuteButton } from "./spin-runtime";
import { loadEntriesFromStorage, saveEntriesToStorage } from "./storage-runtime";
import { state } from "./state";
import {
  hideUndoToast as hideUndoToastUI,
  performUndo as performUndoUI,
  showUndoToast as showUndoToastUI,
} from "./undo";
import {
  drawWheel as drawWheelUI,
  getSegmentColor,
  invalidateWheelCache,
  refreshWheelTheme,
  requestDraw as requestDrawUI,
  setupCanvas as setupCanvasUI,
} from "./wheel-render";
import {
  buildShareURL as buildShareURLUI,
  loadFromURL as loadFromURLUI,
  syncURL as syncURLUI,
} from "./url-runtime";

const {
  addBtn,
  canvas,
  clearAllBtn,
  dismissRestoreBtn,
  entriesList,
  entriesPanel,
  entryError,
  entryInput,
  muteBtn,
  restoreBanner,
  restoreBtn,
  resultCloseBtn,
  resultOverlay,
  resultShareBtn,
  resultSpinAgain,
  resultText,
  shareBtn,
  shareToast,
  spinBtn,
  spinStatus,
  srAlert,
  srStatus,
  undoBtn,
  undoToast,
  undoToastText,
  wheelChoicesList,
  wheelPointer,
} = dom;

const entryRuntime = createEntryRuntime({
  refs: {
    canvas,
    entryInput,
    entryError,
    entriesList,
    entriesPanel,
    clearAllBtn,
    shareBtn,
    resultShareBtn,
    spinBtn,
    spinStatus,
    srAlert,
    wheelChoicesList,
  },
  invalidateWheelCache,
  getSegmentColor,
  saveToStorage,
  syncURL,
  requestDraw,
  hideUndoToast,
  showUndoToast,
});

function init(): void {
  setupCanvas();
  refreshWheelTheme();
  loadFromURL();

  state.savedEntries = loadFromStorage();

  if (state.entries.length === 0 && state.savedEntries && state.savedEntries.length >= 2) {
    showRestoreBanner();
  }

  entryRuntime.renderEntries();
  requestDraw();
  bindEvents();
}

function setupCanvas(): void {
  setupCanvasUI(canvas);
}

function requestDraw(): void {
  requestDrawUI(canvas);
}

function drawWheel(): void {
  drawWheelUI(canvas);
}

function startSpin(): void {
  startSpinUI({
    refs: { canvas, spinBtn, wheelPointer, muteBtn },
    drawWheel,
    showResult,
  });
}

function getWinnerIndex(): number {
  const sliceAngle = (2 * Math.PI) / state.entries.length;
  const pointerAngle = ((3 * Math.PI) / 2 - state.currentAngle) % (2 * Math.PI);
  const normalised = ((pointerAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(normalised / sliceAngle) % state.entries.length;
}

function showResult(): void {
  const winnerIndex = getWinnerIndex();
  const winner = state.entries[winnerIndex] ?? state.entries[0] ?? "";

  state.restoreFocusOnResultClose = showResultUI(
    { resultOverlay, resultText, spinBtn, srAlert },
    winner,
  );
}

function closeResult(options?: { restoreFocus?: boolean }): void {
  state.restoreFocusOnResultClose = closeResultUI(
    { resultOverlay, spinBtn },
    shouldRestoreFocusOnClose(options),
  );
}

function handleResultOverlayClose(): void {
  state.restoreFocusOnResultClose = handleResultOverlayCloseUI(
    { spinBtn },
    state.restoreFocusOnResultClose,
  );
}

function syncURL(): void {
  syncURLUI(srStatus);
}

function buildShareURL(): string | null {
  return buildShareURLUI();
}

function loadFromURL(): void {
  loadFromURLUI();
}

async function shareWheel(triggerBtn?: HTMLButtonElement | null): Promise<void> {
  await shareWheelUI({
    entriesCount: state.entries.length,
    shareOverflow: state.shareOverflow,
    triggerBtn,
    refs: { shareBtn, shareToast, srAlert, srStatus },
    buildShareURL,
  });
}

function bindEvents(): void {
  bindAppEvents({
    refs: {
      addBtn,
      entryInput,
      entryError,
      entriesList,
      clearAllBtn,
      spinBtn,
      resultOverlay,
      resultCloseBtn,
      resultSpinAgain,
      shareBtn,
      resultShareBtn,
      undoBtn,
      restoreBtn,
      dismissRestoreBtn,
      canvas,
      muteBtn,
    },
    handlers: {
      addEntry: entryRuntime.addEntry,
      renderEntries: () => entryRuntime.renderEntries(),
      requestDraw,
      hideEntryError: entryRuntime.hideEntryError,
      removeEntry: entryRuntime.removeEntry,
      clearEntries: entryRuntime.clearEntries,
      startSpin,
      closeResult,
      handleResultOverlayClose,
      markResultOverlayCancel: () => {
        state.restoreFocusOnResultClose = true;
      },
      shareWheel,
      performUndo,
      performRestore,
      dismissRestoreBanner,
      setupCanvas,
    },
  });
}

function showUndoToast(message: string, previousEntries: string[]): void {
  state.undoEntries = showUndoToastUI(
    { srStatus, undoToast, undoToastText },
    message,
    previousEntries,
  );
}

function hideUndoToast(): void {
  hideUndoToastUI({ undoToast }, () => {
    state.undoEntries = null;
  });
}

function performUndo(): void {
  performUndoUI({
    entries: state.undoEntries,
    onRestore: (restoredEntries) => {
      state.entries = restoredEntries;
      saveToStorage();
      syncURL();
      entryRuntime.renderEntries();
      requestDraw();
    },
    onHide: hideUndoToast,
    srStatus,
  });
}

function saveToStorage(): void {
  saveEntriesToStorage(state.entries);
}

function loadFromStorage(): string[] | null {
  return loadEntriesFromStorage();
}

function showRestoreBanner(): void {
  state.restoreTimer = showRestoreBannerUI({ restoreBanner, srStatus }, dismissRestoreBanner);
}

function dismissRestoreBanner(): void {
  dismissRestoreBannerUI({ restoreBanner }, state.restoreTimer, () => {
    state.savedEntries = null;
  });
}

function performRestore(): void {
  performRestoreUI({
    savedEntries: state.savedEntries,
    undoEntries: state.undoEntries,
    onHideUndo: hideUndoToast,
    onRestore: (restoredEntries) => {
      state.entries = restoredEntries;
      saveToStorage();
      syncURL();
      entryRuntime.renderEntries();
      requestDraw();
    },
    onDismiss: dismissRestoreBanner,
    srStatus,
  });
}

init();
updateMuteButton(muteBtn);
