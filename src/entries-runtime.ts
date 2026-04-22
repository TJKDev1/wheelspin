import { announceAlert } from "./a11y";
import { state } from "./state";

interface EntryRuntimeRefs {
  canvas: HTMLCanvasElement;
  entryInput: HTMLInputElement;
  entryError: HTMLElement;
  entriesList: HTMLOListElement;
  entriesPanel: HTMLElement;
  clearAllBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  shareStatus: HTMLElement;
  resultShareBtn: HTMLButtonElement;
  spinBtn: HTMLButtonElement;
  spinStatus: HTMLElement;
  srAlert: HTMLElement;
  wheelChoicesList: HTMLElement;
}

interface EntryRuntimeOptions {
  refs: EntryRuntimeRefs;
  invalidateWheelCache: () => void;
  getSegmentColor: (index: number) => string;
  saveToStorage: () => void;
  syncURL: () => void;
  requestDraw: () => void;
  hideUndoToast: () => void;
  showUndoToast: (message: string, previousEntries: string[]) => void;
}

export interface EntryRuntime {
  addEntry: (label: string) => boolean;
  removeEntry: (index: number) => void;
  clearEntries: () => void;
  renderEntries: (focusIndex?: number) => void;
  showEntryError: (message: string) => void;
  hideEntryError: () => void;
}

function shakeInput(entryInput: HTMLInputElement): void {
  entryInput.classList.remove("shake");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      entryInput.classList.add("shake");
    });
  });
  entryInput.addEventListener(
    "animationend",
    () => {
      entryInput.classList.remove("shake");
    },
    { once: true },
  );
}

function updateWheelDescription(refs: EntryRuntimeRefs): void {
  const description =
    state.entries.length > 0
      ? "Wheel with " + state.entries.length + " choices"
      : "Empty wheel. Add choices to spin.";
  refs.canvas.setAttribute("aria-label", description);

  const fragment = document.createDocumentFragment();
  state.entries.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    fragment.appendChild(item);
  });

  refs.wheelChoicesList.replaceChildren(fragment);
}

function updateShareState(refs: EntryRuntimeRefs): void {
  const hasEntries = state.entries.length > 0;
  const canShare = state.entries.length >= 2 && !state.shareOverflow;
  const shareTitle = state.shareOverflow
    ? "Too many choices to share in one link"
    : canShare
      ? "Share wheel"
      : "Add at least 2 choices to share";
  const shareStatus = state.shareOverflow
    ? "Share off. Link too long for this wheel."
    : state.entries.length < 2
      ? "Share unlocks at 2 choices."
      : "";

  refs.entriesPanel.classList.toggle("has-entries", hasEntries);
  refs.entriesPanel.classList.toggle("can-share", canShare);

  refs.clearAllBtn.hidden = !hasEntries;
  refs.shareBtn.disabled = !canShare;
  refs.shareBtn.title = shareTitle;
  refs.resultShareBtn.disabled = !canShare;
  refs.resultShareBtn.title = shareTitle;

  refs.spinBtn.disabled = state.entries.length < 2;
  refs.shareStatus.hidden = shareStatus === "" || !hasEntries;
  refs.shareStatus.textContent = shareStatus;
  if (refs.shareStatus.hidden) {
    refs.shareBtn.removeAttribute("aria-describedby");
  } else {
    refs.shareBtn.setAttribute("aria-describedby", "share-status");
  }

  if (state.entries.length < 2) {
    refs.spinStatus.hidden = false;
    refs.spinStatus.textContent = "Add 2 choices to spin.";
  } else if (state.shareOverflow) {
    refs.spinStatus.hidden = false;
    refs.spinStatus.textContent = "Wheel ready. Share off for this set.";
  } else {
    refs.spinStatus.hidden = false;
    refs.spinStatus.textContent = "Drag to place wheel. Flick or press Spin to launch.";
  }
}

function createLimitIndicator(entriesPanel: HTMLElement): HTMLElement {
  const indicator = document.createElement("p");
  indicator.className = "entries-limit";
  indicator.setAttribute("aria-live", "polite");
  entriesPanel.appendChild(indicator);
  return indicator;
}

