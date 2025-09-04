import { test, expect } from '@playwright/test';

// Performance and load tests for critical user flows
// Based on production issues from memories regarding slow routing and performance

test.describe('Performance Tests', () => {
  
  test('Homepage should redirect authenticated users quickly', async ({ page }) => {
    // Set up authenticated user session
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test-business@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="signin-submit"]');
    
    // Measure homepage redirect performance
    const startTime = Date.now();
    await page.goto('/');
    
    // Should redirect to appropriate dashboard within 2 seconds
    await expect(page).toHaveURL(/\/(business|influencer|control-center)/, { timeout: 2000 });
    const redirectTime = Date.now() - startTime;
    
    expect(redirectTime).toBeLessThan(2000);
  });

  test('API routes should respond within acceptable time limits', async ({ page }) => {
    // Test critical API endpoints
    const endpoints = [
      '/api/business/metrics',
      '/api/influencer/available-campaigns',
      '/api/admin/influencers/review-queue'
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      const response = await page.request.get(endpoint, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      // API responses should be under 1 second
      expect(responseTime).toBeLessThan(1000);
      
      // Should return JSON, not HTML error pages
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    }
  });

  test('Dashboard loading performance', async ({ page }) => {
    // Login as business user
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test-business@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="signin-submit"]');

    // Measure dashboard load time
    const startTime = Date.now();
    await page.goto('/business');
    
    // Wait for key dashboard elements to load
    await expect(page.locator('[data-testid="business-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="metrics-section"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Real-time updates should not cause performance issues', async ({ page }) => {
    // Login as business user
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test-business@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="signin-submit"]');
    
    await page.goto('/business');
    
    // Monitor network activity for excessive requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });
    
    // Wait for real-time updates to settle
    await page.waitForTimeout(5000);
    
    // Should not have excessive API calls (polling)
    const apiCallCount = requests.length;
    expect(apiCallCount).toBeLessThan(10); // Reasonable limit for real-time updates
  });

  test('Memory usage should remain stable', async ({ page }) => {
    // Login and navigate through different sections
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test-business@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="signin-submit"]');

    const sections = ['/business', '/business/offers', '/business/requests'];
    
    for (const section of sections) {
      await page.goto(section);
      await page.waitForLoadState('networkidle');
      
      // Check for memory leaks by ensuring cleanup
      const jsHandles = await page.evaluateHandle(() => {
        // Count active event listeners and timers
        return {
          listeners: (window as any)._listenerCount || 0,
          timers: (window as any)._timerCount || 0
        };
      });
      
      const handles = await jsHandles.jsonValue();
      
      // Should not accumulate excessive listeners/timers
      expect(handles.listeners).toBeLessThan(50);
      expect(handles.timers).toBeLessThan(10);
    }
  });

  test('Bundle size should be optimized', async ({ page }) => {
    // Navigate to main pages and check resource loading
    const pages = ['/', '/business', '/influencer', '/control-center'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Get all loaded JavaScript resources
      const jsResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return resources
          .filter(r => r.name.endsWith('.js'))
          .map(r => ({ name: r.name, size: (r as any).transferSize }));
      });
      
      // Total JS bundle should be under 2MB
      const totalSize = jsResources.reduce((sum, r) => sum + (r.size || 0), 0);
      expect(totalSize).toBeLessThan(2 * 1024 * 1024);
    }
  });

  test('Database query performance', async ({ page }) => {
    // Test queries that might be slow in production
    const queryTests = [
      {
        endpoint: '/api/business/metrics',
        description: 'Business metrics aggregation'
      },
      {
        endpoint: '/api/admin/influencers/review-queue',
        description: 'Influencer review queue'
      },
      {
        endpoint: '/api/influencer/available-campaigns',
        description: 'Available campaigns listing'
      }
    ];

    for (const test of queryTests) {
      const startTime = Date.now();
      
      const response = await page.request.get(test.endpoint, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      const queryTime = Date.now() - startTime;
      
      // Database queries should complete within 500ms
      expect(queryTime).toBeLessThan(500);
      expect(response.status()).toBe(200);
    }
  });

  test('Concurrent user simulation', async ({ browser }) => {
    // Simulate multiple users accessing the system
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Simulate concurrent logins
    const loginPromises = pages.map(async (page, index) => {
      await page.goto('/auth/signin');
      await page.fill('[data-testid="email"]', `test-user-${index}@example.com`);
      await page.fill('[data-testid="password"]', 'TestPassword123!');
      return page.click('[data-testid="signin-submit"]');
    });

    const startTime = Date.now();
    await Promise.all(loginPromises);
    const concurrentTime = Date.now() - startTime;

    // Concurrent operations should not significantly slow down
    expect(concurrentTime).toBeLessThan(5000);

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });
});
