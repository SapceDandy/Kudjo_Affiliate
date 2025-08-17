import request from 'supertest';
import { app } from '../src/server';
import * as admin from 'firebase-admin';
import { z } from 'zod';

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    add: jest.fn().mockResolvedValue({ id: 'doc1' }),
  })),
  doc: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({
      exists: true,
      get: (k: string) => (k === 'bizId' ? 'b1' : null),
    }),
    update: jest.fn(),
  })),
};

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    initializeApp: jest.fn(),
    auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'u1', role: 'business' }) }),
    firestore: () => mockFirestore,
  },
}));

// Mock router dependencies
jest.mock('../src/web/roles', () => ({
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

jest.mock('../src/web/utils', () => ({
  asyncHandler: (handler: any, schema?: z.ZodType) => {
    return async (req: any, res: any, next: any) => {
      try {
        if (schema && req.method !== 'GET') {
          req.body = schema.parse(req.body);
        }
        await Promise.resolve(handler(req, res));
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: 'validation_error', details: err.flatten() });
        } else {
          next(err);
        }
      }
    };
  },
}));

// Mock QR code generation
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,MOCK'),
}));

// Mock shared utils
jest.mock('../src/utils/shared', () => ({
  generateShortCode: () => 'TEST123',
  nowIso: () => '2024-03-14T12:00:00Z',
}));

describe('API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('business.create', () => {
    it('creates business with valid data', async () => {
      const res = await request(app)
        .post('/api/business.create')
        .set('Authorization', 'Bearer test')
        .send({ name: 'Biz', address: '123', posProvider: 'manual', defaultSplitPct: 20 });
      expect(res.status).toBe(200);
      expect(res.body.bizId).toBeDefined();
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/business.create')
        .set('Authorization', 'Bearer test')
        .send({ name: 'Biz' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('validation_error');
      expect(res.body.details.fieldErrors).toBeDefined();
    });
  });

  describe('business.pos.connect', () => {
    it('connects manual POS provider', async () => {
      const res = await request(app)
        .post('/api/business.pos.connect')
        .set('Authorization', 'Bearer test')
        .send({ bizId: 'b1', provider: 'manual' });
      expect(res.status).toBe(200);
      expect(res.body.posStatus).toBe('connected');
    });

    it('handles non-existent business', async () => {
      mockFirestore.doc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({ exists: false }),
        update: jest.fn(),
      });

      const res = await request(app)
        .post('/api/business.pos.connect')
        .set('Authorization', 'Bearer test')
        .send({ bizId: 'invalid', provider: 'manual' });
      expect(res.status).toBe(404);
    });
  });

  describe('coupon.claim', () => {
    it('claims content coupon successfully', async () => {
      const res = await request(app)
        .post('/api/coupon.claim')
        .set('Authorization', 'Bearer test')
        .send({ offerId: 'o1', infId: 'i1' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe('TEST123');
      expect(res.body.qrUrl).toBe('data:image/png;base64,MOCK');
    });

    it('handles non-existent offer', async () => {
      mockFirestore.doc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({ exists: false }),
        update: jest.fn(),
      });

      const res = await request(app)
        .post('/api/coupon.claim')
        .set('Authorization', 'Bearer test')
        .send({ offerId: 'invalid', infId: 'i1' });
      expect(res.status).toBe(404);
    });
  });
}); 