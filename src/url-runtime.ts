import { announceStatus } from "./a11y";
import { buildSharePath, decodeEntriesFromParam, exceedsShareURLLimit } from "./lib/share";
import { state } from "./state";

export function syncURL(srStatus: HTMLElement): void {
  const previousShareOverflow = state.shareOverflow;

  if (state.entries.length === 0) {
    state.shareOverflow = false;
    try {
      history.replaceState(null, "", window.location.pathname);
    } catch {
      // replaceState can fail in sandboxed iframes or file:// protocol
    }
    updatePageMeta();
    return;
  }

  if (exceedsShareURLLimit(window.location.pathname, state.entries)) {
    state.shareOverflow = true;
    try {
      history.replaceState(null, "", window.location.pathname);
    } catch {
      // replaceState can fail in sandboxed iframes or file:// protocol
    }
  } else {
    state.shareOverflow = false;
    try {
      history.replaceState(null, "", buildSharePath(state.entries));
    } catch {
      // replaceState can fail in sandboxed iframes or file:// protocol
    }
  }

  if (state.shareOverflow && !previousShareOverflow) {
    announceStatus(srStatus, "Share disabled. Too many choices for one link.");
  }

  updatePageMeta();
}

export function buildShareURL(): string | null {
  if (state.shareOverflow || state.entries.length < 2) return null;
  const shareURL = new URL(window.location.href);
  shareURL.search = buildSharePath(state.entries);
  return shareURL.toString();
}

export function loadFromURL(): void {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return;
  }

  const encodedEntries = params.get("w");
  if (!encodedEntries) return;

  state.entries = decodeEntriesFromParam(encodedEntries);
  if (state.entries.length < 2) {
    state.entries = [];
    return;
  }

  if (state.entries.length > 0) {
    updatePageMeta();
  }
}

export function updatePageMeta(): void {
  const defaultTitle = "Spin the Wheel Online | WheelSpin Random Picker";
  const defaultDescription =
    "Spin the wheel online with a fast, shareable random picker. Create a custom decision wheel for teams, games, giveaways, lunches, chores, and more.";
  const hasEntries = state.entries.length > 0;
  const preview = hasEntries ? state.entries.slice(0, 3).join(", ") : "";
  const suffix = hasEntries
    ? state.entries.length > 3
      ? `, and ${state.entries.length - 3} more`
      : ""
    : "";
  const title = hasEntries
    ? `Spin the Wheel: ${preview}${suffix} | WheelSpin`
    : defaultTitle;
  const description = hasEntries
    ? `Spin the wheel between ${preview}${suffix}. Create your own random picker and share it with one link.`
    : defaultDescription;

  document.title = title;

  const descriptionMeta = document.querySelector('meta[name="description"]');
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const robotsMeta = document.querySelector('meta[name="robots"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  const twitterImageAlt = document.querySelector('meta[name="twitter:image:alt"]');
  const ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
  const canonicalUrl = "https://www.wheelspin.cc/";
  const shareUrl = buildShareURL() || canonicalUrl;
  const imageAlt = hasEntries
    ? `WheelSpin random picker for ${preview}${suffix}.`
    : "WheelSpin logo mark with four blue and orange wheel segments.";

  if (descriptionMeta) descriptionMeta.setAttribute("content", description);
  if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);
  if (robotsMeta) {
    robotsMeta.setAttribute(
      "content",
      hasEntries
        ? "noindex,follow,max-image-preview:large"
        : "index,follow,max-image-preview:large",
    );
  }
  if (ogTitle) ogTitle.setAttribute("content", title);
  if (ogDesc) ogDesc.setAttribute("content", description);
  if (ogUrl) ogUrl.setAttribute("content", hasEntries ? shareUrl : canonicalUrl);
  if (ogImageAlt) ogImageAlt.setAttribute("content", imageAlt);
  if (twitterTitle) twitterTitle.setAttribute("content", title);
  if (twitterDesc) twitterDesc.setAttribute("content", description);
  if (twitterImageAlt) twitterImageAlt.setAttribute("content", imageAlt);
}
