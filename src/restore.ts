import { announceStatus } from "./a11y";

interface RestoreRefs {
  restoreBanner: HTMLElement;
  srStatus: HTMLElement;
}

interface PerformRestoreOptions {
  savedEntries: string[] | null;
  undoEntries: string[] | null;
  onHideUndo: () => void;
  onRestore: (entries: string[]) => void;
  onDismiss: () => void;
  srStatus: HTMLElement;
}

export function showRestoreBanner(
  refs: RestoreRefs,
  onDismiss: () => void,
): ReturnType<typeof setTimeout> {
  refs.restoreBanner.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      refs.restoreBanner.classList.add("visible");
    }),
  );

  announceStatus(refs.srStatus, "Saved wheel found. Restore your last wheel?");
  return setTimeout(onDismiss, 10000);
}

export function dismissRestoreBanner(
  refs: Pick<RestoreRefs, "restoreBanner">,
  restoreTimer: ReturnType<typeof setTimeout> | null,
  onDismissed: () => void,
): void {
  clearTimeout(restoreTimer ?? undefined);
  refs.restoreBanner.classList.remove("visible");
  setTimeout(() => {
    refs.restoreBanner.hidden = true;
    onDismissed();
  }, 300);
}

export function performRestore(options: PerformRestoreOptions): void {
  if (!options.savedEntries) return;
  if (options.undoEntries) options.onHideUndo();

  const restoredEntries = options.savedEntries.slice();
  options.onRestore(restoredEntries);
  options.onDismiss();
  announceStatus(
    options.srStatus,
    "Wheel restored with " + restoredEntries.length + " choices.",
  );
}
