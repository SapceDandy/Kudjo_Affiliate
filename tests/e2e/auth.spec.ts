import { test, expect } from '@playwright/test';
import { loginAs, signOut, testUsers } from '../helpers/auth';

test.describe('Authentication & Session Management', () => {
  
  test('sign-in success with valid business account', async ({ page }) => {
    await page.goto('/sign-in');
    
    await page.getByLabel(/email/i).fill(testUsers.business1.email);
    await page.getByLabel(/password/i).fill(testUsers.business1.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('admin login works and shows admin dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    
    // Verify admin-specific elements are visible
    await expect(page.getByText(/admin dashboard/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /user management/i })).toBeVisible();
  });

  test('sign-out clears session and reopening forces login', async ({ context, page }) => {
    // Login
    await loginAs(page, 'business1');
    await expect(page.getByText(/welcome/i)).toBeVisible();

    // Sign out
    await signOut(page);

    // Close all pages, new context = fresh session
    await context.close();
    const newContext = await page.context().browser()?.newContext();
    const newPage = await newContext!.newPage();

    // Reopen app → must see login
    await newPage.goto('/');
    await expect(newPage.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    await newContext?.close();
  });

  test('role routing - business cannot access admin routes', async ({ page }) => {
    await loginAs(page, 'business1');
    
    // Try to access admin route
    await page.goto('/admin/users');
    
    // Should be redirected or see access denied
    await expect(page.getByText(/access denied|insufficient permissions/i)).toBeVisible();
  });

  test('role routing - influencer cannot access business settings', async ({ page }) => {
    await loginAs(page, 'influencer1');
    
    // Try to access business route
    await page.goto('/business/settings');
    
    // Should be redirected or see access denied
    await expect(page.getByText(/access denied|insufficient permissions/i)).toBeVisible();
  });

  test('admin can access all areas', async ({ page }) => {
    await loginAs(page, 'admin');
    
    // Should be able to access admin areas
    await page.goto('/admin/users');
    await expect(page.getByText(/user management/i)).toBeVisible();
    
    // Should be able to access business areas (read-only)
    await page.goto('/business/offers');
    await expect(page.getByText(/offers|campaigns/i)).toBeVisible();
    
    // Should be able to access influencer areas
    await page.goto('/influencer/dashboard');
    await expect(page.getByText(/dashboard|earnings/i)).toBeVisible();
  });

  test('token refresh keeps session valid during activity', async ({ page }) => {
    await loginAs(page, 'business1');
    
    // Simulate activity over time
    for (let i = 0; i < 3; i++) {
      await page.goto('/business/offers');
      await expect(page.getByText(/offers/i)).toBeVisible();
      
      // Wait a bit to simulate time passing
      await page.waitForTimeout(2000);
    }
    
    // Should still be authenticated
    await expect(page.getByText(/welcome|dashboard/i)).toBeVisible();
  });
});
