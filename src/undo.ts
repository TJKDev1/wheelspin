import { announceStatus } from "./a11y";

interface UndoRefs {
  srStatus: HTMLElement;
  undoToast: HTMLElement;
  undoToastText: HTMLElement;
}

interface PerformUndoOptions {
  entries: string[] | null;
  onRestore: (entries: string[]) => void;
  onHide: () => void;
  srStatus: HTMLElement;
}

export function showUndoToast(
  refs: UndoRefs,
  message: string,
  previousEntries: string[],
): string[] {
  refs.undoToastText.textContent = message;
  refs.undoToast.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      refs.undoToast.classList.add("visible");
    }),
  );

  announceStatus(
    refs.srStatus,
    message + ". Press Undo to restore. Undo stays until your next edit.",
  );

  return previousEntries;
}

export function hideUndoToast(refs: Pick<UndoRefs, "undoToast">, onHidden: () => void): void {
  refs.undoToast.classList.remove("visible");
  setTimeout(() => {
    refs.undoToast.hidden = true;
    onHidden();
  }, 300);
}

export function performUndo(options: PerformUndoOptions): void {
  if (!options.entries) return;

  const restoredEntries = options.entries.slice();
  options.onRestore(restoredEntries);
  options.onHide();
  announceStatus(
    options.srStatus,
    "Entries restored. " + restoredEntries.length + " choices on wheel.",
  );
}
