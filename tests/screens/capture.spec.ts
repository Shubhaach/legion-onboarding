import { expect, test, type Page } from "@playwright/test";
import { PHONES, book, completeVisit, concerns, confirmPulled, endVisit, pickSlot, safetyNo, snapshot, start } from "../e2e/helpers";

const shot = (page: Page, scenario: string, name: string) =>
  page.screenshot({ path: `docs/screenshots/${scenario}/${name}.png`, fullPage: true });

test("happy-path", async ({ page }) => {
  const s = "happy-path";
  await page.goto("/start");
  await shot(page, s, "01-start");
  await start(page, PHONES.happy, "03141992");
  await expect(page.getByTestId("coverage-card")).toContainText("$30 copay");
  await shot(page, s, "02-confirm");
  await confirmPulled(page, "$30 copay");
  await shot(page, s, "03-safety");
  await safetyNo(page);
  await page.getByLabel("Type or speak. A sentence is enough.").fill("Trouble sleeping and feeling on edge at work for a few months.");
  await expect(page.getByTestId("records-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("concern-chips").locator(".chip.on").first()).toBeVisible();
  await shot(page, s, "04-concerns");
  await concerns(page, "Trouble sleeping and feeling on edge at work for a few months.", { records: true });
  await shot(page, s, "05-snapshot");
  await snapshot(page, { records: true });
  await page.getByTestId("provider-open").locator("button.time").first().click();
  await shot(page, s, "06-provider");
  await page.getByRole("button", { name: /^Continue with/ }).click();
  await page.locator("button.doc").nth(0).click();
  await shot(page, s, "07a-agreement-open");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await shot(page, s, "07-book");
  await book(page, "Jordan Reyes");
  await shot(page, s, "08-booked");
  await page.getByRole("link", { name: "Go to your visit room →" }).click();
  await shot(page, s, "09a-visit-room");
  await page.getByRole("button", { name: "Demo", exact: true }).click();
  await shot(page, s, "09b-demo-panel");
  await page.getByRole("button", { name: "Fast-forward to visit time" }).click();
  await page.getByRole("button", { name: "Join visit" }).click();
  await expect(page.getByTestId("video-stage")).toBeVisible();
  await shot(page, s, "09c-visit-joined");
  await endVisit(page);
  await shot(page, s, "10-visit-complete");
  await page.goto("/debug/funnel");
  await shot(page, s, "11-debug-funnel");
});

test("no-match", async ({ page }) => {
  await start(page, PHONES.noMatch, "06151990");
  await expect(page.getByRole("heading", { name: "We couldn't find your details" })).toBeVisible();
  await shot(page, "no-match", "02-manual-form");
});

test("no-coverage", async ({ page }) => {
  await start(page, PHONES.noCoverage, "11021988");
  await expect(page.getByTestId("coverage-card")).toContainText("$250");
  await page.getByLabel(/I'll pay myself/).check();
  await shot(page, "no-coverage", "02-self-pay");
});

test("records-slow", async ({ page }) => {
  await start(page, PHONES.recordsSlow, "07211996");
  await confirmPulled(page, "$40 copay");
  await safetyNo(page);
  await page.getByLabel("Type or speak. A sentence is enough.").fill("Nightmares and flashbacks since the accident.");
  await expect(page.getByTestId("concern-chips").locator(".chip.on").first()).toBeVisible();
  await shot(page, "records-slow", "04-concerns-asked-directly");
  await concerns(page, "Nightmares and flashbacks since the accident.", { records: false });
  await shot(page, "records-slow", "05-snapshot-asked-directly");
});

test("out-of-state", async ({ page }) => {
  await start(page, PHONES.outOfState, "01301990");
  await expect(page.getByRole("heading", { name: /California/ })).toBeVisible();
  await shot(page, "out-of-state", "02-stopped");
});

test("controlled-med", async ({ page }) => {
  const s = "controlled-med";
  await start(page, PHONES.controlled, "05091999");
  await confirmPulled(page, "$25 copay");
  await safetyNo(page);
  await concerns(page, "I can't focus at work and keep procrastinating.", { records: true });
  await shot(page, s, "05-snapshot-stimulant");
  await snapshot(page, { records: true });
  await pickSlot(page);
  await book(page, "Riley Chen");
  await completeVisit(page);
  await page.getByRole("button", { name: "Show provider view (demo)" }).click();
  await expect(page.getByTestId("controlled-flag")).toBeVisible();
  await shot(page, s, "09-provider-view-flag");
});

test("safety-yes", async ({ page }) => {
  await start(page, PHONES.happy, "03141992");
  await confirmPulled(page, "$30 copay");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page).toHaveURL(/\/crisis/);
  await shot(page, "safety-yes", "03-crisis");
});

test("phone-width", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/start");
  await page.screenshot({ path: "docs/screenshots/phone/01-start.png", fullPage: true });
  await start(page, PHONES.happy, "03141992");
  await expect(page.getByTestId("coverage-card")).toContainText("$30 copay");
  await page.screenshot({ path: "docs/screenshots/phone/02-confirm.png", fullPage: true });
  await confirmPulled(page, "$30 copay");
  await safetyNo(page);
  await concerns(page, "Feeling low and empty, no energy.", { records: true });
  await snapshot(page, { records: true });
  await page.getByTestId("provider-open").locator("button.time").first().click();
  await page.screenshot({ path: "docs/screenshots/phone/06-provider.png", fullPage: true });
  await ctx.close();
});
