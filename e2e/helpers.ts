import { expect, type Page } from '@playwright/test'

/**
 * Shared e2e helpers.
 *
 * The suites previously waited with fixed `waitForTimeout` sleeps before
 * asserting. Those are the worst of both worlds: too short to survive a busy
 * machine (so correct code "fails") and always too long when things are fast.
 * Everything here waits for an observable condition instead, so a test either
 * sees the state it needs or fails for a real reason.
 */

export const USERS = {
  alex: { email: 'alex@confluence.test', password: 'Alex123!' },
  sarah: { email: 'sarah@confluence.test', password: 'Sarah123!' },
  marcus: { email: 'marcus@confluence.test', password: 'Marcus123!' },
}

/** Sign in and wait for the dashboard to be interactive. */
export async function login(page: Page, user: { email: string; password: string } = USERS.sarah) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').first().fill(user.password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  // The shell only renders once the session has been resolved.
  await expect(page.locator('aside.dash-sidebar').first()).toBeVisible({ timeout: 30_000 })
}

/**
 * Navigate within the dashboard and wait for the page to settle.
 *
 * Waits for the loading state to clear when the page shows one, otherwise for
 * the sidebar link to become the active route.
 */
export async function goTo(page: Page, path: string) {
  await page.locator(`aside.dash-sidebar a[href="${path}"]`).first().click()
  await page.waitForURL((url) => url.pathname === path, { timeout: 30_000 })
  await waitForIdle(page)
}

/** Wait until any visible loading indicator has gone. */
export async function waitForIdle(page: Page) {
  const loading = page.locator('[data-testid="loading"], .loading-spinner, [aria-busy="true"]')
  if ((await loading.count()) > 0) {
    await expect(loading.first()).toBeHidden({ timeout: 30_000 })
  }
}

/**
 * Wait for a table to have rendered its rows.
 *
 * Returns the row count so callers can assert on it; 0 is a valid value when
 * the page is legitimately empty.
 */
export async function waitForRows(page: Page): Promise<number> {
  const rows = page.locator('[class*="tableRow"]')
  // Either rows appear, or the page shows an explicit empty state.
  await Promise.race([
    rows.first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {}),
    page
      .getByText(/nothing here|no notes|no folders|no results|empty/i)
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .catch(() => {}),
  ])
  return rows.count()
}

/** A title unique to this run, so repeated or parallel runs cannot collide. */
export function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

/** Escape a string for safe use inside a RegExp. */
export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
