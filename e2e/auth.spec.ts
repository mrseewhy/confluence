import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow user to sign in and access dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toContainText('Dashboard');
  });

  test('should restrict admin panel from regular users', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/dashboard');
    // Should be redirected to dashboard or home because they aren't admin
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });

  test('should allow admin to access admin panel', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'alex@confluence.test');
    await page.fill('input[type="password"]', 'Alex123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('body')).toContainText('Admin');
  });
});
