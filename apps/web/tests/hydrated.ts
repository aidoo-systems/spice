import type { Page } from "@playwright/test";

/**
 * Open a page and wait until React has hydrated it. The server-rendered buttons
 * are visible before then, but a click on one is lost, and under `next dev` the
 * first load can take long enough for a test to click too early.
 */
export async function openHydrated(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForFunction(() => {
    const el = document.querySelector("main button");
    return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber"));
  });
}
