// Quota management for Firestore to prevent quota exceeded errors

interface QuotaTracker {
  requests: number;
  resetTime: number;
  maxRequests: number;
}

class FirestoreQuotaManager {
  private quotas = new Map<string, QuotaTracker>();
  private readonly QUOTA_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // Conservative limit

  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const quota = this.quotas.get(endpoint);

    if (!quota || now > quota.resetTime) {
      // Reset quota window
      this.quotas.set(endpoint, {
        requests: 0,
        resetTime: now + this.QUOTA_WINDOW,
        maxRequests: this.MAX_REQUESTS_PER_MINUTE
      });
      return true;
    }

    return quota.requests < quota.maxRequests;
  }

  recordRequest(endpoint: string): void {
    const quota = this.quotas.get(endpoint);
    if (quota) {
      quota.requests++;
    }
  }

  getRemainingQuota(endpoint: string): number {
    const quota = this.quotas.get(endpoint);
    if (!quota || Date.now() > quota.resetTime) {
      return this.MAX_REQUESTS_PER_MINUTE;
    }
    return Math.max(0, quota.maxRequests - quota.requests);
  }

  getTimeUntilReset(endpoint: string): number {
    const quota = this.quotas.get(endpoint);
    if (!quota) return 0;
    return Math.max(0, quota.resetTime - Date.now());
  }
}

export const quotaManager = new FirestoreQuotaManager();

// Wrapper for Firestore queries with quota checking
export async function safeFirestoreQuery<T>(
  endpoint: string,
  queryFn: () => Promise<T>
): Promise<T> {
  if (!quotaManager.canMakeRequest(endpoint)) {
    const waitTime = quotaManager.getTimeUntilReset(endpoint);
    throw new Error(`Quota exceeded for ${endpoint}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
  }

  try {
    quotaManager.recordRequest(endpoint);
    return await queryFn();
  } catch (error: any) {
    if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
      // Reset quota tracker on quota error
      quotaManager['quotas'].delete(endpoint);
      throw new Error('Firestore quota exceeded. Please try again in a few minutes.');
    }
    throw error;
  }
}
