import { Request, Response } from 'express';
import { z } from 'zod';
import { payoutSystem, PayoutMethod } from '../payout/payout-system';

const requestSchema = z.object({
  influencerId: z.string().min(1).optional(),
  amountCents: z.number().int().min(2000),
  method: z.enum(['bank_transfer', 'paypal', 'stripe', 'check']),
  bankDetails: z
    .object({
      accountNumber: z.string().min(1),
      routingNumber: z.string().min(9).max(9),
      accountType: z.enum(['checking', 'savings']),
      bankName: z.string().min(1),
    })
    .optional(),
  paypalEmail: z.string().email().optional(),
  stripeAccountId: z.string().optional(),
});

export async function handlePayoutRequest(req: Request, res: Response): Promise<void> {
  const body = requestSchema.parse(req.body);
  const user = (req as any).user as { uid: string; role: string } | undefined;

  const influencerId = body.influencerId || user?.uid;
  if (!influencerId) {
    res.status(400).json({ error: 'validation_error' });
    return;
  }

  if (user?.role === 'influencer' && influencerId !== user.uid) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const method = body.method as PayoutMethod;

  const paymentDetails: Record<string, any> = {};
  switch (method) {
    case 'bank_transfer':
      if (!body.bankDetails) {
        res.status(400).json({ error: 'validation_error', message: 'Bank details required' });
        return;
      }
      paymentDetails.bankDetails = body.bankDetails;
      break;
    case 'paypal':
      if (!body.paypalEmail) {
        res.status(400).json({ error: 'validation_error', message: 'PayPal email required' });
        return;
      }
      paymentDetails.paypalEmail = body.paypalEmail;
      break;
    case 'stripe':
      if (!body.stripeAccountId) {
        res.status(400).json({ error: 'validation_error', message: 'Stripe account ID required' });
        return;
      }
      paymentDetails.stripeAccountId = body.stripeAccountId;
      break;
    case 'check':
      break;
  }

  const result = await payoutSystem.createPayoutRequest({
    influencerId,
    amountCents: body.amountCents,
    method,
    paymentDetails,
    createdBy: user?.uid || 'unknown',
  });

  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json({
    success: true,
    payoutId: result.payoutId,
    status: 'pending',
  });
}
