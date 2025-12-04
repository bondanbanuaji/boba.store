const { Xendit, Invoice } = require('xendit-node');
const logger = require('../utils/logger');
const { paymentConfig } = require('../config/payment');
const { generateReferenceId } = require('../utils/helpers');

class XenditService {
  constructor() {
    this.config = paymentConfig.xendit;
    
    if (this.config.secretKey) {
      this.xendit = new Xendit({
        secretKey: this.config.secretKey,
      });
      this.invoiceClient = this.xendit.Invoice;
    } else {
      logger.warn('Xendit secret key not configured');
      this.xendit = null;
      this.invoiceClient = null;
    }
  }

  async createInvoice(orderData) {
    const {
      orderId,
      orderNumber,
      userId,
      email,
      amount,
      description,
      paymentMethods = [],
      items = [],
    } = orderData;

    if (!this.invoiceClient) {
      return { success: false, error: 'Xendit not configured' };
    }

    try {
      const externalId = `${orderNumber}-${Date.now()}`;
      const invoiceData = {
        externalId,
        amount: Math.round(amount),
        description: description || `Payment for order ${orderNumber}`,
        customer: email ? { email } : undefined,
        successRedirectUrl: `${this.config.successRedirectUrl}?order=${orderNumber}`,
        failureRedirectUrl: `${this.config.failureRedirectUrl}?order=${orderNumber}`,
        invoiceDuration: this.config.invoiceExpiry,
        currency: 'IDR',
        items: items.length > 0 ? items : [{
          name: description || 'Order Payment',
          quantity: 1,
          price: Math.round(amount),
        }],
        metadata: {
          orderId,
          orderNumber,
          userId,
        },
      };

      if (paymentMethods.length > 0) {
        invoiceData.paymentMethods = paymentMethods;
      }

      logger.payment('Xendit', 'Creating invoice', { orderNumber, amount });

      const invoice = await this.invoiceClient.createInvoice({
        data: invoiceData,
      });

      logger.payment('Xendit', 'Invoice created', {
        orderNumber,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoiceUrl,
      });

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoiceUrl,
        externalId: invoice.externalId,
        expiryDate: invoice.expiryDate,
        amount: invoice.amount,
      };
    } catch (error) {
      logger.error('Xendit invoice creation failed', {
        orderNumber,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getInvoice(invoiceId) {
    if (!this.invoiceClient) {
      return { success: false, error: 'Xendit not configured' };
    }

    try {
      const invoice = await this.invoiceClient.getInvoiceById({
        invoiceId,
      });

      return {
        success: true,
        invoice,
      };
    } catch (error) {
      logger.error('Failed to get Xendit invoice', { invoiceId, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async expireInvoice(invoiceId) {
    if (!this.invoiceClient) {
      return { success: false, error: 'Xendit not configured' };
    }

    try {
      const invoice = await this.invoiceClient.expireInvoice({
        invoiceId,
      });

      logger.payment('Xendit', 'Invoice expired', { invoiceId });
      return {
        success: true,
        invoice,
      };
    } catch (error) {
      logger.error('Failed to expire Xendit invoice', { invoiceId, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  verifyWebhookToken(token) {
    return token === this.config.webhookToken;
  }

  processInvoiceCallback(data) {
    const {
      id,
      external_id,
      status,
      amount,
      paid_amount,
      paid_at,
      payment_method,
      payment_channel,
      metadata,
    } = data;

    return {
      invoiceId: id,
      externalId: external_id,
      status: status?.toLowerCase() || 'unknown',
      amount,
      paidAmount: paid_amount,
      paidAt: paid_at ? new Date(paid_at) : null,
      paymentMethod: payment_method,
      paymentChannel: payment_channel,
      orderId: metadata?.orderId,
      orderNumber: metadata?.orderNumber,
      userId: metadata?.userId,
    };
  }

  processEWalletCallback(data) {
    const {
      id,
      reference_id,
      status,
      currency,
      charge_amount,
      capture_amount,
      channel_code,
      metadata,
    } = data;

    return {
      chargeId: id,
      referenceId: reference_id,
      status: status?.toLowerCase() || 'unknown',
      amount: charge_amount,
      capturedAmount: capture_amount,
      channelCode: channel_code,
      orderId: metadata?.orderId,
      orderNumber: metadata?.orderNumber,
    };
  }
}

module.exports = new XenditService();
