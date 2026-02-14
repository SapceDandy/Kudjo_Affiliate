import { Request, Response } from 'express';
import { z } from 'zod';
import { payoutSystem } from '../payout/payout-system';

const schema = z.object({
  payoutId: z.string().min(1),
});

export async function handleAdminPayoutProcess(req: Request, res: Response): Promise<void> {
  const { payoutId } = schema.parse(req.body);
  const user = (req as any).user as { uid: string } | undefined;

  const result = await payoutSystem.processPayoutRequest(payoutId, user?.uid || 'unknown');

  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true, payoutId });
}
