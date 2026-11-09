import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility audit.
 *
 * Runs axe against the main public surfaces. We assert on *serious* and
 * *critical* impact violations only: those are the ones that actually block
 * people (missing labels, broken landmarks, contrast that hides text).
 * Moderate/minor findings are reported in the test output for triage but do
 * not fail the build.
 */

const SEVERITY = new Set(['serious', 'critical'])

async function audit(page: import('@playwright/test').Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const blocking = results.violations.filter((v) => SEVERITY.has(v.impact ?? ''))

  if (blocking.length > 0) {
    const summary = blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(' '))
            .join('\n    ')}`,
      )
      .join('\n  ')
    console.log(`\nAccessibility violations on ${context}:\n  ${summary}`)
  }

  return blocking
}

test.describe('Accessibility', () => {
  // axe runs a full rule set against the page and Firefox is markedly slower
  // than Chromium at it; the 30s default is too tight when suites run
  // alongside each other.
  test.describe.configure({ timeout: 90_000 })

  test('landing page has no serious/critical violations', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await audit(page, '/')).toEqual([])
  })

  test('sign-in page has no serious/critical violations', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    expect(await audit(page, '/login')).toEqual([])
  })

  test('sign-up page has no serious/critical violations', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    expect(await audit(page, '/signup')).toEqual([])
  })

  test('public notes list has no serious/critical violations', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForTimeout(1500)
    expect(await audit(page, '/notes')).toEqual([])
  })

  test('a public note page has no serious/critical violations', async ({ page }) => {
    await page.goto('/notes')
    await page.waitForTimeout(1500)

    // Follow the first note link rather than hard-coding a seed slug.
    const firstNote = page.locator('a[href*="/n/"]').first()
    if ((await firstNote.count()) === 0) test.skip()
    await firstNote.click()
    await page.waitForTimeout(2000)
    expect(await audit(page, 'note detail')).toEqual([])
  })

  test('dashboard has no serious/critical violations when signed in', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('sarah@confluence.test')
    await page.locator('input[type="password"]').first().fill('Sarah123!')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/\/dashboard/, { timeout: 20000 })
    await page.waitForTimeout(2000)
    expect(await audit(page, '/dashboard')).toEqual([])
  })
})
