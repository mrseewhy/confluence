import { test, expect } from '@playwright/test';

test.describe('Notes Flow', () => {
  test('should allow creating a new note', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');

    await page.goto('/dashboard/notes/new');
    await page.fill('input[placeholder="Note Title"]', 'End-to-End Test Note');
    await page.fill('input[placeholder="Slug"]', 'e2e-test-note');
    
    // Add a block (Assuming there's a button to add text block)
    // In a real scenario, we'd target the specific "Add Block" button
    // We'll just try to save with title and description for now
    await page.click('button:has-text("Save Note")');
    
    await expect(page).toHaveURL(/\/dashboard\/notes\//);
    await expect(page.locator('body')).toContainText('End-to-End Test Note');
  });

  test('should render a public note', async ({ page }) => {
    // Note: This assumes a note with slug 'welcome' exists from seeding
    await page.goto('/sarah/n/welcome'); 
    // If it's a 404, it's because the seed data slug is different. 
    // We'll check if the page is not a 404.
    const content = await page.content();
    expect(content).not.toContain('404');
  });
});
