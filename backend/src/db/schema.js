const { pgTable, text, boolean, timestamp, varchar, decimal, integer, uuid, pgEnum, jsonb, inet, check, index } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// ============================================
// BETTER AUTH TABLES
// ============================================

const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  emailIdx: index('idx_user_email').on(table.email),
  createdAtIdx: index('idx_user_created_at').on(table.createdAt),
}));

const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_session_user_id').on(table.userId),
  tokenIdx: index('idx_session_token').on(table.token),
  expiresAtIdx: index('idx_session_expires_at').on(table.expiresAt),
}));

const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_account_user_id').on(table.userId),
  providerIdx: index('idx_account_provider').on(table.providerId),
}));

const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// APPLICATION TABLES
// ============================================

const roleEnum = pgEnum('role', ['user', 'admin', 'reseller']);

const profiles = pgTable('profiles', {
  id: text('id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  phone: varchar('phone', { length: 15 }),
  balance: decimal('balance', { precision: 15, scale: 2 }).default('0'),
  role: varchar('role', { length: 20 }).default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  balanceCheck: check('balance_check', sql`${table.balance} >= 0`),
  roleCheck: check('role_check', sql`${table.role} IN ('user', 'admin', 'reseller')`),
  roleIdx: index('idx_profiles_role').on(table.role),
  phoneIdx: index('idx_profiles_phone').on(table.phone),
}));

const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: varchar('category', { length: 50 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  sku: varchar('sku', { length: 100 }).unique(),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 15, scale: 2 }).default('0'),
  description: text('description'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  stockStatus: varchar('stock_status', { length: 20 }).default('available'),
  minQty: integer('min_qty').default(1),
  maxQty: integer('max_qty').default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  categoryIdx: index('idx_products_category').on(table.category),
  providerIdx: index('idx_products_provider').on(table.provider),
  slugIdx: index('idx_products_slug').on(table.slug),
  skuIdx: index('idx_products_sku').on(table.sku),
  isActiveIdx: index('idx_products_is_active').on(table.isActive),
  categoryActiveIdx: index('idx_products_category_active').on(table.category, table.isActive),
}));

const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  
  // Target Info
  targetId: varchar('target_id', { length: 100 }).notNull(),
  targetName: varchar('target_name', { length: 100 }),
  targetServer: varchar('target_server', { length: 50 }),
  
  // Product Snapshot
  productName: text('product_name').notNull(),
  productSku: varchar('product_sku', { length: 100 }),
  quantity: integer('quantity').default(1),
  
  // Pricing
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 15, scale: 2 }).default('0'),
  adminFee: decimal('admin_fee', { precision: 15, scale: 2 }).default('0'),
  totalPrice: decimal('total_price', { precision: 15, scale: 2 }).notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).default('pending'),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  
  // Provider Response
  providerTrxId: varchar('provider_trx_id', { length: 100 }),
  providerStatus: varchar('provider_status', { length: 50 }),
  providerSn: text('provider_sn'),
  providerMessage: text('provider_message'),
  
  // Payment Gateway
  paymentId: varchar('payment_id', { length: 100 }),
  paymentUrl: text('payment_url'),
  paymentExpiredAt: timestamp('payment_expired_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  
  // Metadata
  notes: text('notes'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('idx_orders_user_id').on(table.userId),
  orderNumberIdx: index('idx_orders_order_number').on(table.orderNumber),
  statusIdx: index('idx_orders_status').on(table.status),
  paymentStatusIdx: index('idx_orders_payment_status').on(table.paymentStatus),
  createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
  userCreatedIdx: index('idx_orders_user_created').on(table.userId, table.createdAt),
  statusCreatedIdx: index('idx_orders_status_created').on(table.status, table.createdAt),
  providerTrxIdx: index('idx_orders_provider_trx').on(table.providerTrxId),
  adminViewIdx: index('idx_orders_admin_view').on(table.status, table.paymentStatus, table.createdAt),
}));

const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  
  type: varchar('type', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }).notNull(),
  
  description: text('description'),
  referenceId: varchar('reference_id', { length: 100 }),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_transactions_user_id').on(table.userId),
  orderIdIdx: index('idx_transactions_order_id').on(table.orderId),
  typeIdx: index('idx_transactions_type').on(table.type),
  createdAtIdx: index('idx_transactions_created_at').on(table.createdAt),
  userCreatedIdx: index('idx_transactions_user_created').on(table.userId, table.createdAt),
}));

const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  valueType: varchar('value_type', { length: 20 }).default('string'),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
}, (table) => ({
  isPublicIdx: index('idx_settings_is_public').on(table.isPublic),
}));

const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  recordId: text('record_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_audit_user_id').on(table.userId),
  tableNameIdx: index('idx_audit_table_name').on(table.tableName),
  createdAtIdx: index('idx_audit_created_at').on(table.createdAt),
}));

module.exports = {
  user,
  session,
  account,
  verification,
  roleEnum,
  profiles,
  products,
  orders,
  transactions,
  settings,
  auditLogs,
};
