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

  test("navigates to user page with data", async ({ page }) => {
    await page.goto("/");
    await link(page, "User 1").click();
    await expect(heading(page)).toHaveText("User 1", { timeout: 10_000 });
    await expect(page).toHaveURL("/users/1");
  });

  test("keeps previous page while data loads", async ({ page }) => {
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

  test("only the nav spinner shows when clicking a nav link, not the about card", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(heading(page)).toHaveText("About");

    // Click User 1 in the nav bar (an <a> tag)
    await link(page, "User 1").click();

    // Nav spinner should show
    await expect(spinner(page, "User 1")).toBeVisible();

    // About page card should have exactly 1 span (the name), not 2 (name + spinner)
    const cardSpans = page
      .locator("button")
      .filter({ hasText: "User 1" })
      .locator("span");
    await expect(cardSpans).toHaveCount(1);
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

/**
 * Scroll restoration on the infinite-scroll /feed page.
 *
 * Two contracts to verify, in both router modes:
 *
 *  1. /feed → scroll to item 30 → click it → /feed/:id → browser BACK button
 *     should restore /feed with item 30 still visible (scroll preserved by
 *     the back-traversal path).
 *  2. /feed → scroll to item 30 → click it → /feed/:id → click "Feed" link in
 *     the nav (forward navigation, not back) should scroll to top so item 1
 *     is visible.
 */
test.describe("feed scroll restoration", () => {
  /**
   * Scrolls the feed list until "Post #30" is rendered (triggering the
   * IntersectionObserver to load the second page of items), then brings
   * it into view so the user-visible position is at item 30.
   */
  async function scrollFeedToItem30(page: Page) {
    // First page renders 20 items; need to scroll near the bottom so the
    // IntersectionObserver loads page 2 (which contains item 30).
    while ((await page.locator('a:has-text("Post #30")').count()) === 0) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(150);
    }
    await page
      .locator('a:has-text("Post #30")')
      .first()
      .scrollIntoViewIfNeeded();
  }

  for (const mode of ["deferred", "immediate"] as const) {
    test.describe(`${mode} mode`, () => {
      test("back button restores scroll position to item 30", async ({
        page,
      }) => {
        await page.goto("/feed");
        if (mode === "immediate") {
          await page.selectOption("select", "immediate");
        }

        await scrollFeedToItem30(page);
        await expect(
          page.locator('a:has-text("Post #30")').first(),
        ).toBeInViewport();

        await page.locator('a:has-text("Post #30")').first().click();
        await expect(page).toHaveURL(/\/feed\/30$/);
        await expect(heading(page)).toHaveText("Post #30", { timeout: 10_000 });

        await page.goBack();
        await expect(page).toHaveURL("/feed");

        // The Activity preserves the loaded items + scroll position, so
        // item 30 should still be in the viewport after a back-traversal.
        await expect(
          page.locator('a:has-text("Post #30")').first(),
        ).toBeInViewport({ timeout: 5_000 });
      });

      test("clicking 'Feed' in the nav resets scroll to item 1", async ({
        page,
      }) => {
        await page.goto("/feed");
        if (mode === "immediate") {
          await page.selectOption("select", "immediate");
        }

        await scrollFeedToItem30(page);
        await page.locator('a:has-text("Post #30")').first().click();
        await expect(page).toHaveURL(/\/feed\/30$/);
        // Wait for the post-detail page to fully render so the subsequent
        // nav click isn't competing with an in-flight data fetch.
        await expect(heading(page)).toHaveText("Post #30", { timeout: 10_000 });

        // Forward navigation back to /feed via the nav link — not a history
        // back-traversal. Should scroll to top (item 1 visible, item 30 not).
        await link(page, "Feed").click();
        await expect(page).toHaveURL("/feed");

        await expect(
          page.locator('a:has-text("Post #1")').first(),
        ).toBeInViewport({ timeout: 5_000 });
        await expect(
          page.locator('a:has-text("Post #30")').first(),
        ).not.toBeInViewport();
      });
    });
  }
});
