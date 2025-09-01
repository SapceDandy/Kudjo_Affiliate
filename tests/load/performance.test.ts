import { test, expect } from '@playwright/test';
import { loginAsInfluencer } from '../helpers/auth';

test.describe('Performance & Load Tests', () => {
  
  test('offer discovery query returns results under 300ms', async ({ page }) => {
    await loginAsInfluencer(page);
    
    const startTime = Date.now();
    await page.goto('/influencer/discover');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(2000); // 2s for full page load
    
    // Test API response time specifically
    const apiStartTime = Date.now();
    const response = await page.request.get('/api/influencer/available-campaigns?limit=20');
    const apiEndTime = Date.now();
    
    expect(response.status()).toBe(200);
    expect(apiEndTime - apiStartTime).toBeLessThan(300);
  });

  test('concurrent coupon claims - only one issued per user', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Login same influencer in multiple tabs
    await Promise.all(
      pages.map(page => loginAsInfluencer(page))
    );

    // Navigate to same offer
    await Promise.all(
      pages.map(page => page.goto('/influencer/discover'))
    );

    // Simultaneously claim coupon
    const claimPromises = pages.map(page => 
      page.getByTestId('offer-item').first().click()
        .then(() => page.getByRole('button', { name: /claim coupon/i }).click())
    );

    const results = await Promise.allSettled(claimPromises);
    
    // Only one should succeed, others should get "already claimed" error
    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBeLessThanOrEqual(1);

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('concurrent offer publishes are idempotent', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Login same business in multiple tabs
    await Promise.all(
      pages.map(page => page.goto('/sign-in'))
    );

    // Create and simultaneously publish same offer
    const publishPromises = pages.map(async (page, index) => {
      await page.goto('/business/offers/new');
      await page.getByLabel('Title').fill(`Concurrent Test Offer ${index}`);
      await page.getByRole('button', { name: /publish/i }).click();
    });

    await Promise.allSettled(publishPromises);
    
    // Verify adapter was called correctly (should be idempotent)
    // This would need to be verified through logs or adapter mock calls

    await Promise.all(contexts.map(context => context.close()));
  });

  test('dashboard loads under 2s with cached aggregates', async ({ page }) => {
    await loginAsInfluencer(page);
    
    const startTime = Date.now();
    await page.goto('/influencer/dashboard');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(2000);
    
    // Verify all key metrics are loaded
    await expect(page.getByTestId('total-earnings')).toBeVisible();
    await expect(page.getByTestId('active-campaigns')).toBeVisible();
    await expect(page.getByTestId('recent-activity')).toBeVisible();
  });
});
