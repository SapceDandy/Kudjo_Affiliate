import { z } from 'zod';

export const InstagramConnectSchema = z.object({
  accessToken: z.string(),
  userId: z.string(),
});

export const TikTokConnectSchema = z.object({
  accessToken: z.string(),
  openId: z.string(),
});

export const SocialMediaDataSchema = z.object({
  platform: z.enum(['instagram', 'tiktok']),
  username: z.string(),
  followersCount: z.number(),
  isVerified: z.boolean(),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  connectedAt: z.string(),
  lastUpdated: z.string(),
});

export const AutoTierUpdateSchema = z.object({
  previousTier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  newTier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  reason: z.string(),
  socialMediaData: SocialMediaDataSchema,
});

export type InstagramConnect = z.infer<typeof InstagramConnectSchema>;
export type TikTokConnect = z.infer<typeof TikTokConnectSchema>;
export type SocialMediaData = z.infer<typeof SocialMediaDataSchema>;
export type AutoTierUpdate = z.infer<typeof AutoTierUpdateSchema>;
