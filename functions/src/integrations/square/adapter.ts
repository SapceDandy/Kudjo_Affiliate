import { PosAdapter } from '../posAdapter';
import { upsertSquareDiscount } from './catalog';
import { Client } from 'square';

export const squareAdapter: PosAdapter = {
  async createPromotion(input) {
    const token = process.env.SQUARE_ACCESS_TOKEN || '';
    if (!token) throw new Error('Missing SQUARE_ACCESS_TOKEN');
    const { businessId, dealId, title, percentage } = input;
    const res = await upsertSquareDiscount(token, businessId, dealId, title, percentage);
    return { externalId: res.discountId };
  },
  async disablePromotion(externalId: string) {
    const token = process.env.SQUARE_ACCESS_TOKEN || '';
    if (!token) throw new Error('Missing SQUARE_ACCESS_TOKEN');

    const client = new Client({
      accessToken: token,
      environment: (process.env.SQUARE_ENV as any) || 'sandbox',
    });

    try {
      // Retrieve the catalog object to get its version
      const { result } = await client.catalogApi.retrieveCatalogObject(externalId);
      const version = result.object?.version;

      // Delete the discount object from the Square catalog
      await client.catalogApi.deleteCatalogObject(externalId);
    } catch (error: any) {
      // If the object is already deleted or not found, that's fine
      if (error?.statusCode === 404) {
        return;
      }
      console.error('Failed to disable Square promotion:', error);
      throw error;
    }
  },
};
