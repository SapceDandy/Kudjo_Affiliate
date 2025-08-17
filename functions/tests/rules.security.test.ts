import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import './setup';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'kudjo-affiliate-dev',
    firestore: {
      host: 'localhost',
      port: 8080,
      rules: readFileSync(join(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('Firestore rules', () => {
  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('users collection', () => {
    it('user can read own user doc', async () => {
      const ctx = testEnv.authenticatedContext('u1', { role: 'influencer' });
      const db = ctx.firestore();
      const ref = db.doc('users/u1');
      await testEnv.withSecurityRulesDisabled(async (ctx2) => {
        await ctx2.firestore().doc('users/u1').set({ role: 'influencer', email: 'a@b.com' });
      });
      await expect(ref.get()).toAllow();
    });

    it('user cannot read other user doc', async () => {
      const ctx = testEnv.authenticatedContext('u2', { role: 'influencer' });
      const db = ctx.firestore();
      const ref = db.doc('users/u1');
      await expect(ref.get()).toDeny();
    });

    it('admin can read any user doc', async () => {
      const ctx = testEnv.authenticatedContext('admin1', { role: 'admin' });
      const db = ctx.firestore();
      const ref = db.doc('users/u1');
      await expect(ref.get()).toAllow();
    });
  });

  describe('offers collection', () => {
    it('public can read active offers', async () => {
      const ctx = testEnv.unauthenticatedContext();
      const db = ctx.firestore();
      await testEnv.withSecurityRulesDisabled(async (ctx2) => {
        await ctx2.firestore().doc('offers/o1').set({ status: 'active' });
      });
      await expect(db.doc('offers/o1').get()).toAllow();
    });

    it('public cannot read paused offers', async () => {
      const ctx = testEnv.unauthenticatedContext();
      const db = ctx.firestore();
      await testEnv.withSecurityRulesDisabled(async (ctx2) => {
        await ctx2.firestore().doc('offers/o2').set({ status: 'paused' });
      });
      await expect(db.doc('offers/o2').get()).toDeny();
    });

    it('business can create offer', async () => {
      const ctx = testEnv.authenticatedContext('b1', { role: 'business' });
      const db = ctx.firestore();
      const ref = db.collection('offers').doc('o3');
      await expect(ref.set({
        bizId: 'b1',
        title: 'Test Offer',
        status: 'active',
        splitPct: 20,
      })).toAllow();
    });

    it('business cannot create offer for other business', async () => {
      const ctx = testEnv.authenticatedContext('b1', { role: 'business' });
      const db = ctx.firestore();
      const ref = db.collection('offers').doc('o4');
      await expect(ref.set({
        bizId: 'b2',
        title: 'Test Offer',
        status: 'active',
        splitPct: 20,
      })).toDeny();
    });
  });

  describe('contentCoupons collection', () => {
    it('influencer can claim coupon', async () => {
      const ctx = testEnv.authenticatedContext('i1', { role: 'influencer' });
      const db = ctx.firestore();
      await testEnv.withSecurityRulesDisabled(async (ctx2) => {
        await ctx2.firestore().doc('offers/o1').set({ bizId: 'b1', status: 'active' });
      });
      const ref = db.collection('contentCoupons').doc('c1');
      await expect(ref.set({
        infId: 'i1',
        offerId: 'o1',
        status: 'issued',
        code: 'TEST123',
      })).toAllow();
    });

    it('influencer cannot claim coupon for other influencer', async () => {
      const ctx = testEnv.authenticatedContext('i1', { role: 'influencer' });
      const db = ctx.firestore();
      const ref = db.collection('contentCoupons').doc('c2');
      await expect(ref.set({
        infId: 'i2',
        offerId: 'o1',
        status: 'issued',
        code: 'TEST123',
      })).toDeny();
    });

    it('business can read own coupons', async () => {
      const ctx = testEnv.authenticatedContext('b1', { role: 'business' });
      const db = ctx.firestore();
      await testEnv.withSecurityRulesDisabled(async (ctx2) => {
        await ctx2.firestore().doc('contentCoupons/c1').set({ bizId: 'b1', status: 'issued' });
      });
      await expect(db.doc('contentCoupons/c1').get()).toAllow();
    });

    it('business cannot read other business coupons', async () => {
      const ctx = testEnv.authenticatedContext('b1', { role: 'business' });
      const db = ctx.firestore();
      await testEnv.withSecurityRulesDisabled(async (ctx2) => {
        await ctx2.firestore().doc('contentCoupons/c2').set({ bizId: 'b2', status: 'issued' });
      });
      await expect(db.doc('contentCoupons/c2').get()).toDeny();
    });
  });
}); 