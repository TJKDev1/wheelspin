import { announceAlert } from "./a11y";

interface ResultOverlayRefs {
  resultOverlay: HTMLDialogElement;
  resultCloseBtn: HTMLButtonElement;
  resultText: HTMLElement;
  spinBtn: HTMLButtonElement;
  srAlert: HTMLElement;
}

interface CloseResultOptions {
  restoreFocus?: boolean;
}

export function showResult(
  refs: ResultOverlayRefs,
  winner: string,
): boolean {
  refs.resultText.textContent = winner;
  refs.resultOverlay.showModal();
  refs.resultCloseBtn.focus();
  announceAlert(refs.srAlert, "The wheel chose: " + winner);
  return true;
}

export function closeResult(
  refs: Pick<ResultOverlayRefs, "resultOverlay" | "spinBtn">,
  shouldRestoreFocus: boolean,
): boolean {
  if (refs.resultOverlay.open) {
    refs.resultOverlay.close();
    return shouldRestoreFocus;
  }

  if (shouldRestoreFocus) {
    refs.spinBtn.focus();
    return true;
  }

  return false;
}

export function handleResultOverlayClose(
  refs: Pick<ResultOverlayRefs, "spinBtn">,
  shouldRestoreFocus: boolean,
): boolean {
  if (shouldRestoreFocus) {
    refs.spinBtn.focus();
  }
  return true;
}

export function shouldRestoreFocusOnClose(
  options?: CloseResultOptions,
): boolean {
  return !options || options.restoreFocus !== false;
}
