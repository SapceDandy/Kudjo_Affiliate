import SquareAdapter, { SquareConfig } from './square-adapter';
import CloverAdapter, { CloverConfig } from './clover-adapter';
import ToastAdapter, { ToastConfig } from './toast-adapter';

export type POSProvider = 'square' | 'clover' | 'toast';

export interface BasePOSAdapter {
  validateConnection(): Promise<{ valid: boolean; error?: string }>;
  applyCouponDiscount(
    orderId: string,
    couponCode: string,
    discountType: 'percentage' | 'fixed_amount',
    discountValue: number,
    maxDiscountCents?: number
  ): Promise<{ success: boolean; discountAmount?: number; error?: string }>;
  createRefund(
    paymentId: string,
    amountCents: number,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }>;
  webhookHandler(payload: any, signature?: string): Promise<{ processed: boolean; data?: any }>;
}

export interface POSConnectionConfig {
  provider: POSProvider;
  businessId: string;
  locationId: string;
  credentials: SquareConfig | CloverConfig | ToastConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class POSAdapterFactory {
  static createAdapter(config: POSConnectionConfig): BasePOSAdapter {
    switch (config.provider) {
      case 'square':
        return new SquareAdapter(config.credentials as SquareConfig);
      case 'clover':
        return new CloverAdapter(config.credentials as CloverConfig);
      case 'toast':
        return new ToastAdapter(config.credentials as ToastConfig);
      default:
        throw new Error(`Unsupported POS provider: ${config.provider}`);
    }
  }

  static validateConfig(provider: POSProvider, credentials: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (provider) {
      case 'square':
        if (!credentials.applicationId) errors.push('Square Application ID is required');
        if (!credentials.accessToken) errors.push('Square Access Token is required');
        if (!credentials.locationId) errors.push('Square Location ID is required');
        if (!credentials.environment || !['sandbox', 'production'].includes(credentials.environment)) {
          errors.push('Square Environment must be sandbox or production');
        }
        break;

      case 'clover':
        if (!credentials.merchantId) errors.push('Clover Merchant ID is required');
        if (!credentials.accessToken) errors.push('Clover Access Token is required');
        if (!credentials.environment || !['sandbox', 'production'].includes(credentials.environment)) {
          errors.push('Clover Environment must be sandbox or production');
        }
        break;

      case 'toast':
        if (!credentials.restaurantGuid) errors.push('Toast Restaurant GUID is required');
        if (!credentials.clientId) errors.push('Toast Client ID is required');
        if (!credentials.clientSecret) errors.push('Toast Client Secret is required');
        if (!credentials.environment || !['sandbox', 'production'].includes(credentials.environment)) {
          errors.push('Toast Environment must be sandbox or production');
        }
        break;

      default:
        errors.push(`Unsupported POS provider: ${provider}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static getProviderDisplayName(provider: POSProvider): string {
    switch (provider) {
      case 'square':
        return 'Square';
      case 'clover':
        return 'Clover';
      case 'toast':
        return 'Toast';
      default:
        return 'Unknown';
    }
  }

  static getRequiredFields(provider: POSProvider): string[] {
    switch (provider) {
      case 'square':
        return ['applicationId', 'accessToken', 'locationId', 'environment'];
      case 'clover':
        return ['merchantId', 'accessToken', 'environment'];
      case 'toast':
        return ['restaurantGuid', 'clientId', 'clientSecret', 'environment'];
      default:
        return [];
    }
  }
}

export default POSAdapterFactory;
