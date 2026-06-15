# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notes.spec.ts >> Notes Flow >> should share a private note with a collaborator as editor
- Location: e2e/notes.spec.ts:97:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - navigation [ref=e5]:
      - link "confluence" [ref=e6] [cursor=pointer]:
        - /url: /
      - generic [ref=e7]:
        - link "Folders" [ref=e8] [cursor=pointer]:
          - /url: /folders
        - link "Notes" [ref=e9] [cursor=pointer]:
          - /url: /notes
      - generic [ref=e10]:
        - button "Switch to dark mode" [ref=e11] [cursor=pointer]: 🌙
        - generic [ref=e12]:
          - link "Sign in" [ref=e13] [cursor=pointer]:
            - /url: /login
            - button "Sign in" [ref=e14]
          - link "Get started" [ref=e15] [cursor=pointer]:
            - /url: /signup
            - button "Get started" [ref=e16]
  - main [ref=e17]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]: ✦
          - heading "Welcome back" [level=2] [ref=e23]
          - paragraph [ref=e24]: Sign in to access your notes and folders.
        - button "Continue with Google" [ref=e25] [cursor=pointer]:
          - img [ref=e26]
          - text: Continue with Google
        - generic [ref=e33]: or sign in with email
        - generic [ref=e35]: "{}"
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]: Email address
            - textbox "Email address" [ref=e40]:
              - /placeholder: you@example.com
              - text: sarah@confluence.test
          - generic [ref=e41]:
            - generic [ref=e42]:
              - generic [ref=e43]: Password
              - link "Forgot password?" [ref=e44] [cursor=pointer]:
                - /url: /recover
            - generic [ref=e46]:
              - textbox "Your password" [ref=e47]: Sarah123!
              - button "Show password" [ref=e49] [cursor=pointer]:
                - img [ref=e50]
          - button "Sign in" [ref=e53] [cursor=pointer]
      - paragraph [ref=e54]:
        - text: Don't have an account?
        - link "Sign up for free" [ref=e55] [cursor=pointer]:
          - /url: /signup
  - contentinfo [ref=e56]:
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]: confluence
          - paragraph [ref=e61]: Create, organise, and share structured notes with anyone.
        - generic [ref=e62]:
          - paragraph [ref=e63]: Product
          - generic [ref=e64]:
            - link "Folders" [ref=e65] [cursor=pointer]:
              - /url: /folders
            - link "Notes" [ref=e66] [cursor=pointer]:
              - /url: /notes
        - generic [ref=e67]:
          - paragraph [ref=e68]: Account
          - generic [ref=e69]:
            - link "Sign in" [ref=e70] [cursor=pointer]:
              - /url: /login
            - link "Sign up" [ref=e71] [cursor=pointer]:
              - /url: /signup
        - generic [ref=e72]:
          - paragraph [ref=e73]: Legal
          - generic [ref=e74]:
            - link "Privacy" [ref=e75] [cursor=pointer]:
              - /url: /privacy
            - link "Terms" [ref=e76] [cursor=pointer]:
              - /url: /terms
      - generic [ref=e77]:
        - paragraph [ref=e78]: © 2026 confluence. All rights reserved.
        - paragraph [ref=e79]: Built with ♥ and too much coffee.
