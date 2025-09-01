// POS Adapter interface and implementations
export interface POSAdapter {
  createPromotion(offer: any): Promise<string>;
  disablePromotion(promotionId: string): Promise<void>;
  getPromotionStatus(promotionId: string): Promise<string>;
}

class ManualAdapter implements POSAdapter {
  async createPromotion(offer: any): Promise<string> {
    return `manual-promo-${Date.now()}`;
  }

  async disablePromotion(promotionId: string): Promise<void> {
    // Manual adapter - no-op
  }

  async getPromotionStatus(promotionId: string): Promise<string> {
    return 'active';
  }
}

class SquareAdapter implements POSAdapter {
  async createPromotion(offer: any): Promise<string> {
    // Mock Square API call
    return `square-promo-${Date.now()}`;
  }

  async disablePromotion(promotionId: string): Promise<void> {
    // Mock Square API call
  }

  async getPromotionStatus(promotionId: string): Promise<string> {
    return 'active';
  }
}

class CloverAdapter implements POSAdapter {
  async createPromotion(offer: any): Promise<string> {
    return `clover-promo-${Date.now()}`;
  }

  async disablePromotion(promotionId: string): Promise<void> {
    // Mock Clover API call
  }

  async getPromotionStatus(promotionId: string): Promise<string> {
    return 'active';
  }
}

class ToastAdapter implements POSAdapter {
  async createPromotion(offer: any): Promise<string> {
    return `toast-promo-${Date.now()}`;
  }

  async disablePromotion(promotionId: string): Promise<void> {
    // Mock Toast API call
  }

  async getPromotionStatus(promotionId: string): Promise<string> {
    return 'active';
  }
}

const adapters = {
  manual: new ManualAdapter(),
  square: new SquareAdapter(),
  clover: new CloverAdapter(),
  toast: new ToastAdapter()
};

export function getAdapter(provider: string): POSAdapter {
  return adapters[provider as keyof typeof adapters] || adapters.manual;
}
