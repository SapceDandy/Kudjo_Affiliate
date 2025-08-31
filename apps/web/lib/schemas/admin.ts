import { z } from 'zod';

export const InfluencerReviewSchema = z.object({
  influencerId: z.string(),
  action: z.enum(['approve', 'reject', 'request_info']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const BulkInfluencerActionSchema = z.object({
  influencerIds: z.array(z.string()).min(1, 'Select at least one influencer'),
  action: z.enum(['approve', 'reject', 'request_info']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const InfluencerReviewQueueSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  status: z.enum(['pending', 'approved', 'rejected', 'info_requested']),
  socialMedia: z.object({
    instagram: z.object({
      username: z.string(),
      followersCount: z.number(),
      isVerified: z.boolean(),
    }).optional(),
    tiktok: z.object({
      username: z.string(),
      followersCount: z.number(),
      isVerified: z.boolean(),
    }).optional(),
  }).optional(),
  submittedAt: z.string(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewNotes: z.string().optional(),
});

export const AdminStatsSchema = z.object({
  totalInfluencers: z.number(),
  pendingReviews: z.number(),
  approvedToday: z.number(),
  rejectedToday: z.number(),
  averageReviewTime: z.number(), // hours
});

export type InfluencerReview = z.infer<typeof InfluencerReviewSchema>;
export type BulkInfluencerAction = z.infer<typeof BulkInfluencerActionSchema>;
export type InfluencerReviewQueue = z.infer<typeof InfluencerReviewQueueSchema>;
export type AdminStats = z.infer<typeof AdminStatsSchema>;
