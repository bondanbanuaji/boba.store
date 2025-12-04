const { db } = require('../lib/db');
const { orders, profiles, transactions, settings } = require('../db/schema');
const { eq } = require('drizzle-orm');
const logger = require('../utils/logger');
const { parseDecimal, paginationResponse } = require('../utils/helpers');
const { paymentConfig, isValidPaymentMethod, getMinimumAmount } = require('../config/payment');
const xenditService = require('../services/xendit');
const notificationService = require('../services/notification');
const { processOrderToProvider } = require('./orderController');

const getPaymentMethods = async (req, res) => {
  try {
    const methods = {
      ewallet: paymentConfig.paymentMethods.ewallet.map(m => ({
        code: m,
        name: m.replace('ID_', ''),
        type: 'ewallet',
        fee: paymentConfig.adminFee.ewallet,
        minAmount: paymentConfig.minimumAmount.ewallet,
      })),
      virtualAccount: paymentConfig.paymentMethods.virtualAccount.map(m => ({
        code: m,
        name: `VA ${m}`,
        type: 'virtualAccount',
        fee: paymentConfig.adminFee.virtualAccount,
        minAmount: paymentConfig.minimumAmount.virtualAccount,
      })),
      qris: paymentConfig.paymentMethods.qris.map(m => ({
        code: m,
        name: 'QRIS',
        type: 'qris',
        fee: paymentConfig.adminFee.qris,
        minAmount: paymentConfig.minimumAmount.qris,
      })),
      retailOutlet: paymentConfig.paymentMethods.retailOutlet.map(m => ({
        code: m,
        name: m,
        type: 'retailOutlet',
        fee: paymentConfig.adminFee.retailOutlet,
        minAmount: paymentConfig.minimumAmount.retailOutlet,
      })),
    };

    if (req.user) {
      const [profile] = await db
        .select({ balance: profiles.balance })
        .from(profiles)
        .where(eq(profiles.id, req.user.id))
        .limit(1);

      methods.balance = [{
        code: 'BALANCE',
        name: 'Saldo Akun',
        type: 'balance',
        fee: paymentConfig.adminFee.balance,
        minAmount: 0,
        currentBalance: parseDecimal(profile?.balance),
      }];
    }

    res.json(methods);
  } catch (error) {
    logger.error('Failed to get payment methods', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        paymentUrl: orders.paymentUrl,
        paymentExpiredAt: orders.paymentExpiredAt,
        paidAt: orders.paidAt,
        totalPrice: orders.totalPrice,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentId && order.paymentStatus === 'pending') {
      const result = await xenditService.getInvoice(order.paymentId);
      if (result.success) {
        const invoiceStatus = result.invoice.status.toLowerCase();
        
        if (invoiceStatus !== order.paymentStatus) {
          await db
            .update(orders)
            .set({
              paymentStatus: invoiceStatus,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));
          
          order.paymentStatus = invoiceStatus;
        }
      }
    }

    res.json(order);
  } catch (error) {
    logger.error('Failed to get payment status', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

const topupBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod } = req.body;

    const numAmount = parseFloat(amount);

    const [minTopupSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'min_topup'))
      .limit(1);

    const [maxTopupSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'max_topup'))
      .limit(1);

    const minTopup = parseFloat(minTopupSetting?.value) || 10000;
    const maxTopup = parseFloat(maxTopupSetting?.value) || 10000000;

    if (numAmount < minTopup) {
      return res.status(400).json({ error: `Minimum top-up is ${minTopup}` });
    }

    if (numAmount > maxTopup) {
      return res.status(400).json({ error: `Maximum top-up is ${maxTopup}` });
    }

    if (!isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const minPaymentAmount = getMinimumAmount(paymentMethod);
    if (numAmount < minPaymentAmount) {
      return res.status(400).json({ error: `Minimum amount for ${paymentMethod} is ${minPaymentAmount}` });
    }

    const orderData = {
      userId,
      productId: null,
      targetId: userId,
      productName: `Top-up Saldo ${numAmount}`,
      productSku: 'TOPUP',
      quantity: 1,
      unitPrice: numAmount.toString(),
      discount: '0',
      adminFee: '0',
      totalPrice: numAmount.toString(),
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod,
    };

    const [topupOrder] = await db
      .insert(orders)
      .values(orderData)
      .returning();

    const invoice = await xenditService.createInvoice({
      orderId: topupOrder.id,
      orderNumber: topupOrder.orderNumber,
      userId,
      email: req.user.email,
      amount: numAmount,
      description: `Top-up Saldo - ${topupOrder.orderNumber}`,
    });

    if (!invoice.success) {
      await db
        .update(orders)
        .set({ status: 'failed', notes: invoice.error, updatedAt: new Date() })
        .where(eq(orders.id, topupOrder.id));
      return res.status(500).json({ error: 'Failed to create payment' });
    }

    await db
      .update(orders)
      .set({
        paymentId: invoice.invoiceId,
        paymentUrl: invoice.invoiceUrl,
        paymentExpiredAt: invoice.expiryDate,
        paymentStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, topupOrder.id));

    logger.payment('Xendit', 'Top-up invoice created', {
      userId,
      amount: numAmount,
      orderNumber: topupOrder.orderNumber,
    });

    res.status(201).json({
      order: {
        ...topupOrder,
        paymentUrl: invoice.invoiceUrl,
        paymentExpiredAt: invoice.expiryDate,
      },
      payment: {
        invoiceUrl: invoice.invoiceUrl,
        expiryDate: invoice.expiryDate,
      },
    });
  } catch (error) {
    logger.error('Failed to create topup', error);
    res.status(500).json({ error: 'Failed to create top-up' });
  }
};

