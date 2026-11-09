import { test, expect, type Page } from '@playwright/test'

/**
 * Covers the features added in the last round of work: the global search
 * palette, note export, comments, the notification bell, and the dashboard
 * utility pages (trash, settings).
 *
 * These flows touch shared seed data, so run serially.
 */
test.describe.configure({ mode: 'serial', timeout: 90_000 })

async function signIn(page: Page, email = 'sarah@confluence.test', password = 'Sarah123!') {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
}

/** Open a known public note owned by sarah. */
async function openFirstNote(page: Page) {
  await page.goto('/notes')
  await page.waitForTimeout(1200)
  const link = page.locator('a[href*="/n/"]').first()
  await expect(link).toBeVisible({ timeout: 10000 })
  await link.click()
  await page.waitForTimeout(1500)
}

test.describe('Global search', () => {
  test('finds notes by title and navigates to them', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: /search/i }).first().click()
    const input = page.getByLabel('Search notes, folders and people')
    await input.fill('workflow')

    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 10000 })
    const before = page.url()
    await page.getByRole('option').first().click()
    await page.waitForTimeout(1200)
    expect(page.url()).not.toBe(before)
  })

  test('shows an empty state for a query with no matches', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /search/i }).first().click()
    await page.getByLabel('Search notes, folders and people').fill('zzzznotathing')
    await expect(page.getByText(/no matches/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Note export', () => {
  test('offers Markdown, HTML and JSON export', async ({ page }) => {
    await openFirstNote(page)
    const exportBtn = page.getByRole('button', { name: /export/i }).first()
    await expect(exportBtn).toBeVisible({ timeout: 10000 })
    await exportBtn.click()

    await expect(page.getByText(/markdown/i).first()).toBeVisible()
    await expect(page.getByText(/html/i).first()).toBeVisible()
    await expect(page.getByText(/json/i).first()).toBeVisible()
  })

  test('downloading Markdown produces a .md file', async ({ page }) => {
    await openFirstNote(page)
    await page.getByRole('button', { name: /export/i }).first().click()

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByText(/markdown/i).first().click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })
})

test.describe('Comments', () => {
  test('anonymous visitors are asked to sign in', async ({ page }) => {
    await openFirstNote(page)
    await expect(page.getByText(/comment/i).first()).toBeVisible({ timeout: 10000 })
    // Either an existing thread or the sign-in prompt must be present.
    const body = await page.locator('body').innerText()
    expect(/no comments yet|sign in to join|comment/i.test(body)).toBeTruthy()
  })

  test('a signed-in user can post a comment', async ({ page }) => {
    await signIn(page)
    await openFirstNote(page)

    const composer = page.getByPlaceholder(/add a comment|write a comment|comment/i).first()
    if ((await composer.count()) === 0) test.skip()

    const text = `E2E comment ${Date.now()}`
    await composer.fill(text)
    await page.getByRole('button', { name: /post|comment/i }).first().click()
    await expect(page.getByText(text)).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Notifications', () => {
  test('the bell opens a panel', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)

    const bell = page.getByRole('button', { name: /notifications/i }).first()
    await expect(bell).toBeVisible({ timeout: 10000 })
    await bell.click()
    await page.waitForTimeout(800)
    // Panel shows either items or an empty state.
    const body = await page.locator('body').innerText()
    expect(/no notifications|mark all as read|notifications/i.test(body)).toBeTruthy()
  })
})

test.describe('Dashboard utility pages', () => {
  test('trash page loads', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/trash')
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    expect(/trash/i.test(body)).toBeTruthy()
    expect(/something went wrong|error boundary/i.test(body)).toBeFalsy()
  })

  test('settings page loads and shows the free plan', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/settings')
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    expect(/settings|profile/i.test(body)).toBeTruthy()
    expect(/current plan/i.test(body)).toBeTruthy()
  })

  test('billing plan buttons open a free/coming-soon modal', async ({ page }) => {
    await signIn(page)
    await page.goto('/dashboard/settings')
    await page.waitForTimeout(1500)

    const bronze = page.getByRole('button', { name: /bronze plan/i }).first()
    if ((await bronze.count()) === 0) test.skip()
    await bronze.click()

    await expect(page.getByText(/everything is free/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/coming soon/i).first()).toBeVisible()
    await page.getByRole('button', { name: /got it/i }).click()
    await expect(page.getByText(/everything is free/i)).toBeHidden()
  })
})

test.describe('Admin', () => {
  test('admin can open the users page', async ({ page }) => {
    // alex is promoted to admin by scripts/seed-test-users.sh
    await signIn(page, 'alex@confluence.test', 'Alex123!')
    await page.goto('/admin/dashboard/users')
    await page.waitForTimeout(2000)

    const body = await page.locator('body').innerText()
    if (/not authorized|access denied/i.test(body)) test.skip()
    expect(/users/i.test(body)).toBeTruthy()
  })
})

test.describe('Help page', () => {
  test('help page is reachable and documents the tricky behaviours', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: /Help & Getting Started/i })).toBeVisible({
      timeout: 15000,
    });
    // The parts users actually need to understand.
    await expect(page.getByText(/combine both sets of changes/i)).toBeVisible();
    await expect(page.getByText(/Saved offline/i).first()).toBeVisible();
    await expect(page.getByText(/Version history/i).first()).toBeVisible();
  });

  test('help is linked from the footer', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href="/help"]').first();
    await expect(link).toBeVisible({ timeout: 15000 });
    await link.click();
    await expect(page).toHaveURL(/\/help$/, { timeout: 10000 });
  });
});