export function createEntryRuntime(options: EntryRuntimeOptions): EntryRuntime {
  const { refs } = options;
  const limitIndicator =
    refs.entriesPanel.querySelector<HTMLElement>(".entries-limit") ??
    createLimitIndicator(refs.entriesPanel);

  function updateLimitIndicator(): void {
    limitIndicator.textContent = `${state.entries.length} / 30`;
    limitIndicator.classList.toggle("visible", state.entries.length >= 20);
  }

  function showEntryError(message: string): void {
    clearTimeout(state.errorTimer ?? undefined);
    refs.entryError.textContent = message;
    refs.entryError.hidden = false;
    refs.entryInput.setAttribute("aria-invalid", "true");
    announceAlert(refs.srAlert, message);
  }

  function hideEntryError(): void {
    clearTimeout(state.errorTimer ?? undefined);
    refs.entryError.hidden = true;
    refs.entryError.textContent = "";
    refs.entryInput.removeAttribute("aria-invalid");
  }

  function renderEntries(focusIndex?: number): void {
    options.invalidateWheelCache();

    const fragment = document.createDocumentFragment();
    state.entries.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "entry-item";
      item.style.setProperty("--i", String(index));

      const segColor = options.getSegmentColor(index);
      item.style.setProperty("--entry-color", segColor);

      const dot = document.createElement("span");
      dot.className = "entry-color-dot";
      dot.style.background = segColor;

      const label = document.createElement("span");
      label.className = "entry-label";
      label.textContent = entry;
      label.title = entry;

      const removeBtn = document.createElement("button");
      removeBtn.className = "entry-remove";
      removeBtn.setAttribute("aria-label", "Remove " + entry);
      removeBtn.dataset.index = String(index);
      removeBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

      item.append(dot, label, removeBtn);
      fragment.appendChild(item);
    });

    refs.entriesList.replaceChildren(fragment);

    if (focusIndex !== undefined) {
      const nextItem = refs.entriesList.children[Math.min(focusIndex, state.entries.length - 1)];
      if (nextItem) {
        const btn = nextItem.querySelector<HTMLButtonElement>(".entry-remove");
        if (btn) btn.focus();
      } else {
        refs.entryInput.focus();
      }
    }

    updateShareState(refs);
    updateLimitIndicator();
    updateWheelDescription(refs);
  }

  function addEntry(label: string): boolean {
    const trimmed = label.trim();
    if (!trimmed) {
      shakeInput(refs.entryInput);
      showEntryError("Enter a choice before adding it.");
      return false;
    }
    if (state.entries.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
      shakeInput(refs.entryInput);
      showEntryError("That choice is already on the wheel.");
      return false;
    }
    if (state.entries.length >= 30) {
      shakeInput(refs.entryInput);
      showEntryError("You have reached the 30-choice limit.");
      limitIndicator.classList.add("visible");
      return false;
    }

    if (state.undoEntries) options.hideUndoToast();

    state.entries.push(trimmed);
    hideEntryError();
    options.saveToStorage();
    options.syncURL();
    return true;
  }

  function removeEntry(index: number): void {
    if (state.undoEntries) options.hideUndoToast();

    state.entries.splice(index, 1);
    options.saveToStorage();
    options.syncURL();
    renderEntries(index);
    options.requestDraw();
  }

  function clearEntries(): void {
    if (state.entries.length === 0) return;

    const shouldClear = window.confirm(
      `Clear all ${state.entries.length} choice${state.entries.length === 1 ? "" : "s"}? You can still undo this.`,
    );
    if (!shouldClear) return;

    const previousEntries = state.entries.slice();
    state.entries = [];
    options.saveToStorage();
    options.syncURL();
    renderEntries();
    options.requestDraw();
    options.showUndoToast("All entries cleared", previousEntries);
  }

  return {
    addEntry,
    removeEntry,
    clearEntries,
    renderEntries,
    showEntryError,
    hideEntryError,
  };
}
