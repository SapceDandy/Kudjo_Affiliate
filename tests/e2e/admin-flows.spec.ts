import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Admin Flows', () => {
  
  test('global dashboard shows real aggregates', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');

    // Verify real metrics are displayed
    await expect(page.getByTestId('active-businesses')).toBeVisible();
    await expect(page.getByTestId('total-influencers')).toBeVisible();
    await expect(page.getByTestId('gmv-total')).toBeVisible();
    await expect(page.getByTestId('payout-liabilities')).toBeVisible();

    // Verify no mock data indicators
    await expect(page.getByText(/mock|fake|demo/i)).not.toBeVisible();
  });

  test('user management - create influencer', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');

    await page.getByRole('button', { name: /create influencer/i }).click();
    
    await page.getByLabel(/email/i).fill('newinfluencer@test.com');
    await page.getByLabel(/display name/i).fill('New Test Influencer');
    await page.getByLabel(/tier/i).selectOption('Medium');
    
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByText(/influencer created/i)).toBeVisible();
  });

  test('user management - disable/enable user', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');

    // Find a user and disable them
    const userRow = page.getByTestId('user-row').first();
    await userRow.getByRole('button', { name: /disable/i }).click();
    
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByText(/user disabled/i)).toBeVisible();

    // Re-enable
    await userRow.getByRole('button', { name: /enable/i }).click();
    await expect(page.getByText(/user enabled/i)).toBeVisible();
  });

  test('offer audit - search and force disable', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/offers');

    // Search by business name
    await page.getByLabel(/search/i).fill('Manual POS Restaurant');
    await page.waitForLoadState('networkidle');

    // Verify filtered results
    await expect(page.getByText(/manual pos restaurant/i)).toBeVisible();

    // Force disable an offer
    const offerRow = page.getByTestId('offer-row').first();
    await offerRow.getByRole('button', { name: /force disable/i }).click();
    
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByText(/offer disabled/i)).toBeVisible();
  });

  test('redemption audit with search filters', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/redemptions');

    // Search by coupon code
    await page.getByLabel(/coupon code/i).fill('TEST-COUPON-001');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForLoadState('networkidle');

    // Verify search results
    await expect(page.getByText(/test-coupon-001/i)).toBeVisible();

    // Test date filter
    await page.getByLabel(/date from/i).fill('2025-01-01');
    await page.getByLabel(/date to/i).fill('2025-12-31');
    await page.getByRole('button', { name: /filter/i }).click();
    await page.waitForLoadState('networkidle');
  });

  test('system settings - ToS version management', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings');

    // Update ToS version
    await page.getByLabel(/terms version/i).fill('2.1');
    await page.getByRole('button', { name: /update terms/i }).click();
    await expect(page.getByText(/terms updated/i)).toBeVisible();

    // Verify enforcement setting
    await page.getByLabel(/enforce acceptance/i).check();
    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/settings saved/i)).toBeVisible();
  });

  test('blacklist management', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/blacklist');

    // Add IP to blacklist
    await page.getByLabel(/ip address/i).fill('192.168.1.100');
    await page.getByLabel(/reason/i).fill('Suspicious activity');
    await page.getByRole('button', { name: /add to blacklist/i }).click();
    await expect(page.getByText(/ip blacklisted/i)).toBeVisible();

    // Verify blacklist entry appears
    await expect(page.getByText(/192\.168\.1\.100/)).toBeVisible();
  });
});
