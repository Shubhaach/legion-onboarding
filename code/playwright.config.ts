import { defineConfig, devices } from "@playwright/test";

// BASE_URL=https://… runs the suite against a deployed URL instead of a local server.
const baseURL = process.env.BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && npx next start -p 3100",
        url: "http://localhost:3100/start",
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: { ANTHROPIC_API_KEY: "", SESSION_SECRET: "test-secret" },
      },
});
