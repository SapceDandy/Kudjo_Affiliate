export interface CloverConfig {
  merchantId: string;
  accessToken: string;
  environment: 'sandbox' | 'production';
}

export interface CloverOrder {
  id: string;
  total: number;
  currency: string;
  state: string;
  createdTime: number;
  modifiedTime: number;
  lineItems?: CloverLineItem[];
}

export interface CloverLineItem {
  id: string;
  name: string;
  price: number;
  unitQty?: number;
  discounts?: CloverDiscount[];
}

export interface CloverDiscount {
  id: string;
  name: string;
  amount: number;
  percentage?: number;
}

export class CloverAdapter {
  private config: CloverConfig;
  private baseUrl: string;

  constructor(config: CloverConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.clover.com'
      : 'https://sandbox.dev.clover.com';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/v3/merchants/${this.config.merchantId}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      const merchant = await this.makeRequest('/merchant');
      return { valid: !!merchant.id };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  async getOrder(orderId: string): Promise<CloverOrder | null> {
    try {
      const order = await this.makeRequest(`/orders/${orderId}`);
      return {
        id: order.id,
        total: order.total || 0,
        currency: order.currency || 'USD',
        state: order.state || 'unknown',
        createdTime: order.createdTime || Date.now(),
        modifiedTime: order.modifiedTime || Date.now(),
        lineItems: order.lineItems?.elements || []
      };
    } catch (error) {
      console.error('Error fetching Clover order:', error);
      return null;
    }
  }

  async applyCouponDiscount(
    orderId: string,
    couponCode: string,
    discountType: 'percentage' | 'fixed_amount',
    discountValue: number,
    maxDiscountCents?: number
  ): Promise<{ success: boolean; discountAmount?: number; error?: string }> {
    try {
      // Get current order
      const order = await this.getOrder(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = Math.round((order.total * discountValue) / 100);
        if (maxDiscountCents) {
          discountAmount = Math.min(discountAmount, maxDiscountCents);
        }
      } else {
        discountAmount = discountValue;
      }

      // Ensure discount doesn't exceed order total
      discountAmount = Math.min(discountAmount, order.total);

      // Create discount in Clover
      const discountData = {
        name: `Kudjo Coupon: ${couponCode}`,
        amount: discountAmount,
        percentage: discountType === 'percentage' ? discountValue * 100 : null // Clover uses basis points
      };

      const discount = await this.makeRequest(`/orders/${orderId}/discounts`, {
        method: 'POST',
        body: JSON.stringify(discountData)
      });

      return { 
        success: true, 
        discountAmount 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to apply discount' 
      };
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      return await this.makeRequest(`/payments/${paymentId}`);
    } catch (error) {
      console.error('Error fetching Clover payment:', error);
      return null;
    }
  }

  async createRefund(
    paymentId: string,
    amountCents: number,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const refundData = {
        amount: amountCents,
        fullRefund: false
      };

      const refund = await this.makeRequest(`/payments/${paymentId}/refunds`, {
        method: 'POST',
        body: JSON.stringify(refundData)
      });

      return { 
        success: true, 
        refundId: refund.id 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refund failed' 
      };
    }
  }

  async getMerchantInfo(): Promise<{ name: string; address: string; phone?: string } | null> {
    try {
      const merchant = await this.makeRequest('/merchant');
      return {
        name: merchant.name || 'Unknown Merchant',
        address: merchant.address ? 
          `${merchant.address.address1 || ''} ${merchant.address.city || ''} ${merchant.address.state || ''} ${merchant.address.zip || ''}`.trim() :
          'Unknown Address',
        phone: merchant.phoneNumber
      };
    } catch (error) {
      console.error('Error fetching Clover merchant info:', error);
      return null;
    }
  }

  async webhookHandler(payload: any): Promise<{ processed: boolean; data?: any }> {
    try {
      const { type, objectId, merchantId } = payload;
      
      if (merchantId !== this.config.merchantId) {
        return { processed: false };
      }

      switch (type) {
        case 'ORDER_UPDATED':
          const order = await this.getOrder(objectId);
          return {
            processed: true,
            data: {
              type: 'order_updated',
              orderId: objectId,
              order
            }
          };
          
        case 'PAYMENT_CREATED':
          const payment = await this.getPayment(objectId);
          return {
            processed: true,
            data: {
              type: 'payment_created',
              paymentId: objectId,
              payment
            }
          };
          
        default:
          return { processed: false };
      }
    } catch (error) {
      console.error('Error processing Clover webhook:', error);
      return { processed: false };
    }
  }
}

export default CloverAdapter;
