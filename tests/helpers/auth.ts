import { Page } from '@playwright/test';

export interface TestUser {
  uid: string;
  email: string;
  password: string;
  role: 'admin' | 'business' | 'influencer';
  displayName: string;
}

export const testUsers: Record<string, TestUser> = {
  admin: {
    uid: 'test-admin-001',
    email: 'admin@kudjo.test',
    password: 'testpass123',
    role: 'admin',
    displayName: 'Test Admin'
  },
  business1: {
    uid: 'test-business-001',
    email: 'business1@kudjo.test',
    password: 'testpass123',
    role: 'business',
    displayName: 'Manual POS Business'
  },
  business2: {
    uid: 'test-business-002',
    email: 'business2@kudjo.test',
    password: 'testpass123',
    role: 'business',
    displayName: 'Square POS Business'
  },
  influencer1: {
    uid: 'test-influencer-001',
    email: 'influencer1@kudjo.test',
    password: 'testpass123',
    role: 'influencer',
    displayName: 'Small Tier Influencer'
  },
  influencer2: {
    uid: 'test-influencer-002',
    email: 'influencer2@kudjo.test',
    password: 'testpass123',
    role: 'influencer',
    displayName: 'Medium Tier Influencer'
  }
};

export async function loginAs(page: Page, userKey: keyof typeof testUsers) {
  const user = testUsers[userKey];
  
  await page.goto('/sign-in');
  
  // Fill in email and password (assuming email/password login form)
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/);
}

export async function loginAsBusiness(page: Page) {
  return loginAs(page, 'business1');
}

export async function loginAsInfluencer(page: Page) {
  return loginAs(page, 'influencer1');
}

export async function loginAsAdmin(page: Page) {
  return loginAs(page, 'admin');
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL(/sign-in/);
}
