import { test, expect } from '@playwright/test';

// MVP End-to-End Tests based on INSTRUCTIONS.md Section 18 Checklist

test.describe('MVP Core Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start from homepage
    await page.goto('/');
  });

  test('Admin login and control center access', async ({ page }) => {
    // Navigate to admin login
    await page.goto('/control-center');
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/.*login/);
    
    // Fill admin credentials
    await page.fill('[data-testid="admin-email"]', process.env.ADMIN_EMAIL || 'devon@getkudjo.com');
    await page.fill('[data-testid="admin-passcode"]', process.env.ADMIN_PASSCODE || '1234567890!Dd');
    
    // Submit login
    await page.click('[data-testid="admin-login-submit"]');
    
    // Should redirect to control center dashboard
    await expect(page).toHaveURL(/.*control-center.*dashboard/);
    
    // Verify admin dashboard elements
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-metrics"]')).toBeVisible();
  });

  test('Business onboarding and offer creation flow', async ({ page }) => {
    // Navigate to business signup
    await page.goto('/auth/signup');
    
    // Select business role
    await page.click('[data-testid="role-business"]');
    
    // Fill business signup form
    await page.fill('[data-testid="email"]', 'test-business@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.fill('[data-testid="business-name"]', 'Test Restaurant');
    await page.fill('[data-testid="business-address"]', '123 Main St, Test City');
    
    // Submit signup
    await page.click('[data-testid="signup-submit"]');
    
    // Should redirect to business dashboard
    await expect(page).toHaveURL(/.*business/);
    
    // Create new offer
    await page.click('[data-testid="create-offer-button"]');
    
    // Fill offer form
    await page.fill('[data-testid="offer-title"]', 'Test Campaign');
    await page.fill('[data-testid="offer-description"]', 'Test campaign description');
    await page.fill('[data-testid="discount-pct"]', '20');
    await page.fill('[data-testid="meal-budget"]', '25');
    
    // Submit offer
    await page.click('[data-testid="create-offer-submit"]');
    
    // Verify offer appears in dashboard
    await expect(page.locator('[data-testid="offer-list"]')).toContainText('Test Campaign');
  });

  test('Influencer registration and approval flow', async ({ page }) => {
    // Navigate to influencer signup
    await page.goto('/auth/signup');
    
    // Select influencer role
    await page.click('[data-testid="role-influencer"]');
    
    // Fill influencer signup form
    await page.fill('[data-testid="email"]', 'test-influencer@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.fill('[data-testid="influencer-name"]', 'Test Influencer');
    await page.fill('[data-testid="instagram-handle"]', '@testinfluencer');
    
    // Submit signup
    await page.click('[data-testid="signup-submit"]');
    
    // Should redirect to influencer dashboard
    await expect(page).toHaveURL(/.*influencer/);
    
    // Verify pending approval status
    await expect(page.locator('[data-testid="approval-status"]')).toContainText('pending');
    
    // Now test admin approval
    await page.goto('/control-center/login');
    await page.fill('[data-testid="admin-email"]', process.env.ADMIN_EMAIL || 'devon@getkudjo.com');
    await page.fill('[data-testid="admin-passcode"]', process.env.ADMIN_PASSCODE || '1234567890!Dd');
    await page.click('[data-testid="admin-login-submit"]');
    
    // Navigate to influencer review
    await page.goto('/control-center/influencer-review');
    
    // Approve the influencer
    await page.click('[data-testid="approve-influencer-button"]');
    
    // Verify approval
    await expect(page.locator('[data-testid="influencer-status"]')).toContainText('approved');
  });

  test('Campaign start flow with affiliate and meal codes', async ({ page }) => {
    // Login as approved influencer
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'approved-influencer@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="signin-submit"]');
    
    // Navigate to available campaigns
    await page.goto('/influencer');
    
    // Find and start a campaign
    await page.click('[data-testid="start-campaign-button"]');
    
    // Accept legal terms
    await page.check('[data-testid="legal-acceptance"]');
    await page.click('[data-testid="join-campaign-submit"]');
    
    // Verify both codes are generated
    await expect(page.locator('[data-testid="affiliate-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="meal-code"]')).toBeVisible();
    
    // Verify QR codes are present
    await expect(page.locator('[data-testid="affiliate-qr"]')).toBeVisible();
    await expect(page.locator('[data-testid="meal-qr"]')).toBeVisible();
  });

  test('Manual redemption entry by admin', async ({ page }) => {
    // Login as admin
    await page.goto('/control-center/login');
    await page.fill('[data-testid="admin-email"]', process.env.ADMIN_EMAIL || 'devon@getkudjo.com');
    await page.fill('[data-testid="admin-passcode"]', process.env.ADMIN_PASSCODE || '1234567890!Dd');
    await page.click('[data-testid="admin-login-submit"]');
    
    // Navigate to redemptions
    await page.goto('/control-center/redemptions');
    
    // Add manual redemption
    await page.click('[data-testid="add-redemption-button"]');
    
    // Fill redemption form
    await page.fill('[data-testid="coupon-code"]', 'KU-TEST123');
    await page.fill('[data-testid="redemption-amount"]', '15.50');
    
    // Submit redemption
    await page.click('[data-testid="submit-redemption"]');
    
    // Verify redemption appears in list
    await expect(page.locator('[data-testid="redemptions-list"]')).toContainText('KU-TEST123');
    await expect(page.locator('[data-testid="redemptions-list"]')).toContainText('$15.50');
  });

  test('PDF and CSV export functionality', async ({ page }) => {
    // Login as admin
    await page.goto('/control-center/login');
    await page.fill('[data-testid="admin-email"]', process.env.ADMIN_EMAIL || 'devon@getkudjo.com');
    await page.fill('[data-testid="admin-passcode"]', process.env.ADMIN_PASSCODE || '1234567890!Dd');
    await page.click('[data-testid="admin-login-submit"]');
    
    // Navigate to dashboard
    await page.goto('/control-center/dashboard');
    
    // Test PDF export
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-pdf-button"]')
    ]);
    expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/);
    
    // Test CSV export
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv-button"]')
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('1:1 messaging system functionality', async ({ page }) => {
    // Login as business
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test-business@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="signin-submit"]');
    
    // Navigate to messages
    await page.goto('/business');
    await page.click('[data-testid="messages-tab"]');
    
    // Start new conversation
    await page.click('[data-testid="new-conversation-button"]');
    await page.fill('[data-testid="message-content"]', 'Hello, this is a test message');
    await page.click('[data-testid="send-message-button"]');
    
    // Verify message appears
    await expect(page.locator('[data-testid="message-thread"]')).toContainText('Hello, this is a test message');
  });

  test('Admin announcements system', async ({ page }) => {
    // Login as admin
    await page.goto('/control-center/login');
    await page.fill('[data-testid="admin-email"]', process.env.ADMIN_EMAIL || 'devon@getkudjo.com');
    await page.fill('[data-testid="admin-passcode"]', process.env.ADMIN_PASSCODE || '1234567890!Dd');
    await page.click('[data-testid="admin-login-submit"]');
    
    // Navigate to announcements
    await page.goto('/control-center/announcements');
    
    // Create new announcement
    await page.click('[data-testid="create-announcement-button"]');
    await page.fill('[data-testid="announcement-title"]', 'Test Announcement');
    await page.fill('[data-testid="announcement-content"]', 'This is a test announcement');
    await page.selectOption('[data-testid="target-audience"]', 'business');
    await page.click('[data-testid="create-announcement-submit"]');
    
    // Verify announcement appears
    await expect(page.locator('[data-testid="announcements-list"]')).toContainText('Test Announcement');
  });

  test('Legal compliance and UGC requirements display', async ({ page }) => {
    // Navigate to influencer dashboard
    await page.goto('/influencer');
    
    // Verify FTC disclosure banner is present
    await expect(page.locator('[data-testid="ftc-disclosure-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="ftc-disclosure-banner"]')).toContainText('FTC Disclosure Required');
    
    // Verify UGC requirements
    await expect(page.locator('[data-testid="ugc-requirements"]')).toBeVisible();
    await expect(page.locator('[data-testid="ugc-requirements"]')).toContainText('Content Requirements');
    
    // Test campaign join with legal acceptance
    await page.click('[data-testid="start-campaign-button"]');
    await expect(page.locator('[data-testid="legal-disclaimer"]')).toBeVisible();
    await expect(page.locator('[data-testid="legal-acceptance-checkbox"]')).toBeVisible();
  });

  test('No dead buttons or non-functional UI elements', async ({ page }) => {
    const pages = [
      '/control-center/dashboard',
      '/business',
      '/influencer'
    ];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Find all buttons and links
      const buttons = await page.locator('button:visible').all();
      const links = await page.locator('a:visible').all();
      
      // Verify no buttons have placeholder text or disabled state without reason
      for (const button of buttons) {
        const text = await button.textContent();
        const isDisabled = await button.isDisabled();
        
        // Check for placeholder text that indicates non-functional buttons
        expect(text).not.toMatch(/coming soon|todo|placeholder|not implemented/i);
        
        // If disabled, should have a clear reason (loading state, etc.)
        if (isDisabled) {
          const ariaLabel = await button.getAttribute('aria-label');
          const title = await button.getAttribute('title');
          expect(ariaLabel || title || text).toBeTruthy();
        }
      }
    }
  });
});
