import { z } from 'zod';

// Request creation schema with UID validation
export const CreateRequestSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  influencerId: z.string().min(1, 'Influencer ID is required').refine(
    (id) => id.startsWith('inf_') || (id.length > 20 && id.includes('-')),
    'Influencer ID must be a valid Firebase UID (starts with inf_ or is a UUID)'
  ),
  influencer: z.string().optional(), // Accept both influencer and influencerName
  influencerName: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed', 'dollar', 'bogo', 'student', 'happy_hour', 'free_appetizer', 'first_time']),
  splitPct: z.number().min(1).max(100, 'Split percentage must be between 1-100'),
  userDiscountPct: z.number().min(0).max(100).optional(),
  userDiscountCents: z.number().min(0).optional(),
  minSpendCents: z.number().min(0).optional(),
  redemptionLimit: z.number().min(1).optional().nullable(),
  description: z.string().optional(),
  terms: z.string().optional(),
  exclusive: z.boolean().optional(),
});

export type CreateRequestRequest = z.infer<typeof CreateRequestSchema>;

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

// Create offer schema
export const CreateOfferSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  name: z.string().min(1, 'Offer name is required'),
  description: z.string().min(1, 'Description is required'),
  discountType: z.enum(['percentage', 'fixed', 'dollar', 'bogo', 'student', 'happy_hour', 'free_appetizer', 'first_time']),
  userDiscountPct: z.number().min(0).max(100).optional(),
  userDiscountCents: z.number().min(0).optional(),
  minSpendCents: z.number().min(0).optional(),
  splitPct: z.number().min(1).max(100, 'Split percentage must be between 1-100'),
  redemptionLimit: z.number().min(1).optional().nullable(),
  terms: z.string().optional(),
  exclusive: z.boolean().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('active'),
});

export type CreateOfferRequest = z.infer<typeof CreateOfferSchema>;
