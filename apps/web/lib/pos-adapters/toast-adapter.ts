export interface ToastConfig {
  restaurantGuid: string;
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
}

export interface ToastOrder {
  guid: string;
  entityType: string;
  externalId?: string;
  openedDate: string;
  closedDate?: string;
  modifiedDate: string;
  deletedDate?: string;
  deleted: boolean;
  businessDate: number;
  source: string;
  duration?: number;
  diningOption?: {
    guid: string;
    entityType: string;
  };
  checks: ToastCheck[];
}

export interface ToastCheck {
  guid: string;
  entityType: string;
  displayNumber: string;
  openedDate: string;
  closedDate?: string;
  modifiedDate: string;
  deletedDate?: string;
  deleted: boolean;
  selections: ToastSelection[];
  appliedDiscounts?: ToastDiscount[];
  payments?: ToastPayment[];
  totalAmount?: number;
  taxAmount?: number;
  amount?: number;
}

export interface ToastSelection {
  guid: string;
  entityType: string;
  item: {
    guid: string;
    entityType: string;
  };
  itemGroup?: {
    guid: string;
    entityType: string;
  };
  quantity: number;
  unitOfMeasure: string;
  price: number;
  seatNumber?: number;
  fulfillmentStatus?: string;
  taxAmount?: number;
  appliedDiscounts?: ToastDiscount[];
}

export interface ToastDiscount {
  guid: string;
  entityType: string;
  discount: {
    guid: string;
    entityType: string;
  };
  discountAmount: number;
  nonTaxDiscountAmount?: number;
  triggers?: any[];
  approver?: {
    guid: string;
    entityType: string;
  };
}

export interface ToastPayment {
  guid: string;
  entityType: string;
  paidDate: string;
  amount: number;
  tipAmount?: number;
  amountTendered?: number;
  cardEntryMode?: string;
  last4Digits?: string;
  paymentStatus: string;
  type: string;
}

export class ToastAdapter {
  private config: ToastConfig;
  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: ToastConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://ws-api.toasttab.com'
      : 'https://ws-sandbox-api.toasttab.com';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken || '';
    }

    const response = await fetch(`${this.baseUrl}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    if (!response.ok) {
      throw new Error(`Toast authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.token.accessToken;
    this.tokenExpiry = new Date(Date.now() + (data.token.expiresIn * 1000));
    
    return this.accessToken || '';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': this.config.restaurantGuid,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Toast API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      const restaurant = await this.makeRequest(`/config/v1/restaurants/${this.config.restaurantGuid}`);
      return { valid: !!restaurant.guid };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  async getOrder(orderGuid: string): Promise<ToastOrder | null> {
    try {
      const order = await this.makeRequest(`/orders/v2/orders/${orderGuid}`);
      return order;
    } catch (error) {
      console.error('Error fetching Toast order:', error);
      return null;
    }
  }

  async getCheck(checkGuid: string): Promise<ToastCheck | null> {
    try {
      const check = await this.makeRequest(`/orders/v2/checks/${checkGuid}`);
      return check;
    } catch (error) {
      console.error('Error fetching Toast check:', error);
      return null;
    }
  }

  async applyCouponDiscount(
    checkGuid: string,
    couponCode: string,
    discountType: 'percentage' | 'fixed_amount',
    discountValue: number,
    maxDiscountCents?: number
  ): Promise<{ success: boolean; discountAmount?: number; error?: string }> {
    try {
      // Get current check
      const check = await this.getCheck(checkGuid);
      if (!check) {
        return { success: false, error: 'Check not found' };
      }

      // Calculate check total
      const checkTotal = check.totalAmount || 0;
      
      // Calculate discount amount
      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = Math.round((checkTotal * discountValue) / 100);
        if (maxDiscountCents) {
          discountAmount = Math.min(discountAmount, maxDiscountCents);
        }
      } else {
        discountAmount = discountValue;
      }

      // Ensure discount doesn't exceed check total
      discountAmount = Math.min(discountAmount, checkTotal);

      // First, we need to get available discounts
      const discounts = await this.makeRequest(`/config/v1/discounts`);
      
      // Find or create a suitable discount
      let applicableDiscount = discounts.find((d: any) => 
        d.name && d.name.toLowerCase().includes('coupon')
      );

      if (!applicableDiscount) {
        return { 
          success: false, 
          error: 'No suitable discount configuration found in Toast POS' 
        };
      }

      // Apply discount to check
      const discountData = {
        discount: {
          guid: applicableDiscount.guid,
          entityType: 'Discount'
        },
        discountAmount: discountAmount / 100, // Toast uses dollars, not cents
        triggers: [{
          selection: {
            guid: check.selections[0]?.guid,
            entityType: 'Selection'
          }
        }]
      };

      const appliedDiscount = await this.makeRequest(`/orders/v2/checks/${checkGuid}/appliedDiscounts`, {
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

  async createRefund(
    paymentGuid: string,
    amountCents: number,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const refundData = {
        refundAmount: amountCents / 100, // Toast uses dollars
        reason: reason
      };

      const refund = await this.makeRequest(`/orders/v2/payments/${paymentGuid}/refunds`, {
        method: 'POST',
        body: JSON.stringify(refundData)
      });

      return { 
        success: true, 
        refundId: refund.guid 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refund failed' 
      };
    }
  }

  async getRestaurantInfo(): Promise<{ name: string; address: string; phone?: string } | null> {
    try {
      const restaurant = await this.makeRequest(`/config/v1/restaurants/${this.config.restaurantGuid}`);
      return {
        name: restaurant.restaurantName || 'Unknown Restaurant',
        address: restaurant.address ? 
          `${restaurant.address.address1 || ''} ${restaurant.address.city || ''} ${restaurant.address.stateCode || ''} ${restaurant.address.zipCode || ''}`.trim() :
          'Unknown Address',
        phone: restaurant.phone
      };
    } catch (error) {
      console.error('Error fetching Toast restaurant info:', error);
      return null;
    }
  }

  async getMenuItems(): Promise<any[]> {
    try {
      const menuItems = await this.makeRequest('/config/v1/menuItems');
      return menuItems || [];
    } catch (error) {
      console.error('Error fetching Toast menu items:', error);
      return [];
    }
  }

  async webhookHandler(payload: any): Promise<{ processed: boolean; data?: any }> {
    try {
      const { eventType, guid, restaurantGuid } = payload;
      
      if (restaurantGuid !== this.config.restaurantGuid) {
        return { processed: false };
      }

      switch (eventType) {
        case 'ORDER_CREATED':
        case 'ORDER_MODIFIED':
          const order = await this.getOrder(guid);
          return {
            processed: true,
            data: {
              type: 'order_updated',
              orderGuid: guid,
              order
            }
          };
          
        case 'CHECK_CREATED':
        case 'CHECK_MODIFIED':
          const check = await this.getCheck(guid);
          return {
            processed: true,
            data: {
              type: 'check_updated',
              checkGuid: guid,
              check
            }
          };
          
        default:
          return { processed: false };
      }
    } catch (error) {
      console.error('Error processing Toast webhook:', error);
      return { processed: false };
    }
  }
}

export default ToastAdapter;
