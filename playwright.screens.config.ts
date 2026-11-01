import { defineConfig, devices } from "@playwright/test";

// Captures docs/screenshots/<scenario>/ from a running app:
//   BASE_URL=https://legion-onboarding-theta.vercel.app npx playwright test -c playwright.screens.config.ts
export default defineConfig({
  testDir: "./tests/screens",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 3,
  reporter: "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3100", ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
});
