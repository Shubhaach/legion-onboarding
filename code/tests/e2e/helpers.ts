import { expect, type Page } from "@playwright/test";

export const PHONES = {
  happy: "5125550142",
  noMatch: "5125550100",
  noCoverage: "5125550111",
  recordsSlow: "5125550122",
  outOfState: "4155550133",
  controlled: "5125550155",
};

/** Screen 1: phone, date of birth (MMDDYYYY), consent, code. */
export async function start(page: Page, phone: string, dob: string, code = "123456") {
  await page.goto("/start");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("Date of birth").fill(dob);
  await page.getByRole("button", { name: "Text me a code" }).click();
  await page.getByLabel(/We texted a 6-digit code/).fill(code);
  if (code === "000000") return;
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/confirm/);
}

export async function confirmPulled(page: Page, copay: string) {
  await expect(page.getByTestId("coverage-card")).toContainText(copay);
  await page.getByRole("button", { name: "Yes, that's me" }).click();
  await expect(page).toHaveURL(/\/safety/);
}

export async function safetyNo(page: Page) {
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page).toHaveURL(/\/concerns/);
}

export async function concerns(page: Page, text: string, { records }: { records: boolean }) {
  await page.getByLabel("Type or speak. A sentence is enough.").fill(text);
  await expect(page.getByTestId("concern-chips").locator(".chip.on").first()).toBeVisible();
  if (records) {
    await expect(page.getByTestId("records-card")).toBeVisible({ timeout: 15_000 });
    for (const group of await page.getByRole("radiogroup", { name: /still relevant/ }).all())
      await group.getByRole("radio", { name: "Yes" }).click();
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/snapshot/);
}

export async function snapshot(page: Page, { records }: { records: boolean }) {
  for (const group of await page.getByRole("radiogroup", { name: /^Still taking/ }).all())
    await group.getByRole("radio", { name: "Yes" }).click();
  if (records) await page.getByRole("radiogroup", { name: "Hospital stays in the past year" }).getByRole("radio", { name: "Correct" }).click();
  else await page.getByRole("radiogroup", { name: "Any hospital stays in the past year?" }).getByRole("radio", { name: "No" }).click();
  await page.getByRole("button", { name: "Looks right" }).click();
  await expect(page).toHaveURL(/\/provider/);
}

export async function pickSlot(page: Page) {
  await page.getByTestId("provider-open").locator("button.time").first().click();
  await page.getByRole("button", { name: /^Continue with/ }).click();
  await expect(page).toHaveURL(/\/book/);
}

export async function readAgreement(page: Page, index: number) {
  await page.locator("button.doc").nth(index).click();
  const scroll = page.getByTestId("agreement-scroll");
  await scroll.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(page.getByTestId("agreement-end")).toHaveText(/Marked as read/);
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
}

export async function book(page: Page, name: string) {
  for (let i = 0; i < 5; i++) await readAgreement(page, i);
  await expect(page.getByTestId("read-count")).toHaveText("5 of 5 read");
  await page.getByLabel("Card number").fill("4242424242424242");
  await page.getByLabel("Expiry").fill("1230");
  await page.getByLabel("CVC").fill("123");
  await page.getByLabel("ZIP").fill("78704");
  await page.getByLabel("Sign with your full name").fill(name);
  await page.getByLabel("I've read and agree to these agreements").check();
  await page.getByRole("button", { name: "Book visit" }).click();
  await expect(page).toHaveURL(/\/booked/);
  await expect(page.getByText("You're booked")).toBeVisible();
}

/** From /booked: fast-forward via the demo panel, join, end, and land on the finish line. */
export async function completeVisit(page: Page) {
  await page.getByRole("link", { name: "Go to your visit room →" }).click();
  await expect(page).toHaveURL(/\/visit/);
  await page.getByRole("button", { name: "Demo", exact: true }).click();
  await page.getByRole("button", { name: "Fast-forward to visit time" }).click();
  await page.getByRole("button", { name: "Join visit" }).click();
  await expect(page.getByTestId("video-stage")).toBeVisible();
}

export async function endVisit(page: Page) {
  await page.getByRole("button", { name: "End visit" }).click();
  await expect(page).toHaveURL(/\/visit-complete/);
  await expect(page.getByText("First visit completed")).toBeVisible();
}