```

# Test source

```ts
  5   |     test.setTimeout(60000);
  6   | 
  7   |     // Login via the form
  8   |     await page.goto('/login');
  9   |     await page.fill('input[type="email"]', 'sarah@confluence.test');
  10  |     await page.fill('input[type="password"]', 'Sarah123!');
  11  |     await page.click('button[type="submit"]');
  12  |     await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  13  | 
  14  |     // Use SPA navigation to preserve auth session
  15  |     await page.click('aside a[href="/dashboard/notes"]');
  16  |     await page.waitForTimeout(1000);
  17  |     await page.click('a[href="/dashboard/notes/new"]');
  18  | 
  19  |     // Now on the create page — wait for editor to fully render
  20  |     const titleInput = page.getByPlaceholder('Note title');
  21  |     await expect(titleInput).toBeVisible({ timeout: 15000 });
  22  |     await titleInput.fill('End-to-End Test Note');
  23  | 
  24  |     // Click Edit slug button and set a unique slug
  25  |     const testSlug = `e2e-test-${Date.now()}`;
  26  |     await page.click('button[title="Edit slug"]');
  27  |     const slugInput = page.locator('input[type="text"]').last();
  28  |     await slugInput.fill(testSlug);
  29  |     await page.keyboard.press('Enter');
  30  | 
  31  |     // Select a folder by opening the dropdown and clicking a folder item
  32  |     const folderTrigger = page.getByText('Select a folder', { exact: false });
  33  |     await folderTrigger.click();
  34  |     // Wait for folder items to load (async Supabase query)
  35  |     await page.waitForSelector('[data-folder-item]', { timeout: 15000 });
  36  |     await page.locator('[data-folder-item]').first().click();
  37  | 
  38  |     // Click save
  39  |     await page.click('button:has-text("Create note")');
  40  | 
  41  |     // Should navigate to notes list on success
  42  |     await expect(page).toHaveURL(/\/dashboard\/notes/);
  43  |   });
  44  | 
  45  |   test('should render a public note', async ({ page }) => {
  46  |     await page.goto('/sarah/n/welcome-to-confluence');
  47  |     const content = await page.content();
  48  |     expect(content).not.toContain('404');
  49  | });
  50  | 
  51  | test('should create a note and verify it renders publicly', async ({ page }) => {
  52  |     test.setTimeout(90000);
  53  | 
  54  |     // ── Login as existing seeded user ─────────────────────────
  55  |     await page.goto('/login');
  56  |     await page.fill('input[type="email"]', 'sarah@confluence.test');
  57  |     await page.fill('input[type="password"]', 'Sarah123!');
  58  |     await page.click('button[type="submit"]');
  59  |     await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  60  | 
  61  |     // ── Navigate to create note ────────────────────────────────
  62  |     await page.click('aside a[href="/dashboard/notes"]');
  63  |     await page.waitForTimeout(1500);
  64  |     await page.click('a[href="/dashboard/notes/new"]');
  65  | 
  66  |     const titleInput = page.getByPlaceholder('Note title');
  67  |     await expect(titleInput).toBeVisible({ timeout: 15000 });
  68  |     await titleInput.fill('E2E Full Flow Note');
  69  | 
  70  |     // Set a unique slug
  71  |     const uniqueSlug = `e2e-full-${Date.now()}`;
  72  |     await page.click('button[title="Edit slug"]');
  73  |     const slugInput = page.locator('input[type="text"]').last();
  74  |     await slugInput.fill(uniqueSlug);
  75  |     await page.keyboard.press('Enter');
  76  | 
  77  |     // Select a folder
  78  |     const folderTrigger = page.getByText('Select a folder', { exact: false });
  79  |     await folderTrigger.click();
  80  |     await page.waitForSelector('[data-folder-item]', { timeout: 15000 });
  81  |     await page.locator('[data-folder-item]').first().click();
  82  | 
  83  |     // ── Save the note ──────────────────────────────────────────
  84  |     await page.click('button:has-text("Create note")');
  85  |     await expect(page).toHaveURL(/\/dashboard\/notes/, { timeout: 15000 });
  86  | 
  87  |     // ── Verify the note appears in the dashboard notes list ─
  88  |     await expect(page.getByText('E2E Full Flow Note')).toBeVisible({ timeout: 10000 });
  89  | 
  90  |     // ── Also navigate to the Edit page (SPA) to verify the editor loads ─
  91  |     await page.click('a[href*="/edit"]:has-text("Edit")');
  92  |     await expect(page.getByPlaceholder('Note title')).toBeVisible({ timeout: 15000 });
  93  |     const editorTitle = await page.getByPlaceholder('Note title').inputValue();
  94  |     expect(editorTitle).toBe('E2E Full Flow Note');
  95  |   });
  96  | 
  97  |   test('should share a private note with a collaborator as editor', async ({ page, browser }) => {
  98  |     test.setTimeout(120000);
  99  | 
  100 |     // ── Sarah logs in and creates a new private note ────────────
  101 |     await page.goto('/login');
  102 |     await page.fill('input[type="email"]', 'sarah@confluence.test');
  103 |     await page.fill('input[type="password"]', 'Sarah123!');
  104 |     await page.click('button[type="submit"]');
> 105 |     await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  106 | 
  107 |     // Navigate to create a new note
  108 |     await page.click('aside a[href="/dashboard/notes"]');
  109 |     await page.waitForTimeout(1000);
  110 |     await page.click('a[href="/dashboard/notes/new"]');
  111 | 
  112 |     const titleInput = page.getByPlaceholder('Note title');
  113 |     await expect(titleInput).toBeVisible({ timeout: 15000 });
  114 |     await titleInput.fill('Collaboration Editor Test');
  115 | 
  116 |     const shareSlug = `collab-edit-${Date.now()}`;
  117 |     await page.click('button[title="Edit slug"]');
  118 |     const slugInput = page.locator('input[type="text"]').last();
  119 |     await slugInput.fill(shareSlug);
  120 |     await page.keyboard.press('Enter');
  121 | 
  122 |     // Select a folder
  123 |     const folderTrigger = page.getByText('Select a folder', { exact: false });
  124 |     await folderTrigger.click();
  125 |     await page.waitForSelector('[data-folder-item]', { timeout: 15000 });
  126 |     await page.locator('[data-folder-item]').first().click();
  127 | 
  128 |     // ── Set visibility to Private so the Share button appears ──
  129 |     await page.locator('button:has-text("Private")').click();
  130 | 
  131 |     // Save the note
  132 |     await page.click('button:has-text("Create note")');
  133 |     await expect(page).toHaveURL(/\/dashboard\/notes/, { timeout: 15000 });
  134 | 
  135 |     // ── Sarah shares the note with marcus ───────────────────────
  136 |     await page.waitForSelector('[class*="tableRow"]', { timeout: 10000 });
  137 |     const shareButton = page.locator('button:has-text("Share")').first();
  138 |     await expect(shareButton).toBeVisible({ timeout: 10000 });
  139 |     await shareButton.click();
  140 | 
  141 |     // Fill in email
  142 |     const emailInput = page.getByPlaceholder('collaborator');
  143 |     await expect(emailInput).toBeVisible({ timeout: 5000 });
  144 |     await emailInput.fill('marcus@confluence.test');
  145 | 
  146 |     // The default role is 'viewer' — any collaborator can open the edit page
  147 |     // Write access is enforced server-side by replace_note_blocks
  148 | 
  149 |     // Click Invite
  150 |     const inviteButton = page.locator('button:has-text("Invite")').first();
  151 |     await expect(inviteButton).toBeVisible({ timeout: 3000 });
  152 |     await inviteButton.click();
  153 | 
  154 |     // Wait for marcus to appear in the collaborators list
  155 |     await expect(page.locator('text=marcus@confluence.test')).toBeVisible({ timeout: 10000 });
  156 | 
  157 |     // ── Marcus logs in and accesses the shared note's edit page ─
  158 |     const marcusCtx = await browser.newContext();
  159 |     const marcusPage = await marcusCtx.newPage();
  160 |     await marcusPage.goto('/login');
  161 |     await marcusPage.fill('input[type="email"]', 'marcus@confluence.test');
  162 |     await marcusPage.fill('input[type="password"]', 'Marcus123!');
  163 |     await marcusPage.click('button[type="submit"]');
  164 |     await marcusPage.waitForURL(/\/dashboard/, { timeout: 15000 });
  165 | 
  166 |     // ── Check marcus's Collaborations page via SPA navigation ─
  167 |     await marcusPage.click('aside a[href="/dashboard/collaborations"]');
  168 |     await marcusPage.waitForURL('/dashboard/collaborations', { timeout: 10000 });
  169 |     // Verify marcus can see the shared note in his collaborations list
  170 |     await expect(marcusPage.getByText('Collaboration Editor Test')).toBeVisible({ timeout: 15000 });
  171 | 
  172 |     await marcusCtx.close();
  173 |   });
  174 | 
  175 |   test('should show proactive warning when slug is already taken', async ({ page }) => {
  176 |     test.setTimeout(60000);
  177 | 
  178 |     // Login via the form
  179 |     await page.goto('/login');
  180 |     await page.fill('input[type="email"]', 'sarah@confluence.test');
  181 |     await page.fill('input[type="password"]', 'Sarah123!');
  182 |     await page.click('button[type="submit"]');
  183 |     await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  184 | 
  185 |     // Navigate to create note via SPA
  186 |     await page.click('aside a[href="/dashboard/notes"]');
  187 |     await page.waitForTimeout(1000);
  188 |     await page.click('a[href="/dashboard/notes/new"]');
  189 | 
  190 |     // Wait for editor to load
  191 |     const titleInput = page.getByPlaceholder('Note title');
  192 |     await expect(titleInput).toBeVisible({ timeout: 15000 });
  193 |     await titleInput.fill('Duplicate Slug Test');
  194 | 
  195 |     // Edit the slug to one sarah already owns
  196 |     await page.click('button[title="Edit slug"]');
  197 |     const slugInput = page.locator('input[type="text"]').last();
  198 |     await slugInput.fill('my-daily-workflow-tips');
  199 |     await page.keyboard.press('Enter');
  200 | 
  201 |     // The proactive slug check should show "Already taken — edit slug"
  202 |     await expect(page.locator('text=Already taken')).toBeVisible({ timeout: 20000 });
  203 |   });
  204 | });
  205 | 
```