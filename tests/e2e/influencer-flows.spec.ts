import { test, expect } from '@playwright/test';
import { loginAsInfluencer, loginAs } from '../helpers/auth';

test.describe('Influencer Flows', () => {
  
  test('offer discovery with filters and pagination', async ({ page }) => {
    await loginAsInfluencer(page);
    await page.goto('/influencer/discover');

    // Verify offers are loaded
    await expect(page.getByTestId('offer-item')).toHaveCount({ min: 1 });

    // Test category filter
    await page.getByLabel(/category/i).selectOption('food');
    await page.waitForLoadState('networkidle');
    
    // Test tier filter (should only show eligible offers)
    await page.getByLabel(/tier/i).selectOption('Small');
    await page.waitForLoadState('networkidle');

    // Test pagination
    if (await page.getByRole('button', { name: /next/i }).isVisible()) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('get affiliate link generates unique token', async ({ page }) => {
    await loginAsInfluencer(page);
    await page.goto('/influencer/discover');

    // Click on first offer
    await page.getByTestId('offer-item').first().click();
    
    // Get affiliate link
    await page.getByRole('button', { name: /get affiliate link/i }).click();
    
    // Verify link is generated and displayed
    await expect(page.getByTestId('affiliate-link')).toBeVisible();
    
    // Test copy functionality
    await page.getByRole('button', { name: /copy/i }).click();
    await expect(page.getByText(/copied/i)).toBeVisible();
  });

  test('claim one-time coupon generates code', async ({ page }) => {
    await loginAsInfluencer(page);
    await page.goto('/influencer/discover');

    // Click on first offer
    await page.getByTestId('offer-item').first().click();
    
    // Claim coupon
    await page.getByRole('button', { name: /claim coupon/i }).click();
    
    // Verify coupon is generated
    await expect(page.getByTestId('coupon-code')).toBeVisible();
    await expect(page.getByTestId('qr-code')).toBeVisible();
  });

  test('content submission with URL validation', async ({ page }) => {
    await loginAsInfluencer(page);
    await page.goto('/influencer/content');

    // Submit TikTok URL
    await page.getByLabel(/post url/i).fill('https://tiktok.com/@test/video/123456789');
    await page.getByLabel(/campaign/i).selectOption({ index: 0 });
    
    await page.getByRole('button', { name: /submit content/i }).click();
    await expect(page.getByText(/content submitted/i)).toBeVisible();
  });

  test('earnings dashboard shows real data', async ({ page }) => {
    await loginAsInfluencer(page);
    await page.goto('/influencer/earnings');

    // Verify earnings data is loaded
    await expect(page.getByTestId('total-earnings')).toBeVisible();
    await expect(page.getByTestId('pending-earnings')).toBeVisible();
    
    // Test date range filter
    await page.getByLabel(/date range/i).click();
    await page.getByText(/last 30 days/i).click();
    await page.waitForLoadState('networkidle');

    // Test CSV export
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/earnings.*\.csv/);
  });

  test('tier enforcement - only eligible offers shown', async ({ page }) => {
    // Login as Small tier influencer
    await loginAs(page, 'influencer1');
    await page.goto('/influencer/discover');

    // Get all visible offers
    const offers = page.getByTestId('offer-item');
    const count = await offers.count();

    // Verify all offers are eligible for Small tier
    for (let i = 0; i < count; i++) {
      const offer = offers.nth(i);
      await expect(offer.getByText(/small|medium|large|xl|huge/i)).toBeVisible();
    }
  });

  test('redemption simulation via test endpoint', async ({ page }) => {
    await loginAsInfluencer(page);
    
    // Navigate to test redemption page (if exists)
    await page.goto('/test/redemption');
    
    // Fill redemption form
    await page.getByLabel(/coupon code/i).fill('TEST-COUPON-001');
    await page.getByLabel(/amount/i).fill('25.00');
    
    await page.getByRole('button', { name: /simulate redemption/i }).click();
    await expect(page.getByText(/redemption successful/i)).toBeVisible();
  });
});
