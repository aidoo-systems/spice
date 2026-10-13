import { test, expect } from "@playwright/test";

test("home leads with the input and a finished sample plan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What’s in your kitchen?" })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden(); // nothing plays on arrival
  await expect(page.getByText("30 min · Any diet · Savoury & umami · Medium heat · hob, pan")).toBeVisible();

  await page.getByRole("button", { name: "See the whole plan" }).click();
  await expect(page.getByText("A plan we made earlier")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Crispy garlic egg fried rice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start cooking" })).toBeVisible();

  await page.getByRole("button", { name: "New plan" }).click();
  await expect(page.getByRole("heading", { name: "What’s in your kitchen?" })).toBeVisible();
});

test("preferences live behind one Change link", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Change" }).click();
  const sheet = page.getByRole("dialog", { name: "Preferences" });
  await sheet.getByRole("button", { name: "15 min" }).click();
  await sheet.getByRole("button", { name: "Vegan" }).click();
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(/15 min · Vegan/)).toBeVisible();
});

test("theme follows the device unless chosen in settings", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await context.close();
});

test("robots and sitemap endpoints respond", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("<urlset");
});
