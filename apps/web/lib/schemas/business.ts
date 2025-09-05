import { z } from 'zod';

export const CreateOfferSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  title: z.string().min(1, 'Title is required'),
  discountType: z.enum(['percentage', 'fixed', 'dollar', 'bogo', 'student', 'happy_hour', 'free_appetizer', 'first_time']),
  splitPct: z.number().min(1).max(100, 'Split percentage must be between 1-100'),
  userDiscountPct: z.number().min(0).max(100).optional(),
  userDiscountCents: z.number().min(0).optional(),
  minSpendCents: z.number().min(0).optional(),
  description: z.string().optional(),
  terms: z.string().optional(),
});

export type CreateOfferRequest = z.infer<typeof CreateOfferSchema>;

export const UpdateRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  status: z.enum(['pending', 'countered', 'approved', 'declined', 'closed']),
  counterOffer: z.object({
    splitPct: z.number().min(1).max(100).optional(),
    discountType: z.string().optional(),
    userDiscountPct: z.number().min(0).max(100).optional(),
    userDiscountCents: z.number().min(0).optional(),
    minSpendCents: z.number().min(0).optional(),
  }).optional(),
});

export type UpdateRequestRequest = z.infer<typeof UpdateRequestSchema>;

export const ProcessPayoutSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  programIds: z.array(z.string()).min(1, 'At least one program ID required'),
  action: z.literal('payout'),
});

export type ProcessPayoutRequest = z.infer<typeof ProcessPayoutSchema>;
