import { announceStatus } from "./a11y";
import { buildSharePath, decodeEntriesFromParam, exceedsShareURLLimit } from "./lib/share";
import { state } from "./state";

let isSharedLanding = false;

const metaRefs = {
  description: document.querySelector<HTMLMetaElement>('meta[name="description"]'),
  canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]'),
  robots: document.querySelector<HTMLMetaElement>('meta[name="robots"]'),
  googlebot: document.querySelector<HTMLMetaElement>('meta[name="googlebot"]'),
  ogTitle: document.querySelector<HTMLMetaElement>('meta[property="og:title"]'),
  ogDescription: document.querySelector<HTMLMetaElement>('meta[property="og:description"]'),
  ogUrl: document.querySelector<HTMLMetaElement>('meta[property="og:url"]'),
  twitterTitle: document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]'),
  twitterDescription: document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]'),
  twitterImageAlt: document.querySelector<HTMLMetaElement>('meta[name="twitter:image:alt"]'),
  ogImageAlt: document.querySelector<HTMLMetaElement>('meta[property="og:image:alt"]'),
} as const;

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
  isSharedLanding = encodedEntries !== null;
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

  const canonicalUrl = "https://www.wheelspin.cc/";
  const shareUrl = buildShareURL() || canonicalUrl;
  const imageAlt = hasEntries
    ? `WheelSpin random picker for ${preview}${suffix}.`
    : "WheelSpin logo mark with four blue and orange wheel segments.";

  if (metaRefs.description) metaRefs.description.setAttribute("content", description);
  if (metaRefs.canonical) metaRefs.canonical.setAttribute("href", canonicalUrl);
  const robotsContent = isSharedLanding && hasEntries
    ? "noindex,follow,max-image-preview:large"
    : "index,follow,max-image-preview:large";
  if (metaRefs.robots) {
    metaRefs.robots.setAttribute("content", robotsContent);
  }
  if (metaRefs.googlebot) metaRefs.googlebot.setAttribute("content", robotsContent);
  if (metaRefs.ogTitle) metaRefs.ogTitle.setAttribute("content", title);
  if (metaRefs.ogDescription) metaRefs.ogDescription.setAttribute("content", description);
  if (metaRefs.ogUrl) metaRefs.ogUrl.setAttribute("content", hasEntries ? shareUrl : canonicalUrl);
  if (metaRefs.ogImageAlt) metaRefs.ogImageAlt.setAttribute("content", imageAlt);
  if (metaRefs.twitterTitle) metaRefs.twitterTitle.setAttribute("content", title);
  if (metaRefs.twitterDescription) {
    metaRefs.twitterDescription.setAttribute("content", description);
  }
  if (metaRefs.twitterImageAlt) metaRefs.twitterImageAlt.setAttribute("content", imageAlt);
}
