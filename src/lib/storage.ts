import { MAX_ENTRIES } from "./share";

export const STORAGE_KEY = "wheelspin_entries";

export function serializeEntries(entries: string[]): string | null {
  if (entries.length === 0) return null;
  return JSON.stringify(entries);
}

export function parseStoredEntries(raw: string | null): string[] | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const entries = parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, MAX_ENTRIES);

    return entries.length > 0 ? entries : null;
  } catch {
    return null;
  }
}
