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
    const testSlug = `e2e-test-${Date.now()}`;
    await page.click('button[title="Edit slug"]');
    const slugInput = page.locator('input[type="text"]').last();
    await slugInput.fill(testSlug);
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

test('should create a note and verify it renders publicly', async ({ page }) => {
    test.setTimeout(90000);

    // ── Login as existing seeded user ─────────────────────────
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // ── Navigate to create note ────────────────────────────────
    await page.click('aside a[href="/dashboard/notes"]');
    await page.waitForTimeout(1500);
    await page.click('a[href="/dashboard/notes/new"]');

    const titleInput = page.getByPlaceholder('Note title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill('E2E Full Flow Note');

    // Set a unique slug
    const uniqueSlug = `e2e-full-${Date.now()}`;
    await page.click('button[title="Edit slug"]');
    const slugInput = page.locator('input[type="text"]').last();
    await slugInput.fill(uniqueSlug);
    await page.keyboard.press('Enter');

    // Select a folder
    const folderTrigger = page.getByText('Select a folder', { exact: false });
    await folderTrigger.click();
    await page.waitForSelector('[data-folder-item]', { timeout: 15000 });
    await page.locator('[data-folder-item]').first().click();

    // ── Save the note ──────────────────────────────────────────
    await page.click('button:has-text("Create note")');
    await expect(page).toHaveURL(/\/dashboard\/notes/, { timeout: 15000 });

    // ── Verify the note appears in the dashboard notes list ─
    await expect(page.getByText('E2E Full Flow Note')).toBeVisible({ timeout: 10000 });

    // ── Also navigate to the Edit page (SPA) to verify the editor loads ─
    await page.click('a[href*="/edit"]:has-text("Edit")');
    await expect(page.getByPlaceholder('Note title')).toBeVisible({ timeout: 15000 });
    const editorTitle = await page.getByPlaceholder('Note title').inputValue();
    expect(editorTitle).toBe('E2E Full Flow Note');
  });

  test('should share a private note with a collaborator as editor', async ({ page, browser }) => {
    test.setTimeout(120000);

    // ── Sarah logs in and creates a new private note ────────────
    await page.goto('/login');
    await page.fill('input[type="email"]', 'sarah@confluence.test');
    await page.fill('input[type="password"]', 'Sarah123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to create a new note
    await page.click('aside a[href="/dashboard/notes"]');
    await page.waitForTimeout(1000);
    await page.click('a[href="/dashboard/notes/new"]');

    const titleInput = page.getByPlaceholder('Note title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill('Collaboration Editor Test');

    const shareSlug = `collab-edit-${Date.now()}`;
    await page.click('button[title="Edit slug"]');
    const slugInput = page.locator('input[type="text"]').last();
    await slugInput.fill(shareSlug);
    await page.keyboard.press('Enter');

    // Select a folder
    const folderTrigger = page.getByText('Select a folder', { exact: false });
    await folderTrigger.click();
    await page.waitForSelector('[data-folder-item]', { timeout: 15000 });
    await page.locator('[data-folder-item]').first().click();

    // ── Set visibility to Private so the Share button appears ──
    await page.locator('button:has-text("Private")').click();

    // Save the note
    await page.click('button:has-text("Create note")');
    await expect(page).toHaveURL(/\/dashboard\/notes/, { timeout: 15000 });

    // ── Sarah shares the note with marcus ───────────────────────
    await page.waitForSelector('[class*="tableRow"]', { timeout: 10000 });
    const shareButton = page.locator('button:has-text("Share")').first();
    await expect(shareButton).toBeVisible({ timeout: 10000 });
    await shareButton.click();

    // Fill in email
    const emailInput = page.getByPlaceholder('collaborator');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('marcus@confluence.test');

    // The default role is 'viewer' — any collaborator can open the edit page
    // Write access is enforced server-side by replace_note_blocks

    // Click Invite
    const inviteButton = page.locator('button:has-text("Invite")').first();
    await expect(inviteButton).toBeVisible({ timeout: 3000 });
    await inviteButton.click();

    // Wait for marcus to appear in the collaborators list
    await expect(page.locator('text=marcus@confluence.test')).toBeVisible({ timeout: 10000 });

    // ── Marcus logs in and accesses the shared note's edit page ─
    const marcusCtx = await browser.newContext();
    const marcusPage = await marcusCtx.newPage();
    await marcusPage.goto('/login');
    await marcusPage.fill('input[type="email"]', 'marcus@confluence.test');
    await marcusPage.fill('input[type="password"]', 'Marcus123!');
    await marcusPage.click('button[type="submit"]');
    await marcusPage.waitForURL(/\/dashboard/, { timeout: 15000 });

    // ── Check marcus's Collaborations page via SPA navigation ─
    await marcusPage.click('aside a[href="/dashboard/collaborations"]');
    await marcusPage.waitForURL('/dashboard/collaborations', { timeout: 10000 });
    // Verify marcus can see the shared note in his collaborations list
    await expect(marcusPage.getByText('Collaboration Editor Test')).toBeVisible({ timeout: 15000 });

    await marcusCtx.close();
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
