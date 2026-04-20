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
    return parsed.slice(0, MAX_ENTRIES);
  } catch {
    return null;
  }
}
