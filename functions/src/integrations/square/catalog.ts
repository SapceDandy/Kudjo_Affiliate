import { Client } from 'square';

export async function upsertSquareDiscount(accessToken: string, bizId: string, offerId: string, title: string, pct: number) {
  const client = new Client({ accessToken, environment: 'production' as any });
  // TODO: Create or update a CatalogDiscount with reference to offerId
  // MVP: No-op stub
  return { discountId: `disc_${offerId}` };
} 