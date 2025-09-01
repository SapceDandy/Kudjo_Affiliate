// @ts-ignore - Missing type declarations for squareup module
import { Client, Environment } from 'squareup';

export interface SquareConfig {
  applicationId: string;
  accessToken: string;
  environment: 'sandbox' | 'production';
  locationId: string;
}

export interface POSTransaction {
  id: string;
  amount: number; // in cents
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  timestamp: Date;
  receiptUrl?: string;
  customerId?: string;
  items: POSItem[];
}

export interface POSItem {
  name: string;
  quantity: number;
  basePrice: number; // in cents
  totalPrice: number; // in cents
  discountAmount?: number; // in cents
}

export interface CouponDiscount {
  couponCode: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  maxDiscountCents?: number;
  minSpendCents?: number;
}

export class SquareAdapter {
  private client: Client;
  private config: SquareConfig;

  constructor(config: SquareConfig) {
    this.config = config;
    this.client = new Client({
      accessToken: config.accessToken,
      environment: config.environment === 'production' ? Environment.Production : Environment.Sandbox
    });
  }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      const { locationsApi } = this.client;
      const response = await locationsApi.retrieveLocation(this.config.locationId);
      
      if (response.result.location) {
        return { valid: true };
      } else {
        return { valid: false, error: 'Location not found' };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
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
      const { ordersApi } = this.client;
      
      // Get current order
      const orderResponse = await ordersApi.retrieveOrder(orderId);
      const order = orderResponse.result.order;
      
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Calculate order total
      const orderTotal = parseInt(order.totalMoney?.amount || '0');
      
      // Calculate discount amount
      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = Math.round((orderTotal * discountValue) / 100);
        if (maxDiscountCents) {
          discountAmount = Math.min(discountAmount, maxDiscountCents);
        }
      } else {
        discountAmount = discountValue;
      }

      // Ensure discount doesn't exceed order total
      discountAmount = Math.min(discountAmount, orderTotal);

      // Apply discount to order
      const updateOrderRequest = {
        order: {
          ...order,
          discounts: [
            ...(order.discounts || []),
            {
              uid: `kudjo-${couponCode}`,
              name: `Kudjo Coupon: ${couponCode}`,
              type: 'FIXED_AMOUNT',
              amountMoney: {
                amount: discountAmount.toString(),
                currency: 'USD'
              },
              metadata: {
                couponCode: couponCode,
                discountType: discountType,
                kudjo_discount_value: discountValue.toString()
              }
            }
          ],
          version: order.version
        }
      };

      const updateResponse = await ordersApi.updateOrder(orderId, updateOrderRequest);
      
      if (updateResponse.result.order) {
        return { 
          success: true, 
          discountAmount 
        };
      } else {
        return { 
          success: false, 
          error: 'Failed to apply discount' 
        };
      }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to apply discount' 
      };
    }
  }

  async getTransaction(transactionId: string): Promise<POSTransaction | null> {
    try {
      const { paymentsApi } = this.client;
      const response = await paymentsApi.getPayment(transactionId);
      const payment = response.result.payment;
      
      if (!payment) return null;

      return {
        id: payment.id || transactionId,
        amount: parseInt(payment.amountMoney?.amount || '0'),
        currency: payment.amountMoney?.currency || 'USD',
        status: this.mapSquareStatus(payment.status),
        timestamp: payment.createdAt ? new Date(payment.createdAt) : new Date(),
        receiptUrl: payment.receiptUrl,
        customerId: payment.customerId,
        items: [] // Square doesn't provide item details in payment response
      };
    } catch (error) {
      console.error('Error fetching Square transaction:', error);
      return null;
    }
  }

  async getOrderDetails(orderId: string): Promise<{ order: any; items: POSItem[] } | null> {
    try {
      const { ordersApi } = this.client;
      const response = await ordersApi.retrieveOrder(orderId);
      const order = response.result.order;
      
      if (!order) return null;

      const items: POSItem[] = (order.lineItems || []).map((item: any) => ({
        name: item.name || 'Unknown Item',
        quantity: parseInt(item.quantity || '1'),
        basePrice: parseInt(item.basePriceMoney?.amount || '0'),
        totalPrice: parseInt(item.totalMoney?.amount || '0'),
        discountAmount: item.totalDiscountMoney ? parseInt(item.totalDiscountMoney.amount) : 0
      }));

      return { order, items };
    } catch (error) {
      console.error('Error fetching Square order:', error);
      return null;
    }
  }

  async createRefund(
    paymentId: string, 
    amountCents: number, 
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const { refundsApi } = this.client;
      
      const refundRequest = {
        idempotencyKey: `kudjo-refund-${paymentId}-${Date.now()}`,
        amountMoney: {
          amount: amountCents.toString(),
          currency: 'USD'
        },
        paymentId,
        reason
      };

      const response = await refundsApi.refundPayment(refundRequest);
      const refund = response.result.refund;
      
      if (refund) {
        return { 
          success: true, 
          refundId: refund.id 
        };
      } else {
        return { 
          success: false, 
          error: 'Refund failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refund failed' 
      };
    }
  }

  async getLocationInfo(): Promise<{ name: string; address: string; phone?: string } | null> {
    try {
      const { locationsApi } = this.client;
      const response = await locationsApi.retrieveLocation(this.config.locationId);
      const location = response.result.location;
      
      if (!location) return null;

      return {
        name: location.name || 'Unknown Location',
        address: location.address ? 
          `${location.address.addressLine1 || ''} ${location.address.locality || ''} ${location.address.administrativeDistrictLevel1 || ''} ${location.address.postalCode || ''}`.trim() :
          'Unknown Address',
        phone: location.phoneNumber
      };
    } catch (error) {
      console.error('Error fetching Square location:', error);
      return null;
    }
  }

  private mapSquareStatus(status?: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    switch (status) {
      case 'COMPLETED':
        return 'completed';
      case 'PENDING':
        return 'pending';
      case 'FAILED':
      case 'CANCELED':
        return 'failed';
      default:
        return 'pending';
    }
  }

  async webhookHandler(payload: any, signature: string): Promise<{ processed: boolean; data?: any }> {
    // In production, verify webhook signature
    // For now, just process the payload
    
    try {
      const eventType = payload.type;
      const data = payload.data;
      
      switch (eventType) {
        case 'payment.updated':
          return {
            processed: true,
            data: {
              type: 'payment_updated',
              paymentId: data.object.payment.id,
              status: this.mapSquareStatus(data.object.payment.status),
              amount: parseInt(data.object.payment.amount_money?.amount || '0')
            }
          };
          
        case 'order.updated':
          return {
            processed: true,
            data: {
              type: 'order_updated',
              orderId: data.object.order.id,
              version: data.object.order.version,
              state: data.object.order.state
            }
          };
          
        default:
          return { processed: false };
      }
    } catch (error) {
      console.error('Error processing Square webhook:', error);
      return { processed: false };
    }
  }
}

export default SquareAdapter;
