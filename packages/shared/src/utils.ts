import { randomBytes, createHash } from 'crypto';

export function generateShortCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// NEW: ID Generation utilities for coupon system

/**
 * Generate a short alphanumeric abbreviation from a name
 * Takes first 4-6 characters from slugified name
 */
export function makeShortCode(name: string, length = 4): string {
  const slug = slugify(name);
  const alphanumeric = slug.replace(/[^a-z0-9]/g, '');
  return alphanumeric.substring(0, Math.max(length, 6)).toUpperCase();
}

/**
 * Convert number to base36 string with padding
 */
export function toBase36(num: number, padding = 6): string {
  return num.toString(36).toUpperCase().padStart(padding, '0');
}

/**
 * Generate a random base36 ID
 */
export function randomBase36(length = 6): string {
  const max = Math.pow(36, length) - 1;
  const random = Math.floor(Math.random() * max);
  return toBase36(random, length);
}

/**
 * Create a human-readable coupon code for POS display
 * Format: AFF-{bizShort}-{infShort}-{base36(6)} or MEAL-{bizShort}-{infShort}-{base36(6)}
 */
export function makeCouponCode(
  type: 'AFFILIATE' | 'CONTENT_MEAL',
  bizName: string,
  infName: string
): string {
  const prefix = type === 'AFFILIATE' ? 'AFF' : 'MEAL';
  const bizShort = makeShortCode(bizName, 4);
  const infShort = makeShortCode(infName, 4);
  const suffix = randomBase36(6);
  
  return `${prefix}-${bizShort}-${infShort}-${suffix}`;
}

/**
 * Generate a simple POS code (shorter alternative)
 * Format: {prefix}{base36(8)} - easier for manual entry
 */
export function makePOSCode(type: 'AFFILIATE' | 'CONTENT_MEAL'): string {
  const prefix = type === 'AFFILIATE' ? 'A' : 'M';
  const suffix = randomBase36(8);
  return `${prefix}${suffix}`;
}

/**
 * Generate a unique document ID using nanoid-style approach
 * For use as Firestore document IDs
 */
export function makeDocumentId(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a coupon stats daily document ID
 * Format: {couponId}_{YYYYMMDD}
 */
export function makeCouponStatsId(couponId: string, date: string | Date): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const formatted = dateStr.replace(/-/g, ''); // YYYYMMDD
  return `${couponId}_${formatted}`;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
} 