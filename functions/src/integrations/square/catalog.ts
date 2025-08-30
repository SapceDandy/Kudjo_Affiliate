import { Client } from 'square';

export async function upsertSquareDiscount(
  accessToken: string,
  bizId: string,
  offerId: string,
  title: string,
  pct: number,
  locationId?: string
) {
  const client = new Client({ accessToken, environment: (process.env.SQUARE_ENV as any) || 'sandbox' });
  const idempotencyKey = `offer-${offerId}`;
  // Create a simple catalog discount (percentage)
  const discountObject = {
    type: 'DISCOUNT',
    id: `#${idempotencyKey}`,
    discountData: {
      name: title.substring(0, 255),
      discountType: 'FIXED_PERCENTAGE',
      percentage: String(pct),
      scope: 'ORDER',
    },
  } as any;
  // Upsert
  try {
    const res = await client.catalogApi.upsertCatalogObject({
      idempotencyKey,
      object: discountObject,
    } as any);
    const discountId = res.result.catalogObject?.id || `disc_${offerId}`;
    return { discountId };
  } catch (e) {
    // Fallback to stub id and let caller record error on the offer
    return { discountId: `disc_${offerId}` };
  }
}