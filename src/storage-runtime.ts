import { parseStoredEntries, serializeEntries, STORAGE_KEY } from "./lib/storage";

export function saveEntriesToStorage(entries: string[]): void {
  try {
    const serialized = serializeEntries(entries);
    if (serialized === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
    // Silently fail — app still works without persistence
  }
}

export function loadEntriesFromStorage(): string[] | null {
  try {
    return parseStoredEntries(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
