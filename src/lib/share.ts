export const MAX_ENTRIES = 30;
export const MAX_SHARE_URL_LENGTH = 2000;

export function encodeEntriesForURL(entries: string[]): string {
  return entries.map((entry) => encodeURIComponent(entry)).join("|");
}

export function decodeEntriesFromParam(value: string): string[] {
  let entries: string[] = [];

  if (value.includes("|") || !value.includes("=")) {
    const decoded = value
      .split("|")
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })
      .filter(Boolean);

    if (decoded.length > 0) {
      entries = decoded.slice(0, MAX_ENTRIES);
    }
  }

  if (entries.length === 0) {
    try {
      const decoded = decodeURIComponent(escape(atob(value)));
      entries = decoded.split("\n").filter(Boolean).slice(0, MAX_ENTRIES);
    } catch {
      entries = value.split("|").filter(Boolean).slice(0, MAX_ENTRIES);
    }
  }

  return entries;
}

export function buildSharePath(entries: string[]): string {
  return "?w=" + encodeEntriesForURL(entries);
}

export function exceedsShareURLLimit(pathname: string, entries: string[]): boolean {
  return (pathname + buildSharePath(entries)).length > MAX_SHARE_URL_LENGTH;
}
