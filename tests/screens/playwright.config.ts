import { defineConfig, devices } from "@playwright/test";

// Captures docs/screenshots/<scenario>/ from a running app (run from the repo root):
//   BASE_URL=https://legion-onboarding-theta.vercel.app npm run screenshots
export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 3,
  reporter: "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3100", ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
});
