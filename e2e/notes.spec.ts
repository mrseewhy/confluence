import { test, expect } from '@playwright/test';

test.describe('Notes Flow', () => {
  test.describe('Authentication & Navigation', () => {
    test('should allow creating a new note', async ({ page }) => {
      // Login via the form
      await page.goto('/login');
      await page.fill('input[type="email"]', 'sarah@confluence.test');
      await page.fill('input[type="password"]', 'Sarah123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });

      // Use SPA navigation to preserve auth session
      await page.click('a[href="/dashboard/notes"]');
      await page.waitForSelector('text=New note', { timeout: 10000 });
      await page.click('a[href="/dashboard/notes/new"]');

      // Now on the create page
      const titleInput = page.getByPlaceholder('Note title');
      await expect(titleInput).toBeVisible({ timeout: 10000 });
      await titleInput.fill('End-to-End Test Note');

      // Click Edit slug button
      await page.click('button[title="Edit slug"]');
      const slugInput = page.locator('input[type="text"]').last();
      await slugInput.fill('e2e-test-note');

      // Select a folder
      await page.click('button:has-text("Select a folder")');
      // Wait for folder items to load via async Supabase query
      await page.waitForTimeout(2000);
      await page.locator('[data-folder-item]:first-child').click();

      // Click save
      await page.click('button:has-text("Create note")');

      // Should navigate to notes list on success
      await expect(page).toHaveURL(/\/dashboard\/notes/);
    });

    test('should render a public note', async ({ page }) => {
      await page.goto('/sarah/n/welcome-to-confluence');
      const content = await page.content();
      expect(content).not.toContain('404');
    });
  });

  test.describe('Slug Collision', () => {
    test('should show proactive warning when slug is already taken', async ({ page }) => {
      // Login via the form
      await page.goto('/login');
      await page.fill('input[type="email"]', 'sarah@confluence.test');
      await page.fill('input[type="password"]', 'Sarah123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });

      // Navigate to create note via SPA
      await page.click('a[href="/dashboard/notes"]');
      await page.waitForSelector('text=New note', { timeout: 10000 });
      await page.click('a[href="/dashboard/notes/new"]');

      // Wait for editor to load
      const titleInput = page.getByPlaceholder('Note title');
      await expect(titleInput).toBeVisible({ timeout: 10000 });
      await titleInput.fill('Duplicate Slug Test');

      // Edit the slug to one sarah already owns
      await page.click('button[title="Edit slug"]');
      const slugInput = page.locator('input[type="text"]').last();
      await slugInput.fill('my-daily-workflow-tips');

      // The proactive slug check should show \"Already taken — edit slug\"
      await expect(page.locator('text=Already taken')).toBeVisible({ timeout: 15000 });
    });
  });
});
