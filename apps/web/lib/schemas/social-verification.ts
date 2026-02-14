import { z } from 'zod';

export const SocialVerificationRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'twitter']),
  handle: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'need_more_info']),
  requestedAt: z.string(),
  requestedBy: z.string(),
  followerCount: z.number().optional(),
  profileUrl: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
  adminMessage: z.string().optional(),
  processedAt: z.string().optional(),
  processedBy: z.string().optional(),
}).transform((data) => JSON.parse(JSON.stringify(data)));

export const SocialVerificationActionSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  action: z.enum(['approve', 'reject', 'need_more_info']),
  adminId: z.string().min(1, 'Admin ID is required'),
  message: z.string().optional(),
  followerCount: z.number().int().nonnegative().optional(),
}).transform((data) => JSON.parse(JSON.stringify(data)));

export type SocialVerificationRequest = z.infer<typeof SocialVerificationRequestSchema>;
export type SocialVerificationAction = z.infer<typeof SocialVerificationActionSchema>;
