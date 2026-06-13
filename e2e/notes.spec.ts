import { test, expect } from '@playwright/test';

test.describe('Notes Flow', () => {
  test('should allow creating a new note', async ({ page }) => {
    test.setTimeout(60000);

    // Login via the form
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Use SPA navigation to preserve auth session
    await page.click('aside a[href="/dashboard/notes"]');
    await page.waitForTimeout(1000);
    await page.click('a[href="/dashboard/notes/new"]');

    // Now on the create page — wait for editor to fully render
    const titleInput = page.getByPlaceholder('Note title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill('End-to-End Test Note');

    // Click Edit slug button and set a unique slug
    await page.click('button[title="Edit slug"]');
    const slugInput = page.locator('input[type="text"]').last();
    await slugInput.fill('e2e-test-note');
    await page.keyboard.press('Enter');

    // Select a folder by opening the dropdown and clicking a folder item
    const folderTrigger = page.getByText('Select a folder', { exact: false });
    await folderTrigger.click();
    // Wait for folder items to load (async Supabase query)
    await page.waitForSelector('[data-folder-item]', { timeout: 15000 });
    await page.locator('[data-folder-item]').first().click();

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

  test('should show proactive warning when slug is already taken', async ({ page }) => {
    test.setTimeout(60000);

    // Login via the form
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to create note via SPA
    await page.click('aside a[href="/dashboard/notes"]');
    await page.waitForTimeout(1000);
    await page.click('a[href="/dashboard/notes/new"]');

    // Wait for editor to load
    const titleInput = page.getByPlaceholder('Note title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill('Duplicate Slug Test');

    // Edit the slug to one sarah already owns
    await page.click('button[title="Edit slug"]');
    const slugInput = page.locator('input[type="text"]').last();
    await slugInput.fill('my-daily-workflow-tips');
    await page.keyboard.press('Enter');

    // The proactive slug check should show "Already taken — edit slug"
    await expect(page.locator('text=Already taken')).toBeVisible({ timeout: 20000 });
  });
});
