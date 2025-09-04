import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

// Security tests for Firestore rules
// Based on INSTRUCTIONS.md Section 5 - Firestore Security Rules

describe('Firestore Security Rules Tests', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'kudjo-affiliate-test',
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              function isSignedIn() { return request.auth != null; }
              function uid() { return request.auth.uid; }
              function isAdmin() { return request.auth.token.admin == true; }

              match /users/{userId} {
                allow read: if isSignedIn() && (userId == uid() || isAdmin());
                allow write: if isAdmin() || (isSignedIn() && userId == uid());
              }

              match /businesses/{businessId} {
                allow read: if true;
                allow write: if isAdmin() || (isSignedIn() && businessId == uid());
              }

              match /influencers/{influencerId} {
                allow read: if isSignedIn() && (influencerId == uid() || isAdmin());
                allow write: if isAdmin() || (isSignedIn() && influencerId == uid());
              }

              match /offers/{offerId} {
                allow read: if true;
                allow write: if isAdmin() || (isSignedIn() && request.resource.data.businessId == uid());
              }

              match /coupons/{couponId} {
                allow read: if isSignedIn();
                allow write: if isAdmin();
              }

              match /redemptions/{redeemId} {
                allow read: if isAdmin() || isSignedIn();
                allow write: if isAdmin();
              }

              match /conversations/{convId} {
                allow read, write: if isAdmin() ||
                  (isSignedIn() && (resource.data.businessId == uid() || resource.data.influencerId == uid()));
                match /messages/{messageId} {
                  allow read, write: if isAdmin() || isSignedIn();
                }
              }

              match /announcements/{id} {
                allow read: if true;
                allow write: if isAdmin();
              }
            }
          }
        `
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('User Collection Security', () => {
    test('authenticated user can read own user document', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const userDoc = alice.firestore().collection('users').doc('alice');
      
      await expect(userDoc.get()).resolves.not.toThrow();
    });

    test('authenticated user cannot read other user documents', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const userDoc = alice.firestore().collection('users').doc('bob');
      
      await expect(userDoc.get()).rejects.toThrow();
    });

    test('admin can read any user document', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const userDoc = admin.firestore().collection('users').doc('alice');
      
      await expect(userDoc.get()).resolves.not.toThrow();
    });

    test('unauthenticated user cannot read user documents', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const userDoc = unauth.firestore().collection('users').doc('alice');
      
      await expect(userDoc.get()).rejects.toThrow();
    });
  });

  describe('Business Collection Security', () => {
    test('anyone can read business documents', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const businessDoc = unauth.firestore().collection('businesses').doc('business1');
      
      await expect(businessDoc.get()).resolves.not.toThrow();
    });

    test('business owner can write to own business document', async () => {
      const business = testEnv.authenticatedContext('business1');
      const businessDoc = business.firestore().collection('businesses').doc('business1');
      
      await expect(businessDoc.set({ name: 'Test Business' })).resolves.not.toThrow();
    });

    test('non-owner cannot write to business document', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const businessDoc = alice.firestore().collection('businesses').doc('business1');
      
      await expect(businessDoc.set({ name: 'Hacked Business' })).rejects.toThrow();
    });

    test('admin can write to any business document', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const businessDoc = admin.firestore().collection('businesses').doc('business1');
      
      await expect(businessDoc.set({ name: 'Admin Updated' })).resolves.not.toThrow();
    });
  });

  describe('Influencer Collection Security', () => {
    test('influencer can read own document', async () => {
      const influencer = testEnv.authenticatedContext('influencer1');
      const influencerDoc = influencer.firestore().collection('influencers').doc('influencer1');
      
      await expect(influencerDoc.get()).resolves.not.toThrow();
    });

    test('influencer cannot read other influencer documents', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const influencerDoc = alice.firestore().collection('influencers').doc('influencer1');
      
      await expect(influencerDoc.get()).rejects.toThrow();
    });

    test('admin can read any influencer document', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const influencerDoc = admin.firestore().collection('influencers').doc('influencer1');
      
      await expect(influencerDoc.get()).resolves.not.toThrow();
    });

    test('unauthenticated user cannot read influencer documents', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const influencerDoc = unauth.firestore().collection('influencers').doc('influencer1');
      
      await expect(influencerDoc.get()).rejects.toThrow();
    });
  });

  describe('Offers Collection Security', () => {
    test('anyone can read offers', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const offerDoc = unauth.firestore().collection('offers').doc('offer1');
      
      await expect(offerDoc.get()).resolves.not.toThrow();
    });

    test('business owner can create offers', async () => {
      const business = testEnv.authenticatedContext('business1');
      const offerDoc = business.firestore().collection('offers').doc('offer1');
      
      await expect(offerDoc.set({
        businessId: 'business1',
        title: 'Test Offer'
      })).resolves.not.toThrow();
    });

    test('non-owner cannot create offers for business', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const offerDoc = alice.firestore().collection('offers').doc('offer1');
      
      await expect(offerDoc.set({
        businessId: 'business1',
        title: 'Fake Offer'
      })).rejects.toThrow();
    });

    test('admin can create offers for any business', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const offerDoc = admin.firestore().collection('offers').doc('offer1');
      
      await expect(offerDoc.set({
        businessId: 'business1',
        title: 'Admin Offer'
      })).resolves.not.toThrow();
    });
  });

  describe('Coupons Collection Security', () => {
    test('authenticated user can read coupons', async () => {
      const user = testEnv.authenticatedContext('user1');
      const couponDoc = user.firestore().collection('coupons').doc('coupon1');
      
      await expect(couponDoc.get()).resolves.not.toThrow();
    });

    test('unauthenticated user cannot read coupons', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const couponDoc = unauth.firestore().collection('coupons').doc('coupon1');
      
      await expect(couponDoc.get()).rejects.toThrow();
    });

    test('only admin can write coupons', async () => {
      const user = testEnv.authenticatedContext('user1');
      const couponDoc = user.firestore().collection('coupons').doc('coupon1');
      
      await expect(couponDoc.set({ code: 'TEST123' })).rejects.toThrow();
    });

    test('admin can write coupons', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const couponDoc = admin.firestore().collection('coupons').doc('coupon1');
      
      await expect(couponDoc.set({ code: 'ADMIN123' })).resolves.not.toThrow();
    });
  });

  describe('Redemptions Collection Security', () => {
    test('authenticated user can read redemptions', async () => {
      const user = testEnv.authenticatedContext('user1');
      const redemptionDoc = user.firestore().collection('redemptions').doc('redemption1');
      
      await expect(redemptionDoc.get()).resolves.not.toThrow();
    });

    test('only admin can write redemptions', async () => {
      const user = testEnv.authenticatedContext('user1');
      const redemptionDoc = user.firestore().collection('redemptions').doc('redemption1');
      
      await expect(redemptionDoc.set({ amount: 10 })).rejects.toThrow();
    });

    test('admin can write redemptions', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const redemptionDoc = admin.firestore().collection('redemptions').doc('redemption1');
      
      await expect(redemptionDoc.set({ amount: 15 })).resolves.not.toThrow();
    });
  });

  describe('Conversations and Messages Security', () => {
    test('conversation participant can read conversation', async () => {
      const business = testEnv.authenticatedContext('business1');
      
      // First create the conversation document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv1').set({
          businessId: 'business1',
          influencerId: 'influencer1'
        });
      });

      const convDoc = business.firestore().collection('conversations').doc('conv1');
      await expect(convDoc.get()).resolves.not.toThrow();
    });

    test('non-participant cannot read conversation', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const convDoc = alice.firestore().collection('conversations').doc('conv1');
      
      await expect(convDoc.get()).rejects.toThrow();
    });

    test('conversation participant can send messages', async () => {
      const business = testEnv.authenticatedContext('business1');
      const messageDoc = business.firestore()
        .collection('conversations').doc('conv1')
        .collection('messages').doc('msg1');
      
      await expect(messageDoc.set({
        content: 'Hello',
        senderId: 'business1'
      })).resolves.not.toThrow();
    });

    test('admin can access all conversations', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const convDoc = admin.firestore().collection('conversations').doc('conv1');
      
      await expect(convDoc.get()).resolves.not.toThrow();
    });
  });

  describe('Announcements Collection Security', () => {
    test('anyone can read announcements', async () => {
      const unauth = testEnv.unauthenticatedContext();
      const announcementDoc = unauth.firestore().collection('announcements').doc('announcement1');
      
      await expect(announcementDoc.get()).resolves.not.toThrow();
    });

    test('only admin can write announcements', async () => {
      const user = testEnv.authenticatedContext('user1');
      const announcementDoc = user.firestore().collection('announcements').doc('announcement1');
      
      await expect(announcementDoc.set({
        title: 'Fake Announcement'
      })).rejects.toThrow();
    });

    test('admin can write announcements', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      const announcementDoc = admin.firestore().collection('announcements').doc('announcement1');
      
      await expect(announcementDoc.set({
        title: 'Official Announcement'
      })).resolves.not.toThrow();
    });
  });
});
