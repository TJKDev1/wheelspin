import { announceAlert, announceStatus } from "./a11y";

interface ShareRefs {
  shareBtn: HTMLButtonElement;
  shareToast: HTMLElement;
  srAlert: HTMLElement;
  srStatus: HTMLElement;
}

interface ShareWheelOptions {
  entriesCount: number;
  shareOverflow: boolean;
  triggerBtn?: HTMLButtonElement | null;
  refs: ShareRefs;
  buildShareURL: () => string | null;
}

function showCopiedState(btn: HTMLButtonElement): void {
  if (btn.classList.contains("copied")) return;

  btn.classList.add("copied");
  const label = btn.querySelector<HTMLElement>(".share-label");
  const originalLabel = label ? label.textContent : "";
  if (label) label.textContent = "Copied!";

  setTimeout(() => {
    btn.classList.remove("copied");
    if (label) label.textContent = originalLabel;
  }, 2000);
}

function showFallbackInput(shareBtn: HTMLButtonElement, url: string): void {
  const existing = document.querySelector(".share-fallback");
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.className = "share-fallback";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "share-fallback-input";
  input.setAttribute("aria-label", "Share link");
  input.value = url;
  input.readOnly = true;
  wrapper.appendChild(input);

  shareBtn.insertAdjacentElement("afterend", wrapper);
  input.focus();
  input.select();

  const dismiss = () => {
    wrapper.remove();
  };
  input.addEventListener("blur", () => setTimeout(dismiss, 200));
  setTimeout(dismiss, 8000);
}

function showToast(shareToast: HTMLElement, srStatus: HTMLElement): void {
  shareToast.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      shareToast.classList.add("visible");
    }),
  );

  announceStatus(srStatus, "Link copied to clipboard");

  setTimeout(() => {
    shareToast.classList.remove("visible");
    setTimeout(() => {
      shareToast.hidden = true;
    }, 300);
  }, 2200);
}

export async function shareWheel(options: ShareWheelOptions): Promise<void> {
  if (options.entriesCount < 2) return;
  if (options.shareOverflow) {
    announceAlert(
      options.refs.srAlert,
      "Too many choices to share in one link. Remove a few choices and try again.",
    );
    return;
  }

  const btn = options.triggerBtn || options.refs.shareBtn;
  const url = options.buildShareURL();
  if (!url) return;

  const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isMobile && navigator.share) {
    try {
      await navigator.share({ title: "WheelSpin", url });
      return;
    } catch (err) {
      // User cancelled or error — fall through to clipboard.
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Clipboard API can hang on non-HTTPS or intermittent connections.
      const writePromise = navigator.clipboard.writeText(url);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clipboard timeout")), 3000),
      );
      await Promise.race([writePromise, timeout]);
      showCopiedState(btn);
      showToast(options.refs.shareToast, options.refs.srStatus);
    } else {
      showFallbackInput(options.refs.shareBtn, url);
    }
  } catch {
    showFallbackInput(options.refs.shareBtn, url);
  }
}
