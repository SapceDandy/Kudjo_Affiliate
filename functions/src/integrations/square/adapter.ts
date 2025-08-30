import { PosAdapter } from '../posAdapter';
import { upsertSquareDiscount } from './catalog';

export const squareAdapter: PosAdapter = {
  async createPromotion(input) {
    const token = process.env.SQUARE_ACCESS_TOKEN || '';
    if (!token) throw new Error('Missing SQUARE_ACCESS_TOKEN');
    const { businessId, dealId, title, percentage } = input;
    const res = await upsertSquareDiscount(token, businessId, dealId, title, percentage);
    return { externalId: res.discountId };
  },
  async disablePromotion(externalId: string) {
    // TODO: call Square Catalog API to disable discount
    return;
  },
};



