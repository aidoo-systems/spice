import { test, expect } from "@playwright/test";

test("intro plays once and the tour is opt-in", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("test-booted")) {
      sessionStorage.setItem("test-booted", "1");
      localStorage.removeItem("spice-intro-seen");
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("intro-overlay")).toBeVisible();
  await page.getByTestId("intro-overlay").click();
  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  // No tour forced on first-time visitors.
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: /Take the 30-second tour/ }).click();
  await expect(page.getByText("Step 1 of")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("intro-overlay")).toBeHidden();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("starting tutorial from settings closes the panel", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("spice-intro-seen", "true");
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Start tutorial" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("robots and sitemap endpoints respond", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("<urlset");
});
