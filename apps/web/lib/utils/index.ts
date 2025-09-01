import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Tier mapping based on follower count
export function tierMapping(followerCount: number): 'Small' | 'Medium' | 'Large' | 'XL' | 'Huge' {
  if (followerCount < 5000) return 'Small';
  if (followerCount < 25000) return 'Medium';
  if (followerCount < 100000) return 'Large';
  if (followerCount < 500000) return 'XL';
  return 'Huge';
}

// Generate URL-safe affiliate token
export function generateAffiliateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate offer data
export function validateOffer(offer: any): boolean {
  // Validate tier splits
  if (offer.tierSplits) {
    const requiredTiers = ['Small', 'Medium', 'Large', 'XL', 'Huge'];
    const hasTiers = requiredTiers.every(tier => tier in offer.tierSplits);
    if (!hasTiers) return false;
  }

  // Validate date windows
  if (offer.startAt && offer.endAt) {
    const start = new Date(offer.startAt);
    const end = new Date(offer.endAt);
    const now = new Date();
    
    if (start >= end || start < now) return false;
  }

  // Validate max influencers
  if (offer.maxInfluencers && offer.currentInfluencers) {
    if (offer.currentInfluencers >= offer.maxInfluencers) return false;
  }

  return true;
}

// Fraud detection rules
export function checkFraudRules(params: {
  ipAddress: string;
  recentRedemptions: Array<{ timestamp: Date; ipAddress: string }>;
  windowMinutes: number;
  maxPerWindow: number;
}): { blocked: boolean; reason?: string } {
  const { ipAddress, recentRedemptions, windowMinutes, maxPerWindow } = params;
  
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  const recentFromIP = recentRedemptions.filter(
    r => r.ipAddress === ipAddress && r.timestamp >= windowStart
  );

  if (recentFromIP.length >= maxPerWindow) {
    return { blocked: true, reason: 'Velocity limit exceeded' };
  }

  return { blocked: false };
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
