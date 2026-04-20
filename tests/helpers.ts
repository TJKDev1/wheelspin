import type { Page } from "@playwright/test";

type TestWindow = Window &
  typeof globalThis & {
    __clipboardWrites: string[];
    __clipboardMode?: "success" | "reject" | "missing";
    __storageMode?: "normal" | "throw";
  };

export async function installBrowserMocks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const testWindow = window as TestWindow;
    testWindow.__clipboardWrites = [];
    testWindow.__clipboardMode = "success";
    testWindow.__storageMode = "normal";

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      get() {
        if (testWindow.__clipboardMode === "missing") {
          return undefined;
        }

        return {
          writeText(value: string) {
            testWindow.__clipboardWrites.push(value);
            if (testWindow.__clipboardMode === "reject") {
              return Promise.reject(new Error("Clipboard rejected"));
            }
            return Promise.resolve();
          },
        };
      },
    });

    const storageProto = Object.getPrototypeOf(window.localStorage) as Storage;
    const originalGetItem = storageProto.getItem;
    Object.defineProperty(storageProto, "getItem", {
      configurable: true,
      value(this: Storage, key: string) {
        if (testWindow.__storageMode === "throw") {
          throw new Error("Storage blocked");
        }
        return originalGetItem.call(this, key);
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
