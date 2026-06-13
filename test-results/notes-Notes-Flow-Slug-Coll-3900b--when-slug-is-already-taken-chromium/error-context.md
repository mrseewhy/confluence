# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notes.spec.ts >> Notes Flow >> Slug Collision >> should show proactive warning when slug is already taken
- Location: e2e/notes.spec.ts:49:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Already taken')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('text=Already taken')

```

```yaml
- complementary:
  - button:
    - img
  - navigation:
    - link "Overview":
      - /url: /dashboard
      - img
    - link "Folders":
      - /url: /dashboard/folders
      - img
    - link "Subfolders":
      - /url: /dashboard/subfolders
      - img
    - link "Notes":
      - /url: /dashboard/notes
      - img
    - link "Collaborators":
      - /url: /dashboard/collaborators
      - img
    - link "Activity Log":
      - /url: /dashboard/activity
      - img
    - link "Collaborations":
      - /url: /dashboard/collaborations
      - img
  - link "Settings":
    - /url: /dashboard/settings
    - img
  - text: S
- complementary:
  - button:
    - img
  - navigation:
    - link "Overview":
      - /url: /dashboard
      - img
    - link "Folders":
      - /url: /dashboard/folders
      - img
    - link "Subfolders":
      - /url: /dashboard/subfolders
      - img
    - link "Notes":
      - /url: /dashboard/notes
      - img
    - link "Collaborators":
      - /url: /dashboard/collaborators
      - img
    - link "Activity Log":
      - /url: /dashboard/activity
      - img
    - link "Collaborations":
      - /url: /dashboard/collaborations
      - img
  - link "Settings":
    - /url: /dashboard/settings
    - img
  - text: S
- banner:
  - link "Dashboard":
    - /url: /dashboard
  - text: / Notes
  - button "Switch to dark mode": 🌙
  - button "S Sarah Chen":
    - text: S Sarah Chen
    - img
- main:
  - link "Notes":
    - /url: /dashboard/notes
  - text: / New note
  - button "Create note" [disabled]
  - textbox "Note title\\u2026": Duplicate Slug Test
  - text: /arah-hen/n/
  - textbox: my-daily-workflow-tips
  - button "Lock slug":
    - img
  - text: "🌎 Public URL: http://localhost:5173/arah-hen/n/my-daily-workflow-tips"
  - button "Copy Link"
  - text: Description
  - textbox "A short summary of what this note covers\\u2026"
  - text: Folder
  - button "Select a folder…":
    - text: Select a folder…
    - img
  - text: Visibility
  - button "Private":
    - img
    - text: Private
  - button "Public":
    - img
    - text: Public
  - separator
  - paragraph: ✦
  - paragraph: No blocks yet
  - paragraph: Use the buttons below to add text, code, images, or videos.
  - text: Add block
  - button "📌 + Heading"
  - button "📝 + Text"
  - button "💻 + Code"
  - button "🖼️ + Image"
  - button "🎬 + Video"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Notes Flow', () => {
  4  |   test.describe('Authentication & Navigation', () => {
  5  |     test('should allow creating a new note', async ({ page }) => {
  6  |       // Login via the form
  7  |       await page.goto('/login');
  8  |       await page.fill('input[type="email"]', 'sarah@confluence.test');
  9  |       await page.fill('input[type="password"]', 'Sarah123!');
  10 |       await page.click('button[type="submit"]');
  11 |       await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  12 | 
  13 |       // Use SPA navigation to preserve auth session
  14 |       await page.click('a[href="/dashboard/notes"]');
  15 |       await page.waitForSelector('text=New note', { timeout: 10000 });
  16 |       await page.click('a[href="/dashboard/notes/new"]');
  17 | 
  18 |       // Now on the create page
  19 |       const titleInput = page.getByPlaceholder('Note title');
  20 |       await expect(titleInput).toBeVisible({ timeout: 10000 });
  21 |       await titleInput.fill('End-to-End Test Note');
  22 | 
  23 |       // Click Edit slug button
  24 |       await page.click('button[title="Edit slug"]');
  25 |       const slugInput = page.locator('input[type="text"]').last();
  26 |       await slugInput.fill('e2e-test-note');
  27 | 
  28 |       // Select a folder
  29 |       await page.click('button:has-text("Select a folder")');
  30 |       // Wait for folder items to load via async Supabase query
  31 |       await page.waitForTimeout(2000);
  32 |       await page.locator('[data-folder-item]:first-child').click();
  33 | 
  34 |       // Click save
  35 |       await page.click('button:has-text("Create note")');
  36 | 
  37 |       // Should navigate to notes list on success
  38 |       await expect(page).toHaveURL(/\/dashboard\/notes/);
  39 |     });
  40 | 
  41 |     test('should render a public note', async ({ page }) => {
  42 |       await page.goto('/sarah/n/welcome-to-confluence');
  43 |       const content = await page.content();
  44 |       expect(content).not.toContain('404');
  45 |     });
  46 |   });
  47 | 
  48 |   test.describe('Slug Collision', () => {
  49 |     test('should show proactive warning when slug is already taken', async ({ page }) => {
  50 |       // Login via the form
  51 |       await page.goto('/login');
  52 |       await page.fill('input[type="email"]', 'sarah@confluence.test');
  53 |       await page.fill('input[type="password"]', 'Sarah123!');
  54 |       await page.click('button[type="submit"]');
  55 |       await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  56 | 
  57 |       // Navigate to create note via SPA
  58 |       await page.click('a[href="/dashboard/notes"]');
  59 |       await page.waitForSelector('text=New note', { timeout: 10000 });
  60 |       await page.click('a[href="/dashboard/notes/new"]');
  61 | 
  62 |       // Wait for editor to load
  63 |       const titleInput = page.getByPlaceholder('Note title');
  64 |       await expect(titleInput).toBeVisible({ timeout: 10000 });
  65 |       await titleInput.fill('Duplicate Slug Test');
  66 | 
  67 |       // Edit the slug to one sarah already owns
  68 |       await page.click('button[title="Edit slug"]');
  69 |       const slugInput = page.locator('input[type="text"]').last();
  70 |       await slugInput.fill('my-daily-workflow-tips');
  71 | 
  72 |       // The proactive slug check should show \"Already taken — edit slug\"
> 73 |       await expect(page.locator('text=Already taken')).toBeVisible({ timeout: 15000 });
     |                                                        ^ Error: expect(locator).toBeVisible() failed
  74 |     });
  75 |   });
  76 | });
  77 | 
```