const { db } = require('../lib/db');
const { orders, products, profiles, transactions } = require('../db/schema');
const { eq, and, desc, sql, or } = require('drizzle-orm');
const logger = require('../utils/logger');
const { calculateTotal, getClientIP, paginationResponse, parseDecimal } = require('../utils/helpers');
const { getAdminFee, isValidPaymentMethod } = require('../config/payment');
const { validateGameTarget } = require('../config/provider');
const vipResellerService = require('../services/vipreseller');
const xenditService = require('../services/xendit');
const notificationService = require('../services/notification');

const createOrder = async (req, res) => {
  try {
    const { productId, targetId, targetServer, quantity = 1, paymentMethod } = req.body;
    const userId = req.user?.id || null;

    if (!isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: 'Product not found or inactive' });
    }

    const validation = validateGameTarget(product.provider, targetId, targetServer);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const unitPrice = parseDecimal(product.price);
    const discount = parseDecimal(product.discount);
    const adminFee = getAdminFee(paymentMethod);
    const totalPrice = calculateTotal(unitPrice, quantity, discount, adminFee);

    let userProfile = null;
    if (userId) {
      [userProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
    }

    if (paymentMethod === 'BALANCE') {
      if (!userId) {
        return res.status(401).json({ error: 'Login required for balance payment' });
      }
      
      const userBalance = parseDecimal(userProfile?.balance);
      if (userBalance < totalPrice) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
    }

    const orderData = {
      userId,
      productId: product.id,
      targetId,
      targetServer: targetServer || null,
      productName: product.name,
      productSku: product.sku,
      quantity: parseInt(quantity),
      unitPrice: unitPrice.toString(),
      discount: discount.toString(),
      adminFee: adminFee.toString(),
      totalPrice: totalPrice.toString(),
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || null,
    };

    const [newOrder] = await db
      .insert(orders)
      .values(orderData)
      .returning();

    logger.order(newOrder.orderNumber, 'Created', { productId, targetId, totalPrice, paymentMethod });

    let paymentResult = null;

    if (paymentMethod === 'BALANCE') {
      const balanceBefore = parseDecimal(userProfile.balance);
      const balanceAfter = balanceBefore - totalPrice;

      await db
        .update(profiles)
        .set({ 
          balance: balanceAfter.toString(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, userId));

      await db.insert(transactions).values({
        userId,
        orderId: newOrder.id,
        type: 'purchase',
        amount: (-totalPrice).toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        description: `Purchase: ${product.name}`,
      });

      await db
        .update(orders)
        .set({ 
          paymentStatus: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, newOrder.id));

      await processOrderToProvider(newOrder.id);

      paymentResult = { method: 'BALANCE', status: 'paid' };
    } else {
      const invoice = await xenditService.createInvoice({
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        userId,
        email: req.user?.email || null,
        amount: totalPrice,
        description: `${product.name} - ${targetId}`,
        items: [{
          name: product.name,
          quantity: parseInt(quantity),
          price: unitPrice,
        }],
      });

      if (invoice.success) {
        await db
          .update(orders)
          .set({
            paymentId: invoice.invoiceId,
            paymentUrl: invoice.invoiceUrl,
            paymentExpiredAt: invoice.expiryDate,
            paymentStatus: 'pending',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, newOrder.id));

        paymentResult = {
          method: paymentMethod,
          invoiceUrl: invoice.invoiceUrl,
          expiryDate: invoice.expiryDate,
        };
      } else {
        await db
          .update(orders)
          .set({ 
            status: 'failed',
            notes: invoice.error,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, newOrder.id));

        return res.status(500).json({ error: 'Failed to create payment' });
      }
    }

    const [createdOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, newOrder.id))
      .limit(1);

    await notificationService.notifyOrderCreated(createdOrder, userProfile?.phone);

    res.status(201).json({
      order: createdOrder,
      payment: paymentResult,
    });
  } catch (error) {
    logger.error('Failed to create order', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

const processOrderToProvider = async (orderId) => {
  try {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order || order.status !== 'pending') {
      return;
    }

    await db
      .update(orders)
      .set({ 
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    logger.order(order.orderNumber, 'Processing', { sku: order.productSku });

    const result = await vipResellerService.createOrder({
      sku: order.productSku,
      targetId: order.targetId,
      targetServer: order.targetServer,
    });

    if (result.success) {
      await db
        .update(orders)
        .set({
          providerTrxId: result.trxId,
          providerStatus: result.status,
          providerMessage: result.message,
          status: result.status === 'success' ? 'success' : 'processing',
          completedAt: result.status === 'success' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      logger.order(order.orderNumber, 'Provider order created', { trxId: result.trxId, status: result.status });
    } else {
      await db
        .update(orders)
        .set({
          status: 'failed',
          providerMessage: result.error,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      logger.order(order.orderNumber, 'Provider order failed', { error: result.error });

      if (order.paymentMethod === 'BALANCE') {
        await refundOrder(orderId);
      }
    }
  } catch (error) {
    logger.error('Failed to process order to provider', { orderId, error: error.message });
  }
};

const refundOrder = async (orderId) => {
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

    const refundAmount = parseDecimal(order.totalPrice);
    const balanceBefore = parseDecimal(profile.balance);
    const balanceAfter = balanceBefore + refundAmount;

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
      type: 'refund',
      amount: refundAmount.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      description: `Refund: ${order.orderNumber}`,
    });

    await db
      .update(orders)
      .set({ 
        status: 'refunded',
        paymentStatus: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    logger.order(order.orderNumber, 'Refunded', { amount: refundAmount });

    await notificationService.notifyRefund(order, refundAmount, profile.phone);
  } catch (error) {
    logger.error('Failed to refund order', { orderId, error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const conditions = [eq(orders.id, id)];
    
    if (userId && req.profile?.role !== 'admin') {
      conditions.push(eq(orders.userId, userId));
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Failed to get order', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
};

const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user?.id && order.userId !== req.user.id && req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Failed to get order by number', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const conditions = [eq(orders.userId, userId)];
    
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [orderList, countResult] = await Promise.all([
      db.select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(orders)
        .where(and(...conditions)),
    ]);

    const total = parseInt(countResult[0]?.count || 0);

    res.json(paginationResponse(orderList, page, limit, total));
  } catch (error) {
    logger.error('Failed to get user orders', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel paid order' });
    }

    await db
      .update(orders)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    if (order.paymentId) {
      await xenditService.expireInvoice(order.paymentId);
    }

    logger.order(order.orderNumber, 'Cancelled');
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    logger.error('Failed to cancel order', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

const checkOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.providerTrxId && order.status === 'processing') {
      const statusResult = await vipResellerService.checkStatus(order.providerTrxId);
      
      if (statusResult.success) {
        const updateData = {
          providerStatus: statusResult.status,
          providerMessage: statusResult.message,
          updatedAt: new Date(),
        };

        if (statusResult.status === 'success') {
          updateData.status = 'success';
          updateData.providerSn = statusResult.sn;
          updateData.completedAt = new Date();
        } else if (statusResult.status === 'failed') {
          updateData.status = 'failed';
        }

        await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, id));

        const [updatedOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        return res.json(updatedOrder);
      }
    }

    res.json(order);
  } catch (error) {
    logger.error('Failed to check order status', error);
    res.status(500).json({ error: 'Failed to check order status' });
  }
};

module.exports = {
  createOrder,
  processOrderToProvider,
  refundOrder,
  getOrderById,
  getOrderByNumber,
  getUserOrders,
  cancelOrder,
  checkOrderStatus,
};
