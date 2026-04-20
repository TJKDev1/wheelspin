import { expect, test } from "@playwright/test";

import {
  addEntries,
  focusSpinShortcutTarget,
  installBrowserMocks,
  makeLongEntries,
} from "./helpers";

type TestWindow = Window & typeof globalThis & { __clipboardWrites: string[] };

test.beforeEach(async ({ page }) => {
  await installBrowserMocks(page);
});

test("adds entries and spins with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await addEntries(page, ["Pizza", "Tacos"]);

  await expect(page.getByRole("button", { name: "Spin" })).toBeEnabled();
  await page.getByRole("button", { name: "Spin" }).click();

  await expect(page.locator("#result-overlay")).toHaveAttribute("open", "");
  await expect(page.locator("#result-text")).toHaveText(/Pizza|Tacos/);
});

test("space spins from page but not from input", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await addEntries(page, ["Heads", "Tails"]);

  await focusSpinShortcutTarget(page);
  await page.keyboard.press("Space");
  await expect(page.locator("#result-overlay")).toHaveAttribute("open", "");

  await page.locator("#result-close-btn").click();
  await expect(page.locator("#result-overlay")).not.toHaveAttribute("open", "");

  const input = page.getByLabel("Add a choice");
  await input.fill("Heads");
  await input.press("Space");
  await expect.poll(() => input.inputValue()).toMatch(/ /);
  await expect(page.locator("#result-overlay")).not.toHaveAttribute("open", "");

  await focusSpinShortcutTarget(page);
  await page.keyboard.press("Space");
  await expect(page.locator("#result-overlay")).toHaveAttribute("open", "");
});

test("clears entries and undoes", async ({ page }) => {
  await page.goto("/");

  await addEntries(page, ["Alpha", "Beta", "Gamma"]);
  await page.getByRole("button", { name: "Remove all entries" }).click();

  await expect(page.locator("#entries-list .entry-item")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo clear all" }).click();
  await expect(page.locator("#entries-list .entry-item")).toHaveCount(3);
});

test("restores saved wheel and shares copied link", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    localStorage.setItem("wheelspin_entries", JSON.stringify(["Red", "Blue"]));
  });
  await page.reload();

  await expect(page.locator("#restore-banner")).toBeVisible();
  await page.locator("#restore-btn").click();
  await expect(page.locator("#entries-list .entry-item")).toHaveCount(2);

  await page.getByRole("button", { name: "Share wheel" }).click();

  await expect(page.locator("#share-toast")).toBeVisible();
  const copied = await page.evaluate(() => {
    const testWindow = window as TestWindow;
    return testWindow.__clipboardWrites[0] ?? "";
  });
  expect(copied).toContain("?w=Red|Blue");
});

test("share disables when encoded URL would be too long", async ({ page }) => {
  await page.goto("/");

  await page.evaluate((entries: string[]) => {
    localStorage.setItem("wheelspin_entries", JSON.stringify(entries));
  }, makeLongEntries(30));
  await page.reload();
  await page.locator("#restore-btn").click();
  await expect(page.locator("#entries-list .entry-item")).toHaveCount(30);

  await expect(page.getByRole("button", { name: "Spin" })).toBeEnabled();
  await expect(page.locator("#share-btn")).toBeHidden();
  await expect(page.locator("#spin-status")).toHaveText(
    "Spin is ready. Share is off until you remove a few choices.",
  );
  await expect(page).toHaveURL(/\/$/);
});
