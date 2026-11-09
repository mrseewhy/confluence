import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // The local Supabase gateway serialises auth requests and each login takes
  // 0.5-3s under load, so unbounded parallelism makes tests time out waiting for
  // redirects rather than finding real failures. Cap concurrency.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry separates "the machine was busy" from "this is broken".
  // A genuine failure fails both attempts and still fails the run; a timeout
  // caused by contention passes on the second and is reported as flaky.
  retries: process.env.CI ? 2 : 1,
  // Per-test budget. Firefox needs 25-40s for a single page when the local
  // Supabase gateway is saturated, and the 30s default turned correct tests
  // into failures. This is headroom, not a fix: tests below still assert on
  // real readiness, so a fast failure still fails fast.
  timeout: 90_000,
  // Several suites (notes, features, reorder) mutate the SAME local database
  // rows. Running them in parallel makes them stomp on each other, producing
  // failures that look like app bugs. Keep concurrency low enough that the
  // mutating suites rarely overlap, and give each test room to finish.
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  // Remove test data afterwards so repeated runs don't accumulate rows that
  // break list assertions and strict-mode locators.
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:5173',
    // Firefox under parallel load can take 30s+ for a single page; the default
    // is too tight and produces failures for tests that are actually correct.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
