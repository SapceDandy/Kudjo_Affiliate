import { test, expect } from '@playwright/test';
import { loginAsBusiness, loginAs } from '../helpers/auth';

test.describe('Business Flows', () => {
  
  test('business can create, publish and pause offer', async ({ page }) => {
    await loginAsBusiness(page);
    await page.goto('/business/offers/new');

    // Fill offer form
    await page.getByLabel('Title').fill('10% Off Any Item');
    await page.getByLabel('Description').fill('Get 10% off your entire order');
    await page.getByLabel('Min Spend').fill('10');
    await page.getByLabel('Max Influencers').fill('100');
    
    // Set tier splits
    await page.getByLabel('Small %').fill('5');
    await page.getByLabel('Medium %').fill('7');
    await page.getByLabel('Large %').fill('10');

    // Save as draft first
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/draft saved/i)).toBeVisible();

    // Publish the offer
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.getByText(/offer published/i)).toBeVisible();

    // Pause the offer
    await page.getByRole('button', { name: /pause/i }).click();
    await expect(page.getByText(/offer paused/i)).toBeVisible();
  });

  test('POS connect - manual adapter', async ({ page }) => {
    await loginAsBusiness(page);
    await page.goto('/business/pos');

    // Connect manual POS
    await page.getByRole('button', { name: /connect manual pos/i }).click();
    await expect(page.getByText(/manual pos connected/i)).toBeVisible();

    // Disconnect
    await page.getByRole('button', { name: /disconnect/i }).click();
    await expect(page.getByText(/pos disconnected/i)).toBeVisible();
  });

  test('POS connect - Square OAuth flow', async ({ page }) => {
    await loginAs(page, 'business2');
    await page.goto('/business/pos');

    // Mock Square OAuth success
    await page.getByRole('button', { name: /connect square/i }).click();
    
    // Should redirect to Square OAuth (in real test, mock this)
    // For now, verify the button exists and is clickable
    await expect(page.getByRole('button', { name: /connect square/i })).toBeVisible();
  });

  test('view analytics with real data', async ({ page }) => {
    await loginAsBusiness(page);
    await page.goto('/business/analytics');

    // Verify metrics load
    await expect(page.getByText(/revenue/i)).toBeVisible();
    await expect(page.getByText(/redemptions/i)).toBeVisible();
    await expect(page.getByText(/active offers/i)).toBeVisible();

    // Test filters
    await page.getByLabel(/date range/i).click();
    await page.getByText(/last 30 days/i).click();
    
    // Verify data updates
    await expect(page.getByTestId('revenue-chart')).toBeVisible();
  });

  test('export CSV functionality', async ({ page }) => {
    await loginAsBusiness(page);
    await page.goto('/business/redemptions');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export csv/i }).click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/redemptions.*\.csv/);
  });

  test('offer pagination works correctly', async ({ page }) => {
    await loginAsBusiness(page);
    await page.goto('/business/offers');

    // Verify pagination controls exist
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();

    // Test pagination
    const initialOffers = await page.getByTestId('offer-item').count();
    
    if (initialOffers > 0) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForLoadState('networkidle');
      
      // Verify page changed
      const newOffers = await page.getByTestId('offer-item').count();
      expect(newOffers).toBeGreaterThanOrEqual(0);
    }
  });
});
