import { tierMapping, generateAffiliateToken, validateOffer, checkFraudRules, calculateDistance } from '../../apps/web/lib/utils/index';

describe('Core Functions - Unit Tests', () => {
  
  describe('Tier Mapping', () => {
    test('maps follower counts to correct tiers', () => {
      expect(tierMapping(500)).toBe('Small');
      expect(tierMapping(2500)).toBe('Small');
      expect(tierMapping(5000)).toBe('Medium');
      expect(tierMapping(15000)).toBe('Medium');
      expect(tierMapping(50000)).toBe('Large');
      expect(tierMapping(100000)).toBe('XL');
      expect(tierMapping(500000)).toBe('Huge');
    });

    test('handles edge cases correctly', () => {
      expect(tierMapping(0)).toBe('Small');
      expect(tierMapping(-1)).toBe('Small');
      expect(tierMapping(4999)).toBe('Small');
      expect(tierMapping(5000)).toBe('Medium');
    });
  });

  describe('Affiliate Token Generator', () => {
    test('generates unique URL-safe tokens', () => {
      const token1 = generateAffiliateToken();
      const token2 = generateAffiliateToken();
      
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[a-zA-Z0-9-_]+$/);
      expect(token2).toMatch(/^[a-zA-Z0-9-_]+$/);
      expect(token1.length).toBeGreaterThan(10);
    });

    test('generates tokens without special characters', () => {
      for (let i = 0; i < 100; i++) {
        const token = generateAffiliateToken();
        expect(token).not.toMatch(/[^a-zA-Z0-9-_]/);
      }
    });
  });

  describe('Offer Validators', () => {
    test('validates tier splits sum correctly', () => {
      const validSplits = { Small: 5, Medium: 7, Large: 10, XL: 12, Huge: 15 };
      const invalidSplits = { Small: 5, Medium: 7 }; // Missing tiers
      
      expect(validateOffer({ tierSplits: validSplits })).toBe(true);
      expect(validateOffer({ tierSplits: invalidSplits })).toBe(false);
    });

    test('validates date windows', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      expect(validateOffer({ startAt: now, endAt: future })).toBe(true);
      expect(validateOffer({ startAt: future, endAt: now })).toBe(false);
      expect(validateOffer({ startAt: past, endAt: now })).toBe(false);
    });

    test('validates max influencers logic', () => {
      expect(validateOffer({ maxInfluencers: 100, currentInfluencers: 50 })).toBe(true);
      expect(validateOffer({ maxInfluencers: 50, currentInfluencers: 50 })).toBe(false);
      expect(validateOffer({ maxInfluencers: 50, currentInfluencers: 60 })).toBe(false);
    });
  });

  describe('Fraud Rules', () => {
    test('detects velocity violations', () => {
      const recentRedemptions = [
        { timestamp: new Date(), ipAddress: '192.168.1.1' },
        { timestamp: new Date(), ipAddress: '192.168.1.1' },
        { timestamp: new Date(), ipAddress: '192.168.1.1' },
        { timestamp: new Date(), ipAddress: '192.168.1.1' },
        { timestamp: new Date(), ipAddress: '192.168.1.1' }
      ];
      
      const result = checkFraudRules({
        ipAddress: '192.168.1.1',
        recentRedemptions,
        windowMinutes: 60,
        maxPerWindow: 3
      });
      
      expect(result.blocked).toBe(true);
      expect(result.reason).toMatch(/velocity/i);
    });

    test('allows normal usage patterns', () => {
      const recentRedemptions = [
        { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), ipAddress: '192.168.1.1' }
      ];
      
      const result = checkFraudRules({
        ipAddress: '192.168.1.1',
        recentRedemptions,
        windowMinutes: 60,
        maxPerWindow: 3
      });
      
      expect(result.blocked).toBe(false);
    });

    test('calculates geofence distance correctly', () => {
      const businessLocation = { latitude: 40.7128, longitude: -74.0060 }; // NYC
      const nearbyLocation = { latitude: 40.7130, longitude: -74.0062 }; // ~20m away
      const farLocation = { latitude: 41.8781, longitude: -87.6298 }; // Chicago
      
      const nearDistance = calculateDistance(
        businessLocation.latitude, businessLocation.longitude,
        nearbyLocation.latitude, nearbyLocation.longitude
      );
      
      const farDistance = calculateDistance(
        businessLocation.latitude, businessLocation.longitude,
        farLocation.latitude, farLocation.longitude
      );
      
      expect(nearDistance).toBeLessThan(0.1); // Less than 100m
      expect(farDistance).toBeGreaterThan(1000); // More than 1000km
    });
  });

  describe('Adapter Selection', () => {
    test('selects correct adapter for provider', () => {
      const { getAdapter } = require('../../apps/web/lib/pos-adapters');
      
      expect(getAdapter('square')).toBeDefined();
      expect(getAdapter('clover')).toBeDefined();
      expect(getAdapter('toast')).toBeDefined();
      expect(getAdapter('manual')).toBeDefined();
      
      // Unknown provider should fallback to manual
      expect(getAdapter('unknown')).toBe(getAdapter('manual'));
    });

    test('adapters implement required interface', () => {
      const { getAdapter } = require('../../apps/web/lib/pos-adapters');
      const squareAdapter = getAdapter('square');
      
      expect(typeof squareAdapter.createPromotion).toBe('function');
      expect(typeof squareAdapter.disablePromotion).toBe('function');
      expect(typeof squareAdapter.getPromotionStatus).toBe('function');
    });
  });
});