const handleXenditWebhook = async (req, res) => {
  try {
    const webhookToken = req.headers['x-callback-token'];
    
    if (!xenditService.verifyWebhookToken(webhookToken)) {
      logger.warn('Invalid Xendit webhook token');
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    const payload = req.body;
    logger.payment('Xendit', 'Webhook received', { event: payload.event });

    if (payload.event === 'invoice.paid' || payload.status === 'PAID') {
      const callbackData = xenditService.processInvoiceCallback(payload);
      await handleInvoicePaid(callbackData);
    } else if (payload.event === 'invoice.expired' || payload.status === 'EXPIRED') {
      const callbackData = xenditService.processInvoiceCallback(payload);
      await handleInvoiceExpired(callbackData);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Xendit webhook error', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

const handleInvoicePaid = async (data) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paymentId, data.invoiceId))
      .limit(1);

    if (!order) {
      logger.warn('Order not found for paid invoice', { invoiceId: data.invoiceId });
      return;
    }

    if (order.paymentStatus === 'paid') {
      logger.debug('Order already marked as paid', { orderNumber: order.orderNumber });
      return;
    }

    await db
      .update(orders)
      .set({
        paymentStatus: 'paid',
        paidAt: data.paidAt || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    logger.order(order.orderNumber, 'Payment received', { amount: data.amount });

    if (order.productSku === 'TOPUP') {
      await processTopupPayment(order.id);
    } else {
      await processOrderToProvider(order.id);
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, order.userId))
      .limit(1);

    await notificationService.notifyOrderPaid(order, profile?.phone);
  } catch (error) {
    logger.error('Failed to handle invoice paid', error);
  }
};

const processTopupPayment = async (orderId) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order || !order.userId) {
      return;
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, order.userId))
      .limit(1);

    if (!profile) {
      return;
    }

    const topupAmount = parseDecimal(order.totalPrice);
    const balanceBefore = parseDecimal(profile.balance);
    const balanceAfter = balanceBefore + topupAmount;

    await db
      .update(profiles)
      .set({ 
        balance: balanceAfter.toString(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, order.userId));

    await db.insert(transactions).values({
      userId: order.userId,
      orderId: order.id,
      type: 'topup',
      amount: topupAmount.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      description: `Top-up: ${order.orderNumber}`,
    });

    await db
      .update(orders)
      .set({ 
        status: 'success',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    logger.order(order.orderNumber, 'Top-up completed', { amount: topupAmount, newBalance: balanceAfter });

    await notificationService.notifyTopupSuccess({ 
      amount: topupAmount, 
      balanceAfter 
    }, profile.phone);
  } catch (error) {
    logger.error('Failed to process topup payment', { orderId, error: error.message });
  }
};

const handleInvoiceExpired = async (data) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paymentId, data.invoiceId))
      .limit(1);

    if (!order) {
      return;
    }

    if (order.paymentStatus !== 'pending') {
      return;
    }

    await db
      .update(orders)
      .set({
        paymentStatus: 'expired',
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    logger.order(order.orderNumber, 'Payment expired');
  } catch (error) {
    logger.error('Failed to handle invoice expired', error);
  }
};

const handleVipResellerWebhook = async (req, res) => {
  try {
    const payload = req.body;
    logger.payment('VipReseller', 'Webhook received', { trxid: payload.trxid });

    const callbackData = require('../services/vipreseller').processCallback(payload);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.providerTrxId, callbackData.trxId))
      .limit(1);

    if (!order) {
      logger.warn('Order not found for provider callback', { trxId: callbackData.trxId });
      return res.json({ received: true });
    }

    const updateData = {
      providerStatus: callbackData.status,
      providerMessage: callbackData.message,
      updatedAt: new Date(),
    };

    if (callbackData.status === 'success') {
      updateData.status = 'success';
      updateData.providerSn = callbackData.sn;
      updateData.completedAt = new Date();
    } else if (callbackData.status === 'failed') {
      updateData.status = 'failed';
    }

    await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, order.id));

    logger.order(order.orderNumber, `Provider status: ${callbackData.status}`, { sn: callbackData.sn });

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, order.userId))
      .limit(1);

    if (callbackData.status === 'success') {
      await notificationService.notifyOrderSuccess({ ...order, providerSn: callbackData.sn }, profile?.phone);
    } else if (callbackData.status === 'failed') {
      await notificationService.notifyOrderFailed(order, profile?.phone);
      
      if (order.paymentMethod === 'BALANCE') {
        const { refundOrder } = require('./orderController');
        await refundOrder(order.id);
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('VipReseller webhook error', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, page = 1, limit = 20 } = req.query;

    const conditions = [eq(transactions.userId, userId)];
    
    if (type) {
      conditions.push(eq(transactions.type, type));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { and, desc, sql } = require('drizzle-orm');

    const [txList, countResult] = await Promise.all([
      db.select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(transactions)
        .where(and(...conditions)),
    ]);

    const total = parseInt(countResult[0]?.count || 0);

    res.json(paginationResponse(txList, page, limit, total));
  } catch (error) {
    logger.error('Failed to get user transactions', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};

const getUserBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const [profile] = await db
      .select({ balance: profiles.balance })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    res.json({ balance: parseDecimal(profile?.balance) });
  } catch (error) {
    logger.error('Failed to get user balance', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
};

module.exports = {
  getPaymentMethods,
  getPaymentStatus,
  topupBalance,
  handleXenditWebhook,
  handleVipResellerWebhook,
  getUserTransactions,
  getUserBalance,
};
