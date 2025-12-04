const { db } = require('../lib/db');
const { orders, products, profiles, transactions, settings, auditLogs, user } = require('../db/schema');
const { eq, and, desc, asc, sql, gte, lte, like, or } = require('drizzle-orm');
const logger = require('../utils/logger');
const { paginationResponse, parseDecimal } = require('../utils/helpers');
const vipResellerService = require('../services/vipreseller');

const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue,
      todayRevenue,
      totalUsers,
      totalProducts,
      recentOrders,
    ] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(orders),
      db.select({ count: sql`count(*)` }).from(orders).where(gte(orders.createdAt, today)),
      db.select({ count: sql`count(*)` }).from(orders).where(eq(orders.status, 'pending')),
      db.select({ sum: sql`COALESCE(sum(total_price), 0)` }).from(orders).where(eq(orders.status, 'success')),
      db.select({ sum: sql`COALESCE(sum(total_price), 0)` })
        .from(orders)
        .where(and(eq(orders.status, 'success'), gte(orders.createdAt, today))),
      db.select({ count: sql`count(*)` }).from(user),
      db.select({ count: sql`count(*)` }).from(products).where(eq(products.isActive, true)),
      db.select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(10),
    ]);

    const stats = {
      orders: {
        total: parseInt(totalOrders[0]?.count || 0),
        today: parseInt(todayOrders[0]?.count || 0),
        pending: parseInt(pendingOrders[0]?.count || 0),
      },
      revenue: {
        total: parseDecimal(totalRevenue[0]?.sum),
        today: parseDecimal(todayRevenue[0]?.sum),
      },
      users: parseInt(totalUsers[0]?.count || 0),
      products: parseInt(totalProducts[0]?.count || 0),
    };

    let providerBalance = null;
    try {
      const profile = await vipResellerService.getProfile();
      providerBalance = parseFloat(profile?.balance) || 0;
    } catch (e) {
      logger.debug('Failed to get provider balance', { error: e.message });
    }

    res.json({
      stats,
      providerBalance,
      recentOrders,
    });
  } catch (error) {
    logger.error('Failed to get dashboard', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const conditions = [];

    if (status) {
      conditions.push(eq(orders.status, status));
    }

    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus));
    }

    if (search) {
      conditions.push(
        or(
          like(orders.orderNumber, `%${search}%`),
          like(orders.targetId, `%${search}%`),
          like(orders.productName, `%${search}%`)
        )
      );
    }

    if (startDate) {
      conditions.push(gte(orders.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(orders.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const [orderList, countResult] = await Promise.all([
      db.select()
        .from(orders)
        .where(whereClause)
        .orderBy(orderDirection(orders[sortBy] || orders.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(orders)
        .where(whereClause),
    ]);

    const total = parseInt(countResult[0]?.count || 0);

    res.json(paginationResponse(orderList, page, limit, total));
  } catch (error) {
    logger.error('Failed to get all orders', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, providerSn, providerMessage, notes } = req.body;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (['success', 'failed', 'cancelled', 'refunded'].includes(status)) {
        updateData.completedAt = new Date();
      }
    }

    if (providerSn !== undefined) {
      updateData.providerSn = providerSn;
    }

    if (providerMessage !== undefined) {
      updateData.providerMessage = providerMessage;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    logger.order(order.orderNumber, 'Admin updated', { status, by: req.user.id });

    res.json(updatedOrder);
  } catch (error) {
    logger.error('Failed to update order', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

const retryOrder = async (req, res) => {
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

    if (!['failed', 'processing'].includes(order.status)) {
      return res.status(400).json({ error: 'Only failed or processing orders can be retried' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Order payment is not completed' });
    }

    await db
      .update(orders)
      .set({ 
        status: 'pending',
        providerTrxId: null,
        providerStatus: null,
        providerSn: null,
        providerMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    const { processOrderToProvider } = require('./orderController');
    await processOrderToProvider(id);

    const [updatedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    logger.order(order.orderNumber, 'Admin retry', { by: req.user.id });

    res.json(updatedOrder);
  } catch (error) {
    logger.error('Failed to retry order', error);
    res.status(500).json({ error: 'Failed to retry order' });
  }
};

const refundOrder = async (req, res) => {
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

    if (order.status === 'refunded') {
      return res.status(400).json({ error: 'Order already refunded' });
    }

    if (!order.userId) {
      return res.status(400).json({ error: 'Cannot refund guest order' });
    }

    const { refundOrder: doRefund } = require('./orderController');
    await doRefund(id);

    const [updatedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    logger.order(order.orderNumber, 'Admin refund', { by: req.user.id });

    res.json(updatedOrder);
  } catch (error) {
    logger.error('Failed to refund order', error);
    res.status(500).json({ error: 'Failed to refund order' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const userList = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        fullName: profiles.fullName,
        phone: profiles.phone,
        balance: profiles.balance,
        role: profiles.role,
      })
      .from(user)
      .leftJoin(profiles, eq(user.id, profiles.id))
      .orderBy(desc(user.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(user);

    const total = parseInt(countResult?.count || 0);

    res.json(paginationResponse(userList, page, limit, total));
  } catch (error) {
    logger.error('Failed to get users', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'reseller'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const [updatedProfile] = await db
      .update(profiles)
      .set({ role, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();

    if (!updatedProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    logger.info('User role updated', { userId: id, role, by: req.user.id });

    res.json(updatedProfile);
  } catch (error) {
    logger.error('Failed to update user role', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

const adjustUserBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    const adjustAmount = parseFloat(amount);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const balanceBefore = parseDecimal(profile.balance);
    const balanceAfter = balanceBefore + adjustAmount;

    if (balanceAfter < 0) {
      return res.status(400).json({ error: 'Balance cannot be negative' });
    }

    await db
      .update(profiles)
      .set({ 
        balance: balanceAfter.toString(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, id));

    await db.insert(transactions).values({
      userId: id,
      type: 'adjustment',
      amount: adjustAmount.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      description: description || `Admin adjustment by ${req.user.id}`,
    });

    logger.info('User balance adjusted', { userId: id, amount: adjustAmount, by: req.user.id });

    res.json({ 
      userId: id,
      balanceBefore,
      balanceAfter,
      adjustment: adjustAmount,
    });
  } catch (error) {
    logger.error('Failed to adjust user balance', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
};

const getSettings = async (req, res) => {
  try {
    const { isPublic } = req.query;

    let settingsList;
    if (isPublic === 'true') {
      settingsList = await db
        .select()
        .from(settings)
        .where(eq(settings.isPublic, true));
    } else {
      settingsList = await db.select().from(settings);
    }

    const settingsMap = {};
    for (const s of settingsList) {
      settingsMap[s.key] = {
        value: s.value,
        valueType: s.valueType,
        description: s.description,
        isPublic: s.isPublic,
      };
    }

    res.json(settingsMap);
  } catch (error) {
    logger.error('Failed to get settings', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      await db
        .update(settings)
        .set({ 
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          updatedAt: new Date(),
          updatedBy: req.user.id,
        })
        .where(eq(settings.key, key));
    }

    logger.info('Settings updated', { keys: Object.keys(updates), by: req.user.id });

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Failed to update settings', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { tableName, action, userId, page = 1, limit = 50 } = req.query;

    const conditions = [];

    if (tableName) {
      conditions.push(eq(auditLogs.tableName, tableName));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [logList, countResult] = await Promise.all([
      db.select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(auditLogs)
        .where(whereClause),
    ]);

    const total = parseInt(countResult[0]?.count || 0);

    res.json(paginationResponse(logList, page, limit, total));
  } catch (error) {
    logger.error('Failed to get audit logs', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
};

const getProviderBalance = async (req, res) => {
  try {
    const profile = await vipResellerService.getProfile();
    res.json({
      balance: parseFloat(profile?.balance) || 0,
      ...profile,
    });
  } catch (error) {
    logger.error('Failed to get provider balance', error);
    res.status(500).json({ error: 'Failed to get provider balance' });
  }
};

module.exports = {
  getDashboard,
  getAllOrders,
  updateOrderStatus,
  retryOrder,
  refundOrder,
  getAllUsers,
  updateUserRole,
  adjustUserBalance,
  getSettings,
  updateSettings,
  getAuditLogs,
  getProviderBalance,
};
