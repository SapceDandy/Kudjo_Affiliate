type BucketConfig = { maxTokens: number; refillRate: number }; // refillRate = tokens per second

const BUCKET_CONFIGS: Record<string, BucketConfig> = {
  general: { maxTokens: 100, refillRate: 100 / 60 },   // 100 req/min
  auth:    { maxTokens: 10,  refillRate: 10 / 60 },     // 10 req/min
  write:   { maxTokens: 20,  refillRate: 20 / 60 },     // 20 req/min
};

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, TokenBucket>();

// Cleanup stale entries every 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      // Remove entries idle for more than 10 minutes
      if (now - bucket.lastRefill > 10 * 60 * 1000) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // Allow process to exit naturally
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function checkRateLimit(
  ip: string,
  bucketName: string
): { allowed: boolean; retryAfterMs: number } {
  ensureCleanup();

  const config = BUCKET_CONFIGS[bucketName] || BUCKET_CONFIGS.general;
  const key = `${bucketName}:${ip}`;
  const now = Date.now();

  let bucket = store.get(key);
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    store.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  // Calculate time until next token
  const retryAfterMs = Math.ceil((1 - bucket.tokens) / config.refillRate * 1000);
  return { allowed: false, retryAfterMs };
}

export function classifyRoute(pathname: string, method: string): string {
  // Auth endpoints
  if (
    pathname.includes('/login') ||
    pathname.includes('/logout') ||
    pathname.includes('/session')
  ) {
    return 'auth';
  }
  // Write operations
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    return 'write';
  }
  return 'general';
}
