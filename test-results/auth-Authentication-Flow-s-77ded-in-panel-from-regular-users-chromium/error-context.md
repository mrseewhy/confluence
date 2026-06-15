# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should restrict admin panel from regular users
- Location: e2e/auth.spec.ts:14:3

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
        - button "Continue with Google" [disabled] [ref=e25] [cursor=pointer]:
          - img [ref=e26]
          - text: Continue with Google
        - generic [ref=e33]: or sign in with email
        - generic [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: Email address
            - textbox "Email address" [ref=e39]:
              - /placeholder: you@example.com
              - text: sarah@confluence.test
          - generic [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e42]: Password
              - link "Forgot password?" [ref=e43] [cursor=pointer]:
                - /url: /recover
            - generic [ref=e45]:
              - textbox "Your password" [ref=e46]: Sarah123!
              - button "Show password" [ref=e48] [cursor=pointer]:
                - img [ref=e49]
          - button "Signing in…" [disabled] [ref=e52] [cursor=pointer]
      - paragraph [ref=e53]:
        - text: Don't have an account?
        - link "Sign up for free" [ref=e54] [cursor=pointer]:
          - /url: /signup
  - contentinfo [ref=e55]:
    - generic [ref=e56]:
      - generic [ref=e57]:
        - generic [ref=e58]:
          - generic [ref=e59]: confluence
          - paragraph [ref=e60]: Create, organise, and share structured notes with anyone.
        - generic [ref=e61]:
          - paragraph [ref=e62]: Product
          - generic [ref=e63]:
            - link "Folders" [ref=e64] [cursor=pointer]:
              - /url: /folders
            - link "Notes" [ref=e65] [cursor=pointer]:
              - /url: /notes
        - generic [ref=e66]:
          - paragraph [ref=e67]: Account
          - generic [ref=e68]:
            - link "Sign in" [ref=e69] [cursor=pointer]:
              - /url: /login
            - link "Sign up" [ref=e70] [cursor=pointer]:
              - /url: /signup
        - generic [ref=e71]:
          - paragraph [ref=e72]: Legal
          - generic [ref=e73]:
            - link "Privacy" [ref=e74] [cursor=pointer]:
              - /url: /privacy
            - link "Terms" [ref=e75] [cursor=pointer]:
              - /url: /terms
      - generic [ref=e76]:
        - paragraph [ref=e77]: © 2026 confluence. All rights reserved.
        - paragraph [ref=e78]: Built with ♥ and too much coffee.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should allow user to sign in and access dashboard', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await page.fill('input[type="email"]', 'sarah@confluence.test');
  7  |     await page.fill('input[type="password"]', 'Sarah123!');
  8  |     await page.click('button[type="submit"]');
  9  |     // Regular users are redirected to /dashboard automatically
  10 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  11 |     await expect(page.locator('body')).toContainText('Dashboard');
  12 |   });
  13 | 
  14 |   test('should restrict admin panel from regular users', async ({ page }) => {
  15 |     await page.goto('/login');
  16 |     await page.fill('input[type="email"]', 'sarah@confluence.test');
  17 |     await page.fill('input[type="password"]', 'Sarah123!');
  18 |     await page.click('button[type="submit"]');
> 19 |     await page.waitForURL(/\/dashboard/, { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  20 | 
  21 |     // Use SPA navigation (sidebar click) to preserve auth
  22 |     await page.goto('/admin/dashboard');
  23 |     await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  24 |   });
  25 | 
  26 |   test('should allow admin to access admin panel', async ({ page }) => {
  27 |     await page.goto('/login');
  28 |     await page.fill('input[type="email"]', 'alex@confluence.test');
  29 |     await page.fill('input[type="password"]', 'Alex123!');
  30 |     await page.click('button[type="submit"]');
  31 |     // Admin users are redirected to /admin/dashboard automatically
  32 |     await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
  33 |     await expect(page.locator('body')).toContainText('Admin');
  34 |   });
  35 | 
  36 |   test('should allow admin to access personal dashboard routes', async ({ page }) => {
  37 |     await page.goto('/login');
  38 |     await page.fill('input[type="email"]', 'alex@confluence.test');
  39 |     await page.fill('input[type="password"]', 'Alex123!');
  40 |     await page.click('button[type="submit"]');
  41 |     await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
  42 | 
  43 |     // Open the user menu to access the dashboard switch link
  44 |     await page.click('button:has-text("Alex Johnson")');
  45 |     await page.click('a[href="/dashboard"]');
  46 |     await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });
  47 |     await expect(page.locator('body')).toContainText('Personal Dashboard');
  48 | 
  49 |     // Navigate to personal Notes page via sidebar
  50 |     await page.click('aside a[href="/dashboard/notes"]');
  51 |     await expect(page.locator('body')).toContainText('Notes');
  52 | 
  53 |     // Switch back to admin dashboard via user menu
  54 |     await page.click('button:has-text("Alex Johnson")');
  55 |     await page.click('a[href="/admin/dashboard"]');
  56 |     await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  57 |     await expect(page.locator('body')).toContainText('Admin');
  58 |   });
  59 | });
  60 | 
```