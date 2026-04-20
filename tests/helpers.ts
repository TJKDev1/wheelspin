import type { Page } from "@playwright/test";

type TestWindow = Window & typeof globalThis & { __clipboardWrites: string[] };

export async function installBrowserMocks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const testWindow = window as TestWindow;
    testWindow.__clipboardWrites = [];

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(value: string) {
          testWindow.__clipboardWrites.push(value);
          return Promise.resolve();
        },
      },
    });

    window.confirm = () => true;
  });
}

export async function addEntries(page: Page, labels: string[]): Promise<void> {
  const input = page.getByLabel("Add a choice");
  for (const label of labels) {
    await input.fill(label);
    await page.getByRole("button", { name: "Add entry" }).click();
  }
}

export async function focusSpinShortcutTarget(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getElementById("main-content")?.focus();
  });
}

export function makeLongEntries(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const suffix = String(index + 1).padStart(2, "0");
    return `${"漢".repeat(24)}-${suffix}`;
  });
}
