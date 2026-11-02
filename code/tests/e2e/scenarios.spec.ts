import { expect, test } from "@playwright/test";
import { PHONES, book, completeVisit, concerns, confirmPulled, endVisit, pickSlot, readAgreement, safetyNo, snapshot, start } from "./helpers";

test("happy path: Jordan Reyes through first visit completed @phone", async ({ page }) => {
  await start(page, PHONES.happy, "03141992");
  await expect(page.getByText("Jordan Reyes")).toBeVisible();
  await confirmPulled(page, "$30 copay");
  await safetyNo(page);
  await concerns(page, "Trouble sleeping and feeling on edge at work for a few months.", { records: true });
  await expect(page.getByText("Sertraline 50 mg")).toBeVisible();
  await snapshot(page, { records: true });
  await expect(page.getByTestId("cost-pill")).toContainText("$30");
  await pickSlot(page);
  await book(page, "Jordan Reyes");
  await completeVisit(page);
  await endVisit(page);
  await page.getByTestId("followup-card").locator("button.time").first().click();
  await expect(page.getByText(/Follow-up booked/)).toBeVisible();
  await page.goto("/debug/funnel");
  await expect(page.getByText("First visit completed (north star)")).toBeVisible();
});

test("identity not matched: screen 2 becomes the manual form", async ({ page }) => {
  await start(page, PHONES.noMatch, "06151990");
  await expect(page.getByRole("heading", { name: "We couldn't find your details" })).toBeVisible();
  await page.getByLabel("First name").fill("Sam");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Home address").fill("12 Example St");
  await page.getByLabel("City").fill("Austin");
  await page.getByLabel("ZIP").fill("78701");
  await page.getByLabel("I have insurance").check();
  await page.getByLabel("Insurance company").fill("Example Health Plan");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/safety/);
  await safetyNo(page);
  // Nothing was pulled, so screens 4 and 5 ask directly.
  await concerns(page, "I feel anxious and can't sleep.", { records: false });
  await expect(page.getByText("Are you taking any medications?")).toBeVisible();
});

test("no coverage: self-pay $250 shown on screen 2", async ({ page }) => {
  await start(page, PHONES.noCoverage, "11021988");
  const card = page.getByTestId("coverage-card");
  await expect(card).toContainText("We couldn't find an active plan");
  await expect(card).toContainText("$250");
  await expect(page.getByRole("button", { name: "Yes, that's me" })).toBeDisabled();
  await page.getByLabel(/I'll pay myself/).check();
  await page.getByRole("button", { name: "Yes, that's me" }).click();
  await expect(page).toHaveURL(/\/safety/);
});

test("records slow: screens 4 and 5 ask directly", async ({ page }) => {
  await start(page, PHONES.recordsSlow, "07211996");
  await confirmPulled(page, "$40 copay");
  await safetyNo(page);
  await expect(page.getByText("Or pick what fits")).toBeVisible();
  await expect(page.getByTestId("records-card")).toHaveCount(0);
  await concerns(page, "Nightmares and flashbacks since the accident.", { records: false });
  await expect(page.getByText("Any hospital stays in the past year?")).toBeVisible();
  await snapshot(page, { records: false });
});

test("out of state: California address stopped at screen 2 @phone", async ({ page }) => {
  await start(page, PHONES.outOfState, "01301990");
  await expect(page.getByRole("heading", { name: "Legion can't see patients in California yet" })).toBeVisible();
  await expect(page.getByText("Nothing has been booked or charged")).toBeVisible();
  await page.goto("/safety");
  await expect(page).toHaveURL(/\/confirm/);
});

test("stimulant on file: shown on screen 5, flagged in the clinician view, never blocked", async ({ page }) => {
  await start(page, PHONES.controlled, "05091999");
  await confirmPulled(page, "$25 copay");
  await safetyNo(page);
  await concerns(page, "I can't focus at work and keep procrastinating.", { records: true });
  await expect(page.getByText("Amphetamine-dextroamphetamine 20 mg")).toBeVisible();
  await expect(page.getByText("Controlled medication · Schedule II")).toBeVisible();
  await snapshot(page, { records: true });
  await pickSlot(page);
  await book(page, "Riley Chen");
  await completeVisit(page);
  await page.getByRole("button", { name: "Show provider view (demo)" }).click();
  await expect(page.getByTestId("controlled-flag")).toContainText("Amphetamine-dextroamphetamine");
  await endVisit(page);
});

test('safety "Yes" routes to the crisis screen and stops the flow @phone', async ({ page }) => {
  await start(page, PHONES.happy, "03141992");
  await confirmPulled(page, "$30 copay");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page).toHaveURL(/\/crisis/);
  await expect(page.getByRole("link", { name: "Call 988" })).toBeVisible();
  await expect(page.getByText("Text HOME to 741741.")).toBeVisible();
  await page.goto("/concerns");
  await expect(page).toHaveURL(/\/crisis/);
});

test("agreements: Book stays disabled until all 5 are read to the end", async ({ page }) => {
  await start(page, PHONES.happy, "03141992");
  await confirmPulled(page, "$30 copay");
  await safetyNo(page);
  await concerns(page, "Feeling low and empty, no energy.", { records: true });
  await snapshot(page, { records: true });
  await pickSlot(page);
  const bookBtn = page.getByRole("button", { name: "Book visit" });
  await expect(bookBtn).toBeDisabled();
  await expect(page.getByLabel("Sign with your full name")).toBeDisabled();
  // Opening without scrolling to the end does not count.
  await page.locator("button.doc").first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("read-count")).toHaveText("0 of 5 read");
  for (let i = 0; i < 4; i++) await readAgreement(page, i);
  await expect(page.getByTestId("read-count")).toHaveText("4 of 5 read");
  await expect(bookBtn).toBeDisabled();
  await expect(page.getByLabel("Sign with your full name")).toBeDisabled();
  await readAgreement(page, 4);
  await expect(page.getByLabel("Sign with your full name")).toBeEnabled();
  // Agreement 3 is visibly marked as a placeholder.
  await expect(page.locator("button.doc").nth(2)).toContainText("confirm with Legion");
});

test("wrong text code (000000) is rejected", async ({ page }) => {
  await start(page, PHONES.happy, "03141992", "000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("p.err")).toContainText("That code didn't work");
  await expect(page).toHaveURL(/\/start/);
});
