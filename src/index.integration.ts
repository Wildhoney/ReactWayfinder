import { test, expect } from "@playwright/test";

type Page = import("@playwright/test").Page;

const heading = (page: Page) => page.locator("h1").filter({ visible: true });
const link = (page: Page, name: string) =>
  page.locator(`a:has-text("${name}")`).filter({ visible: true }).first();
const button = (page: Page, name: string) =>
  page.locator(`button:has-text("${name}")`).filter({ visible: true }).first();

test.describe("deferred mode", () => {
  test("renders home page at /", async ({ page }) => {
    await page.goto("/");
    await expect(heading(page)).toHaveText("Home");
  });

  test("navigates to about page", async ({ page }) => {
    await page.goto("/");
    await link(page, "About").click();
    await expect(heading(page)).toHaveText("About");
    await expect(page).toHaveURL("/about");
  });

  test("navigates to user page with loader", async ({ page }) => {
    await page.goto("/");
    await link(page, "User 1").click();
    await expect(heading(page)).toHaveText("User 1", { timeout: 10_000 });
    await expect(page).toHaveURL("/users/1");
  });

  test("keeps previous page while loader runs", async ({ page }) => {
    await page.goto("/about");
    await expect(heading(page)).toHaveText("About");

    await link(page, "User 1").click();

    // Should still show About page while loading
    await expect(heading(page)).toHaveText("About");

    // Eventually shows User 1
    await expect(heading(page)).toHaveText("User 1", { timeout: 10_000 });
  });

  test("cancels navigation on Escape", async ({ page }) => {
    await page.goto("/about");
    await expect(heading(page)).toHaveText("About");

    await link(page, "User 1").click();
    await page.keyboard.press("Escape");

    // Should stay on About
    await expect(heading(page)).toHaveText("About");
    await expect(page).toHaveURL("/about");
  });

  test("supersedes navigation when clicking another link", async ({ page }) => {
    await page.goto("/about");
    await expect(heading(page)).toHaveText("About");

    await link(page, "User 1").click();
    await link(page, "User 2").click();

    // Should end up on User 2, not User 1
    await expect(heading(page)).toHaveText("User 2", { timeout: 10_000 });
    await expect(page).toHaveURL("/users/2");
  });

  test("uses cached data on revisit", async ({ page }) => {
    await page.goto("/");
    await link(page, "User 1").click();
    await expect(heading(page)).toHaveText("User 1", { timeout: 10_000 });

    await link(page, "About").click();
    await expect(heading(page)).toHaveText("About");

    // Navigate back to User 1 — should be instant (cached)
    const start = Date.now();
    await link(page, "User 1").click();
    await expect(heading(page)).toHaveText("User 1");
    expect(Date.now() - start).toBeLessThan(1_000);
  });

  test("renders 404 for unknown routes", async ({ page }) => {
    await page.goto("/unknown");
    await expect(heading(page)).toHaveText("404");
  });

  test("button navigation works (about team cards)", async ({ page }) => {
    await page.goto("/about");
    await expect(heading(page)).toHaveText("About");

    await button(page, "User 2").click();
    await expect(heading(page)).toHaveText("User 2", { timeout: 10_000 });
    await expect(page).toHaveURL("/users/2");
  });

  test("back button works", async ({ page }) => {
    await page.goto("/");
    await link(page, "About").click();
    await expect(page).toHaveURL("/about");

    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(heading(page)).toHaveText("Home");
  });
});

test.describe("pending spinners", () => {
  const spinner = (page: Page, name: string) =>
    page
      .locator(`a`)
      .filter({ hasText: name })
      .filter({ visible: true })
      .first()
      .locator("span");

  test("only the clicked user shows a spinner", async ({ page }) => {
    await page.goto("/about");
    await expect(heading(page)).toHaveText("About");

    await link(page, "User 2").click();

    // User 2 should have a spinner
    await expect(spinner(page, "User 2")).toBeVisible();

    // User 1 and User 3 should NOT have spinners
    await expect(spinner(page, "User 1")).toHaveCount(0);
    await expect(spinner(page, "User 3")).toHaveCount(0);
  });

  test("superseding navigation moves spinner to new target", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(heading(page)).toHaveText("About");

    await link(page, "User 1").click();
    await expect(spinner(page, "User 1")).toBeVisible();

    // Click User 2 while User 1 is loading
    await link(page, "User 2").click();

    // User 2 should have a spinner, User 1 should not
    await expect(spinner(page, "User 2")).toBeVisible();
    await expect(spinner(page, "User 1")).toHaveCount(0);
  });
});

test.describe("immediate mode", () => {
  async function switchToImmediate(page: Page) {
    await page.selectOption("select", "immediate");
  }

  test("shows skeleton immediately when navigating", async ({ page }) => {
    await page.goto("/about");
    await switchToImmediate(page);

    await link(page, "User 1").click();

    // In immediate mode, should switch to the user route immediately
    await expect(page).toHaveURL("/users/1");

    // Eventually shows real content
    await expect(heading(page)).toHaveText("User 1", { timeout: 10_000 });
  });

  test("Escape restores previous page in immediate mode", async ({ page }) => {
    await page.goto("/about");
    await switchToImmediate(page);

    await link(page, "User 1").click();
    await page.keyboard.press("Escape");

    // Should restore About page
    await expect(heading(page)).toHaveText("About");
    await expect(page).toHaveURL("/about");
  });
});
