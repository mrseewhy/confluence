import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow user to sign in and access dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    // Regular users are redirected to /dashboard automatically
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText('Dashboard');
  });

  test('should restrict admin panel from regular users', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Use SPA navigation (sidebar click) to preserve auth
    await page.goto('/admin/dashboard');
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });

  test('should allow admin to access admin panel', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alex@confluence.test');
    await page.fill('input[type="password"]', 'Alex123!');
    await page.click('button[type="submit"]');
    // Admin users are redirected to /admin/dashboard automatically
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText('Admin');
  });

  test('should allow admin to access personal dashboard routes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alex@confluence.test');
    await page.fill('input[type="password"]', 'Alex123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });

    // Open the user menu to access the dashboard switch link
    await page.click('button:has-text("Alex Johnson")');
    await page.click('a[href="/dashboard"]');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
    await expect(page.locator('body')).toContainText('Personal Dashboard');

    // Navigate to personal Notes page via sidebar
    await page.click('aside a[href="/dashboard/notes"]');
    await expect(page.locator('body')).toContainText('Notes');

    // Switch back to admin dashboard via user menu
    await page.click('button:has-text("Alex Johnson")');
    await page.click('a[href="/admin/dashboard"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    await expect(page.locator('body')).toContainText('Admin');
  });
});
