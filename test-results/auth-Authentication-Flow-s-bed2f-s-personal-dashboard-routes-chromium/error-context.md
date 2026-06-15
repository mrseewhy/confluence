# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should allow admin to access personal dashboard routes
- Location: e2e/auth.spec.ts:36:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/admin\/dashboard/
Received string:  "http://localhost:5173/login"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    28 × unexpected value "http://localhost:5173/login"

```

```yaml
- banner:
  - navigation:
    - link "confluence":
      - /url: /
    - link "Folders":
      - /url: /folders
    - link "Notes":
      - /url: /notes
    - button "Switch to dark mode": 🌙
    - link "Sign in":
      - /url: /login
      - button "Sign in"
    - link "Get started":
      - /url: /signup
      - button "Get started"
- main:
  - text: ✦
  - heading "Welcome back" [level=2]
  - paragraph: Sign in to access your notes and folders.
  - button "Continue with Google" [disabled]:
    - img
    - text: Continue with Google
  - text: or sign in with email Email address
  - textbox "Email address":
    - /placeholder: you@example.com
    - text: alex@confluence.test
  - text: Password
  - link "Forgot password?":
    - /url: /recover
  - textbox "Your password": Alex123!
  - button "Show password":
    - img
  - button "Signing in…" [disabled]
  - paragraph:
    - text: Don't have an account?
    - link "Sign up for free":
      - /url: /signup
- contentinfo:
  - text: confluence
  - paragraph: Create, organise, and share structured notes with anyone.
  - paragraph: Product
  - link "Folders":
    - /url: /folders
  - link "Notes":
    - /url: /notes
  - paragraph: Account
  - link "Sign in":
    - /url: /login
  - link "Sign up":
    - /url: /signup
  - paragraph: Legal
  - link "Privacy":
    - /url: /privacy
  - link "Terms":
    - /url: /terms
  - paragraph: © 2026 confluence. All rights reserved.
  - paragraph: Built with ♥ and too much coffee.
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
  19 |     await page.waitForURL(/\/dashboard/, { timeout: 15000 });
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
> 41 |     await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
     |                        ^ Error: expect(page).toHaveURL(expected) failed
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