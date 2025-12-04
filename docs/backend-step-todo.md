# Tutorial Backend Lengkap - Boba.Store

> **Panduan Database & Backend** - Supabase PostgreSQL + Drizzle ORM + Better Auth

---

## Daftar Isi

1. [Setup Awal Supabase](#1-setup-awal-supabase)
2. [Database Schema](#2-database-schema)
3. [Row Level Security (RLS)](#3-row-level-security-rls)
4. [Database Functions & Triggers](#4-database-functions--triggers)
5. [Realtime Setup](#5-realtime-setup)
6. [Indexes & Optimization](#6-indexes--optimization)
7. [Seed Data](#7-seed-data)
8. [Testing & Verification](#8-testing--verification)
9. [Backup & Maintenance](#9-backup--maintenance)

---

## 1. Setup Awal Supabase

### 1.1 Membuat Project Supabase

1. Buka https://supabase.com dan login
2. Klik **New Project**
3. Isi informasi:
   - **Organization**: Pilih atau buat baru
   - **Name**: `boba-store`
   - **Database Password**: Generate password kuat (simpan!)
   - **Region**: Singapore (ap-southeast-1) - terdekat untuk Indonesia
4. Klik **Create new project** dan tunggu ~2 menit

### 1.2 Mendapatkan Connection String

Setelah project ready:

1. Buka **Project Settings** → **Database**
2. Scroll ke **Connection string**
3. Pilih **URI** dan copy connection string:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

4. Simpan ke file `backend/.env`:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### 1.3 Konfigurasi Pooler (Penting!)

Supabase menggunakan **PgBouncer** sebagai connection pooler. Untuk Drizzle ORM:

- Gunakan port `6543` (Transaction mode) untuk queries biasa
- Gunakan port `5432` (Session mode) untuk migrations

Tambahkan ke `.env`:

```env
# Untuk aplikasi (transaction mode)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# Untuk migrations (session mode) 
DATABASE_URL_MIGRATION=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

---

## 2. Database Schema

### 2.1 Konsep Schema

Project ini menggunakan **dua jenis tabel**:

1. **Better Auth Tables** - Untuk autentikasi (user, session, account, verification)
2. **Application Tables** - Untuk bisnis logic (profiles, products, orders, transactions, settings)

### 2.2 Install Drizzle ORM

Jalankan perintah berikut di terminal dari folder `backend/`:

```bash
cd backend

# Install Drizzle ORM dan dependencies
npm install drizzle-orm postgres pg dotenv
npm install -D drizzle-kit
```

### 2.3 Konfigurasi Drizzle

Buat file `backend/drizzle.config.js`:

```javascript
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_MIGRATION || process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
```

### 2.4 Buat Schema Definitions

Buat file `backend/src/db/schema.js`:

```javascript
import { pgTable, text, boolean, timestamp, varchar, decimal, integer, uuid, pgEnum, jsonb, inet, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// BETTER AUTH TABLES
// ============================================

export const user = pgTable('user', {
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

export const session = pgTable('session', {
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

export const account = pgTable('account', {
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

export const verification = pgTable('verification', {
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

// Role enum
export const roleEnum = pgEnum('role', ['user', 'admin', 'reseller']);

export const profiles = pgTable('profiles', {
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

export const products = pgTable('products', {
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
  categoryCheck: check('category_check', sql`${table.category} IN ('game', 'pulsa', 'ewallet', 'pln', 'voucher')`),
  priceCheck: check('price_check', sql`${table.price} > 0`),
  discountCheck: check('discount_check', sql`${table.discount} >= 0`),
  validDiscount: check('valid_discount', sql`${table.discount} <= ${table.price}`),
  stockStatusCheck: check('stock_status_check', sql`${table.stockStatus} IN ('available', 'limited', 'empty')`),
  minQtyCheck: check('min_qty_check', sql`${table.minQty} >= 1`),
  maxQtyCheck: check('max_qty_check', sql`${table.maxQty} >= 1`),
  validQtyRange: check('valid_qty_range', sql`${table.maxQty} >= ${table.minQty}`),
  categoryIdx: index('idx_products_category').on(table.category),
  providerIdx: index('idx_products_provider').on(table.provider),
  slugIdx: index('idx_products_slug').on(table.slug),
  skuIdx: index('idx_products_sku').on(table.sku),
  isActiveIdx: index('idx_products_is_active').on(table.isActive).where(sql`${table.isActive} = true`),
  categoryActiveIdx: index('idx_products_category_active').on(table.category, table.isActive),
}));

export const orders = pgTable('orders', {
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
  quantityCheck: check('quantity_check', sql`${table.quantity} >= 1`),
  unitPriceCheck: check('unit_price_check', sql`${table.unitPrice} >= 0`),
  discountCheck: check('discount_check', sql`${table.discount} >= 0`),
  adminFeeCheck: check('admin_fee_check', sql`${table.adminFee} >= 0`),
  totalPriceCheck: check('total_price_check', sql`${table.totalPrice} >= 0`),
  statusCheck: check('status_check', sql`${table.status} IN ('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded')`),
  paymentStatusCheck: check('payment_status_check', sql`${table.paymentStatus} IN ('unpaid', 'pending', 'paid', 'expired', 'refunded')`),
  validTotal: check('valid_total', sql`${table.totalPrice} = (${table.unitPrice} * ${table.quantity}) - ${table.discount} + ${table.adminFee}`),
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

export const transactions = pgTable('transactions', {
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
  typeCheck: check('type_check', sql`${table.type} IN ('topup', 'purchase', 'refund', 'bonus', 'adjustment')`),
  validBalanceChange: check('valid_balance_change', sql`${table.balanceAfter} = ${table.balanceBefore} + ${table.amount}`),
  userIdIdx: index('idx_transactions_user_id').on(table.userId),
  orderIdIdx: index('idx_transactions_order_id').on(table.orderId),
  typeIdx: index('idx_transactions_type').on(table.type),
  createdAtIdx: index('idx_transactions_created_at').on(table.createdAt),
  userCreatedIdx: index('idx_transactions_user_created').on(table.userId, table.createdAt),
}));

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  valueType: varchar('value_type', { length: 20 }).default('string'),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: text('updated_by').references(() => user.id, { onDelete: 'set null' }),
}, (table) => ({
  valueTypeCheck: check('value_type_check', sql`${table.valueType} IN ('string', 'number', 'boolean', 'json')`),
  isPublicIdx: index('idx_settings_is_public').on(table.isPublic).where(sql`${table.isPublic} = true`),
}));

export const auditLogs = pgTable('audit_logs', {
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
```

### 2.5 Generate dan Jalankan Migrations

Jalankan perintah berikut di terminal dari folder `backend/`:

```bash
# Generate migration files
npx drizzle-kit generate

# Push schema ke database (ini akan membuat semua tabel)
npx drizzle-kit push
```

> **✅ Keuntungan menggunakan Drizzle:**
> - Otomatis membuat semua tabel, indexes, dan constraints
> - Type-safe schema dengan TypeScript
> - Mudah di-maintain dan di-version control
> - Tidak perlu manual copy-paste SQL ke Supabase Dashboard
> - Migration history tercatat dengan baik

### 2.6 Enable Extensions (One-time Setup)

Sebelum menjalankan migrations, pastikan extensions sudah aktif. Jalankan **SEKALI** di SQL Editor Supabase:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

Atau via terminal:

```bash
# Install psql jika belum ada
# Ubuntu/Debian: sudo apt install postgresql-client
# macOS: brew install postgresql

# Connect ke database dan enable extensions
psql "$DATABASE_URL_MIGRATION" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql "$DATABASE_URL_MIGRATION" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

### 2.7 Verifikasi Schema

Cek apakah semua tabel sudah dibuat:

```bash
# Via Drizzle Studio (GUI untuk explore database)
npx drizzle-kit studio
```

Atau via SQL:

```bash
psql "$DATABASE_URL_MIGRATION" -c "\dt"
```

Seharusnya muncul tabel:
- `user`, `session`, `account`, `verification` (Better Auth)
- `profiles`, `products`, `orders`, `transactions`, `settings`, `audit_logs` (Application)

---

## 3. Row Level Security (RLS)

> **⚠️ CATATAN REVISI**
> 
> Bagian ##3 sampai ##8 direvisi untuk menggunakan **terminal command + SQL files** agar lebih cepat dan simpel.
> 
> **Alasan perubahan:**
> - Tidak perlu copy-paste SQL satu-satu ke Supabase Dashboard
> - Eksekusi batch lebih cepat (satset!)
> - Lebih mudah di-maintain dan version control
> - Menghindari human error saat copy-paste manual
> 
> **Kesulitan pendekatan lama:**
> - Terlalu banyak SQL yang harus di-copy manual
> - Kompleks dan rawan error
> - Tidak praktis untuk development workflow

### 3.1 Setup SQL Files

Buat folder untuk menyimpan SQL files:

```bash
cd backend
mkdir -p drizzle/sql
```

### 3.2 Buat File SQL - RLS & Functions

Buat file `backend/drizzle/sql/01-rls-functions.sql`:

```bash
cat > drizzle/sql/01-rls-functions.sql << 'EOF'
-- ============================================
-- RLS HELPER FUNCTIONS
-- ============================================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.get_current_user_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE current_user_id TEXT;
BEGIN
    SELECT user_id INTO current_user_id FROM "session"
    WHERE token = current_setting('request.headers', true)::json->>'x-session-token'
      AND expires_at > NOW();
    RETURN current_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.get_current_user_id();
    RETURN user_role = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN RETURN auth.get_current_user_id() IS NOT NULL; END;
$$;
EOF
```

### 3.3 Buat File SQL - Enable RLS & Policies

Buat file `backend/drizzle/sql/02-rls-policies.sql`:

```bash
cat > drizzle/sql/02-rls-policies.sql << 'EOF'
-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- USER POLICIES
CREATE POLICY "users_select_own" ON "user" FOR SELECT USING (id = auth.get_current_user_id());
CREATE POLICY "users_select_admin" ON "user" FOR SELECT USING (auth.is_admin());
CREATE POLICY "users_update_own" ON "user" FOR UPDATE USING (id = auth.get_current_user_id());

-- SESSION POLICIES
CREATE POLICY "sessions_select_own" ON "session" FOR SELECT USING (user_id = auth.get_current_user_id());
CREATE POLICY "sessions_delete_own" ON "session" FOR DELETE USING (user_id = auth.get_current_user_id());

-- ACCOUNT POLICIES
CREATE POLICY "accounts_select_own" ON "account" FOR SELECT USING (user_id = auth.get_current_user_id());

-- PROFILES POLICIES
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.get_current_user_id());
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (auth.is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.get_current_user_id());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (auth.is_admin());

-- PRODUCTS POLICIES (public read for active)
CREATE POLICY "products_select_public" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "products_select_admin" ON products FOR SELECT USING (auth.is_admin());
CREATE POLICY "products_insert_admin" ON products FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY "products_update_admin" ON products FOR UPDATE USING (auth.is_admin());
CREATE POLICY "products_delete_admin" ON products FOR DELETE USING (auth.is_admin());

-- ORDERS POLICIES
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (user_id = auth.get_current_user_id());
CREATE POLICY "orders_select_admin" ON orders FOR SELECT USING (auth.is_admin());
CREATE POLICY "orders_insert_auth" ON orders FOR INSERT WITH CHECK (auth.is_authenticated() AND user_id = auth.get_current_user_id());
CREATE POLICY "orders_update_own" ON orders FOR UPDATE USING (user_id = auth.get_current_user_id() AND status = 'pending');
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (auth.is_admin());

-- TRANSACTIONS POLICIES
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (user_id = auth.get_current_user_id());
CREATE POLICY "transactions_select_admin" ON transactions FOR SELECT USING (auth.is_admin());

-- SETTINGS POLICIES
CREATE POLICY "settings_select_public" ON settings FOR SELECT USING (is_public = TRUE);
CREATE POLICY "settings_select_admin" ON settings FOR SELECT USING (auth.is_admin());
CREATE POLICY "settings_all_admin" ON settings FOR ALL USING (auth.is_admin());

-- AUDIT LOGS POLICIES
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT USING (auth.is_admin());
EOF
```

### 3.4 Jalankan RLS Setup via Terminal

```bash
# Load env dan jalankan SQL files
cd backend
source .env 2>/dev/null || export $(cat .env | xargs)

# Jalankan RLS functions
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/01-rls-functions.sql

# Jalankan RLS policies
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/02-rls-policies.sql
```

> **Catatan:** Backend Express menggunakan service role connection yang bypass RLS, jadi RLS hanya berlaku untuk direct Supabase client access.

---

## 4. Database Functions & Triggers

### 4.1 Buat File SQL - Triggers

Buat file `backend/drizzle/sql/03-triggers.sql`:

```bash
cat > drizzle/sql/03-triggers.sql << 'EOF'
-- ============================================
-- AUTO UPDATE TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_updated_at BEFORE UPDATE ON "session" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON "account" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verification_updated_at BEFORE UPDATE ON "verification" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTO CREATE PROFILE
-- ============================================
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, created_at) VALUES (NEW.id, NEW.name, NOW()) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created AFTER INSERT ON "user" FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ============================================
-- ORDER NUMBER GENERATOR
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE new_order_number TEXT; counter INTEGER := 0;
BEGIN
    LOOP
        new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN RETURN new_order_number; END IF;
        counter := counter + 1;
        IF counter > 100 THEN RAISE EXCEPTION 'Could not generate unique order number'; END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_order_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN NEW.order_number := generate_order_number(); END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_order_insert BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- ============================================
-- BALANCE TRANSACTION
-- ============================================
CREATE OR REPLACE FUNCTION process_balance_transaction(
    p_user_id TEXT, p_type VARCHAR(20), p_amount DECIMAL(15,2),
    p_description TEXT DEFAULT NULL, p_order_id UUID DEFAULT NULL, p_reference_id VARCHAR(100) DEFAULT NULL
) RETURNS transactions AS $$
DECLARE v_current_balance DECIMAL(15,2); v_new_balance DECIMAL(15,2); v_transaction transactions;
BEGIN
    SELECT balance INTO v_current_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF v_current_balance IS NULL THEN RAISE EXCEPTION 'User profile not found: %', p_user_id; END IF;
    v_new_balance := v_current_balance + p_amount;
    IF p_type = 'purchase' AND v_new_balance < 0 THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    UPDATE profiles SET balance = v_new_balance, updated_at = NOW() WHERE id = p_user_id;
    INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after, description, reference_id)
    VALUES (p_user_id, p_order_id, p_type, p_amount, v_current_balance, v_new_balance, p_description, p_reference_id)
    RETURNING * INTO v_transaction;
    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORDER STATUS UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID, p_new_status VARCHAR(20), p_payment_status VARCHAR(20) DEFAULT NULL,
    p_provider_trx_id VARCHAR(100) DEFAULT NULL, p_provider_status VARCHAR(50) DEFAULT NULL,
    p_provider_sn TEXT DEFAULT NULL, p_provider_message TEXT DEFAULT NULL
) RETURNS orders AS $$
DECLARE v_order orders; v_old_status VARCHAR(20); v_valid_transitions TEXT[];
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found: %', p_order_id; END IF;
    v_old_status := v_order.status;
    v_valid_transitions := CASE v_old_status
        WHEN 'pending' THEN ARRAY['processing', 'cancelled', 'failed']
        WHEN 'processing' THEN ARRAY['success', 'failed']
        WHEN 'failed' THEN ARRAY['refunded', 'processing']
        WHEN 'success' THEN ARRAY['refunded']
        ELSE ARRAY[]::TEXT[] END;
    IF NOT (p_new_status = ANY(v_valid_transitions)) THEN RAISE EXCEPTION 'Invalid transition: % -> %', v_old_status, p_new_status; END IF;
    UPDATE orders SET status = p_new_status, payment_status = COALESCE(p_payment_status, payment_status),
        provider_trx_id = COALESCE(p_provider_trx_id, provider_trx_id), provider_status = COALESCE(p_provider_status, provider_status),
        provider_sn = COALESCE(p_provider_sn, provider_sn), provider_message = COALESCE(p_provider_message, provider_message),
        completed_at = CASE WHEN p_new_status IN ('success','failed','cancelled','refunded') THEN NOW() ELSE completed_at END, updated_at = NOW()
    WHERE id = p_order_id RETURNING * INTO v_order;
    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE OR REPLACE FUNCTION log_audit_changes() RETURNS TRIGGER AS $$
DECLARE v_old_values JSONB; v_new_values JSONB; v_action VARCHAR(50); v_record_id TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN v_action := 'INSERT'; v_old_values := NULL; v_new_values := to_jsonb(NEW); v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN v_action := 'UPDATE'; v_old_values := to_jsonb(OLD); v_new_values := to_jsonb(NEW); v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'DELETE' THEN v_action := 'DELETE'; v_old_values := to_jsonb(OLD); v_new_values := NULL; v_record_id := OLD.id::TEXT; END IF;
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (auth.get_current_user_id(), v_action, TG_TABLE_NAME, v_record_id, v_old_values, v_new_values);
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_orders_changes AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER audit_transactions_changes AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER audit_profiles_changes AFTER UPDATE ON profiles FOR EACH ROW WHEN (OLD.balance IS DISTINCT FROM NEW.balance OR OLD.role IS DISTINCT FROM NEW.role) EXECUTE FUNCTION log_audit_changes();

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS INTEGER AS $$
DECLARE v_deleted_count INTEGER;
BEGIN DELETE FROM "session" WHERE expires_at < NOW() RETURNING COUNT(*) INTO v_deleted_count; RETURN v_deleted_count; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_verifications() RETURNS INTEGER AS $$
DECLARE v_deleted_count INTEGER;
BEGIN DELETE FROM verification WHERE expires_at < NOW() RETURNING COUNT(*) INTO v_deleted_count; RETURN v_deleted_count; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
EOF
```

### 4.2 Jalankan Triggers via Terminal

```bash
cd backend
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/03-triggers.sql
```

---

## 5. Realtime Setup

### 5.1 Buat File SQL - Realtime

```bash
cat > drizzle/sql/04-realtime.sql << 'EOF'
-- Enable realtime untuk tabel yang perlu live update
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
EOF
```

### 5.2 Jalankan Realtime Setup

```bash
cd backend
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/04-realtime.sql
```

### 5.3 Frontend Integration (Opsional)

Contoh penggunaan realtime di frontend:

```javascript
// frontend/src/lib/realtime.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

export function subscribeToOrderUpdates(userId, onUpdate) {
  return supabase.channel('order-updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, (payload) => onUpdate(payload.new))
    .subscribe();
}
```

---

## 6. Indexes & Optimization

### 6.1 Buat File SQL - Indexes

> **Catatan:** Index dasar sudah ada di schema Drizzle. Ini untuk partial indexes tambahan.

```bash
cat > drizzle/sql/05-indexes.sql << 'EOF'
-- Partial indexes untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_needs_action ON orders(created_at DESC) WHERE status IN ('pending', 'processing') AND payment_status = 'paid';
CREATE INDEX IF NOT EXISTS idx_products_game_active ON products(provider, name) WHERE category = 'game' AND is_active = TRUE;

-- Update statistics
ANALYZE "user"; ANALYZE "session"; ANALYZE profiles; ANALYZE products; ANALYZE orders; ANALYZE transactions;
EOF
```

### 6.2 Jalankan Indexes

```bash
cd backend
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/05-indexes.sql
```

---

## 7. Seed Data

### 7.1 Buat File SQL - Seed

```bash
cat > drizzle/sql/06-seed.sql << 'EOF'
-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (key, value, value_type, description, is_public) VALUES
    ('admin_fee', '1000', 'number', 'Biaya admin per transaksi', true),
    ('min_topup', '10000', 'number', 'Minimum top-up saldo', true),
    ('max_topup', '10000000', 'number', 'Maximum top-up saldo', true),
    ('maintenance_mode', 'false', 'boolean', 'Mode maintenance', true),
    ('maintenance_message', 'Sistem sedang dalam perbaikan', 'string', 'Pesan maintenance', true),
    ('contact_whatsapp', '6281234567890', 'string', 'Nomor WhatsApp CS', true),
    ('contact_email', 'support@boba.store', 'string', 'Email support', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - MOBILE LEGENDS
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('game', 'mobile-legends', '86 Diamonds', 'ml-86-dm', 'ML86', 20000, 0, '86 Diamonds ML', true),
    ('game', 'mobile-legends', '172 Diamonds', 'ml-172-dm', 'ML172', 40000, 2000, '172 Diamonds ML', true),
    ('game', 'mobile-legends', '257 Diamonds', 'ml-257-dm', 'ML257', 58000, 3000, '257 Diamonds ML', true),
    ('game', 'mobile-legends', '344 Diamonds', 'ml-344-dm', 'ML344', 76000, 4000, '344 Diamonds ML', true),
    ('game', 'mobile-legends', '514 Diamonds', 'ml-514-dm', 'ML514', 112000, 6000, '514 Diamonds ML', true),
    ('game', 'mobile-legends', 'Starlight', 'ml-starlight', 'MLSTAR', 150000, 5000, 'Starlight Member', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - FREE FIRE
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('game', 'free-fire', '70 Diamonds', 'ff-70-dm', 'FF70', 15000, 0, '70 Diamonds FF', true),
    ('game', 'free-fire', '140 Diamonds', 'ff-140-dm', 'FF140', 29000, 1500, '140 Diamonds FF', true),
    ('game', 'free-fire', '355 Diamonds', 'ff-355-dm', 'FF355', 72000, 4000, '355 Diamonds FF', true),
    ('game', 'free-fire', '720 Diamonds', 'ff-720-dm', 'FF720', 145000, 8000, '720 Diamonds FF', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - PULSA
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('pulsa', 'telkomsel', 'Pulsa 10K', 'tsel-10k', 'TSEL10', 11500, 500, 'Pulsa Telkomsel 10K', true),
    ('pulsa', 'telkomsel', 'Pulsa 25K', 'tsel-25k', 'TSEL25', 26500, 1000, 'Pulsa Telkomsel 25K', true),
    ('pulsa', 'telkomsel', 'Pulsa 50K', 'tsel-50k', 'TSEL50', 51500, 2000, 'Pulsa Telkomsel 50K', true),
    ('pulsa', 'indosat', 'Pulsa 10K', 'isat-10k', 'ISAT10', 11200, 500, 'Pulsa Indosat 10K', true),
    ('pulsa', 'indosat', 'Pulsa 25K', 'isat-25k', 'ISAT25', 26000, 1000, 'Pulsa Indosat 25K', true),
    ('pulsa', 'xl', 'Pulsa 10K', 'xl-10k', 'XL10', 11300, 500, 'Pulsa XL 10K', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - E-WALLET
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('ewallet', 'dana', 'DANA 25K', 'dana-25k', 'DANA25', 26000, 500, 'Saldo DANA 25K', true),
    ('ewallet', 'dana', 'DANA 50K', 'dana-50k', 'DANA50', 51000, 1000, 'Saldo DANA 50K', true),
    ('ewallet', 'gopay', 'GoPay 25K', 'gopay-25k', 'GOPAY25', 26000, 500, 'Saldo GoPay 25K', true),
    ('ewallet', 'gopay', 'GoPay 50K', 'gopay-50k', 'GOPAY50', 51000, 1000, 'Saldo GoPay 50K', true),
    ('ewallet', 'ovo', 'OVO 25K', 'ovo-25k', 'OVO25', 26000, 500, 'Saldo OVO 25K', true),
    ('ewallet', 'shopeepay', 'ShopeePay 25K', 'spay-25k', 'SPAY25', 26000, 500, 'Saldo ShopeePay 25K', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();
EOF
```

### 7.2 Jalankan Seed Data

```bash
cd backend
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/06-seed.sql
```

### 7.3 Set Admin User (setelah register via app)

```bash
# Ganti email dengan admin yang sudah register
psql "$DATABASE_URL_MIGRATION" -c "UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM \"user\" WHERE email = 'admin@boba.store');"
```

---

## 8. Testing & Verification

### 8.1 One-Command Full Setup

Buat script untuk jalankan semua SQL sekaligus:

```bash
cat > drizzle/sql/run-all.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Running all SQL migrations..."

# Load env
source .env 2>/dev/null || export $(cat .env | xargs)

# Run all SQL files in order
for file in drizzle/sql/0*.sql; do
    echo "📄 Running $file..."
    psql "$DATABASE_URL_MIGRATION" -f "$file"
done

echo "✅ All migrations completed!"
EOF

chmod +x drizzle/sql/run-all.sh
```

### 8.2 Jalankan Full Setup

```bash
cd backend

# Jalankan semua SQL sekaligus
./drizzle/sql/run-all.sh
```

### 8.3 Verifikasi Setup

```bash
cd backend

# Cek semua tabel
psql "$DATABASE_URL_MIGRATION" -c "\dt"

# Cek functions
psql "$DATABASE_URL_MIGRATION" -c "\df auth.*"
psql "$DATABASE_URL_MIGRATION" -c "\df public.*"

# Cek RLS policies
psql "$DATABASE_URL_MIGRATION" -c "SELECT tablename, policyname FROM pg_policies ORDER BY tablename;"

# Cek products terisi
psql "$DATABASE_URL_MIGRATION" -c "SELECT COUNT(*) as total_products FROM products;"

# Cek settings terisi
psql "$DATABASE_URL_MIGRATION" -c "SELECT key, value FROM settings ORDER BY key;"

# Cek realtime enabled
psql "$DATABASE_URL_MIGRATION" -c "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

### 8.4 Test Functions

```bash
cd backend

# Test generate order number
psql "$DATABASE_URL_MIGRATION" -c "SELECT generate_order_number();"

# Test cleanup (harusnya return 0 jika tidak ada expired)
psql "$DATABASE_URL_MIGRATION" -c "SELECT cleanup_expired_sessions();"
```

### 8.5 Drizzle Studio (GUI)

Untuk explore database dengan visual:

```bash
cd backend
npx drizzle-kit studio
```

---

## Ringkasan Quick Commands

```bash
# === FULL SETUP (dari awal) ===
cd backend
npm install drizzle-orm postgres pg dotenv
npm install -D drizzle-kit

# Push schema Drizzle
npx drizzle-kit push

# Jalankan semua SQL
./drizzle/sql/run-all.sh

# === INDIVIDUAL COMMANDS ===
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/01-rls-functions.sql
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/02-rls-policies.sql
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/03-triggers.sql
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/04-realtime.sql
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/05-indexes.sql
psql "$DATABASE_URL_MIGRATION" -f drizzle/sql/06-seed.sql

# === VERIFY ===
psql "$DATABASE_URL_MIGRATION" -c "\dt"
npx drizzle-kit studio
```

## 9. Backup & Maintenance

### 9.1 Daily Cleanup Job

```sql
-- ============================================
-- MAINTENANCE: Setup Scheduled Cleanup
-- ============================================

-- Supabase mendukung pg_cron untuk scheduled jobs
-- Enable extension (minta ke Supabase support jika belum aktif)

-- Cleanup expired sessions (jalankan setiap jam)
SELECT cron.schedule(
    'cleanup-sessions',
    '0 * * * *',  -- Every hour
    $$SELECT cleanup_expired_sessions()$$
);

-- Cleanup expired verifications (jalankan setiap 6 jam)
SELECT cron.schedule(
    'cleanup-verifications',
    '0 */6 * * *',  -- Every 6 hours
    $$SELECT cleanup_expired_verifications()$$
);

-- Vacuum analyze (jalankan setiap malam)
SELECT cron.schedule(
    'nightly-vacuum',
    '0 3 * * *',  -- 3 AM daily
    $$VACUUM ANALYZE$$
);
```

### 9.2 Manual Backup

```sql
-- ============================================
-- BACKUP: Export important data
-- ============================================

-- Export users (tanpa password)
COPY (
    SELECT u.id, u.name, u.email, u.email_verified, u.created_at,
           p.full_name, p.phone, p.balance, p.role
    FROM "user" u
    LEFT JOIN profiles p ON u.id = p.id
) TO '/tmp/users_backup.csv' WITH CSV HEADER;

-- Export products
COPY products TO '/tmp/products_backup.csv' WITH CSV HEADER;

-- Export settings
COPY settings TO '/tmp/settings_backup.csv' WITH CSV HEADER;
```

### 9.3 Performance Monitoring

```sql
-- ============================================
-- MONITORING: Performance Queries
-- ============================================

-- Slow queries (requires pg_stat_statements)
SELECT 
    substring(query, 1, 100) as short_query,
    calls,
    mean_exec_time::numeric(10,2) as avg_ms,
    total_exec_time::numeric(10,2) as total_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    pg_size_pretty(pg_indexes_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Index usage
SELECT 
    indexrelname as index_name,
    relname as table_name,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## Ringkasan Checklist

### Setup Database
- [ ] Create Supabase project
- [ ] Get connection string
- [ ] Run Step 1: Extensions
- [ ] Run Step 2: Better Auth tables
- [ ] Run Step 3: Application tables
- [ ] Run Step 4: Indexes

### Security
- [ ] Run RLS helper functions
- [ ] Enable RLS on all tables
- [ ] Apply RLS policies
- [ ] Test RLS policies

### Functions & Triggers
- [ ] Create timestamp triggers
- [ ] Create profile trigger
- [ ] Create order number function
- [ ] Create balance transaction function
- [ ] Create order status function
- [ ] Create audit log trigger

### Realtime
- [ ] Enable realtime for orders
- [ ] Enable realtime for profiles
- [ ] Enable realtime for transactions
- [ ] Test realtime subscription

### Data
- [ ] Insert default settings
- [ ] Insert sample products
- [ ] Create admin user

### Testing
- [ ] Verify all tables
- [ ] Test all functions
- [ ] Test RLS policies
- [ ] Test index usage
- [ ] Test realtime

### Maintenance
- [ ] Setup cleanup jobs
- [ ] Setup monitoring
- [ ] Document backup procedure

---

*Tutorial ini merupakan panduan lengkap setup database untuk Boba.Store*

*Terakhir diperbarui: Desember 2024*
