import { computeCardHash, evaluateRedemption } from '../src/fraud/rules';

describe('fraud rules', () => {
  it('computes stable sha256 card hash', () => {
    const h1 = computeCardHash('tok_abc', 'bizSalt');
    const h2 = computeCardHash('tok_abc', 'bizSalt');
    expect(h1).toEqual(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('computes different hashes for different salts', () => {
    const h1 = computeCardHash('tok_abc', 'bizSalt1');
    const h2 = computeCardHash('tok_abc', 'bizSalt2');
    expect(h1).not.toEqual(h2);
  });

  it('blocks non-positive amounts', async () => {
    const res = await evaluateRedemption({
      bizId: 'b1',
      amount: 0,
      timestamp: new Date().toISOString(),
    });
    expect(res.action).toBe('block');
    expect(res.reasons).toContain('non_positive_amount');
  });

  it('allows valid redemption', async () => {
    const res = await evaluateRedemption({
      bizId: 'b1',
      amount: 100,
      cardToken: 'tok_123',
      deviceHash: 'dev_123',
      ip: '127.0.0.1',
      geo: { lat: 37.7749, lng: -122.4194 },
      timestamp: new Date().toISOString(),
    });
    expect(res.action).toBe('allow');
    expect(res.reasons).toHaveLength(0);
  });

  it('flags redemption for review when missing data', async () => {
    const res = await evaluateRedemption({
      bizId: 'b1',
      amount: 100,
      timestamp: new Date().toISOString(),
    });
    expect(res.action).toBe('review');
    expect(res.reasons).toContain('missing_card_token');
  });
}); 