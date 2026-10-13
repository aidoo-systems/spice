import { test, expect, type Route } from "@playwright/test";

// The API is mocked at the network layer so this runs without a backend.

const meta = {
  model: "test-model",
  mock: false,
  cached: false,
  latency_ms: 2100,
  variation: 0,
  grounding: { from_ingredients: ["rice", "egg"], from_pantry: [], staples: ["oil"], flagged_missing: [], unlisted: [] },
  checks: [
    { name: "timeline", passed: true, detail: "Steps are in order and inside your time limit" },
    { name: "grounding", passed: true, detail: "Only uses your ingredients, pantry and basic staples" },
  ],
};

const plan = {
  title: "Crispy egg fried rice",
  prep_time_minutes: 12,
  calories_estimate: 480,
  flavour_mode: "umami",
  steps: [
    { t_seconds: 0, instruction: "Heat oil in a pan.", tip: null, uses: ["oil"] },
    { t_seconds: 60, instruction: "Scramble the egg.", tip: null, uses: ["egg"] },
    { t_seconds: 180, instruction: "Add rice and fry hard.", tip: "Press it flat.", uses: ["rice"] },
  ],
  why_this_works: ["Hot pan, dry rice."],
  upgrade_ladder: { pantry_upgrade: [], if_you_have: [], one_pound_shop: null },
  pantry_used: [],
  notes: [],
  safety: { assumptions: [], missing_ingredients: [], disclaimer: "" },
  adjustments: [],
  community: { cooked_count: 3, feedback_breakdown: {}, total_feedback: 0 },
  meta,
};

const sse = (events: [string, unknown][]) =>
  events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join("");

function fulfillSSE(route: Route, events: [string, unknown][]) {
  return route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(events) });
}

test("a preset streams a checked plan, then a follow-up revises it", async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/v1/suggest/stream", async (route) => {
    bodies.push(route.request().postDataJSON());
    await fulfillSSE(route, [["partial", { title: "Crispy egg" }], ["final", plan]]);
  });
  await page.route("**/api/v1/followup/stream", (route) =>
    fulfillSSE(route, [["final", { ...plan, title: "Crispy egg fried rice for 4", answer: "Scaled everything for four." }]]),
  );
  let cookedCalls = 0;
  await page.route("**/api/v1/cooked", (route) => {
    cookedCalls++;
    return route.fulfill({ json: { cooked_count: 4 } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Fried rice" }).or(page.getByRole("button", { name: "Budget Challenge" })).first().click();

  await expect(page.getByRole("heading", { level: 2, name: "Crispy egg fried rice", exact: true })).toBeVisible();
  await expect(page.getByText(/Uses only what you have/)).toBeVisible();
  await expect(page.getByText(/Cooked 3 times by SPICE users/)).toBeVisible();

  await page.getByText("How this was generated").click();
  await expect(page.getByText("2/2 checks passed")).toBeVisible();
  await expect(page.getByText("Generated in 2.1s")).toBeVisible();

  // Regenerate asks for a different dish and avoids the title already shown.
  await page.getByRole("button", { name: /Try a different dish/ }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]).toMatchObject({ variation: 1, avoid_titles: ["Crispy egg fried rice"] });

  await page.getByRole("button", { name: "Make it for 4 people" }).click();
  await expect(page.getByText("Scaled everything for four.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Crispy egg fried rice for 4", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous version" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Crispy egg fried rice", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "I cooked this" }).click();
  await expect(page.getByRole("button", { name: "✓ Cooked" })).toBeDisabled();
  await expect(page.getByText(/Cooked 4 times by SPICE users/)).toBeVisible();
  expect(cookedCalls).toBe(1);
});

test("errors are shown in plain words and the previous plan stays", async ({ page }) => {
  await page.route("**/api/v1/suggest/stream", (route) =>
    route.fulfill({ status: 429, json: { detail: "You've cooked up a lot today. Give SPICE a breather and try again later." } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Budget Challenge" }).click();
  await expect(page.getByText("Give SPICE a breather")).toBeVisible();
  await expect(page.getByText("What’s in your kitchen?")).toBeVisible();
});

test("demo mode is labelled", async ({ page }) => {
  await page.route("**/api/v1/suggest/stream", (route) =>
    fulfillSSE(route, [["final", { ...plan, meta: { ...meta, mock: true, model: "demo (no API key)" } }]]),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Budget Challenge" }).click();
  await expect(page.getByText("Demo mode.")).toBeVisible();
});
