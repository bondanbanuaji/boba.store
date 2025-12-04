# Tutorial Lengkap: Membangun Website Top-Up Game dengan SEAN Stack

> **Panduan Bahasa Indonesia** - Dari Nol Hingga Production

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Prerequisites & Persiapan](#2-prerequisites--persiapan)
3. [Setup Project Structure](#3-setup-project-structure)
4. [Setup Database (Supabase)](#4-setup-database-supabase)
5. [Membangun Backend (Express.js)](#5-membangun-backend-expressjs)
6. [Membangun Frontend (Astro)](#6-membangun-frontend-astro)
7. [Integrasi Payment Gateway (Xendit)](#7-integrasi-payment-gateway-xendit)
8. [Integrasi Provider Top-Up (VIP Reseller)](#8-integrasi-provider-top-up-vip-reseller)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Testing & Debugging](#10-testing--debugging)
11. [Deployment ke Production](#11-deployment-ke-production)
12. [Maintenance & Monitoring](#12-maintenance--monitoring)

---

## 1. Pendahuluan

### 1.1 Apa yang Akan Kita Bangun?

Kita akan membangun **platform top-up game dan pulsa** lengkap dengan fitur:
- Katalog produk (game voucher, pulsa, e-wallet)
- Sistem pembayaran otomatis via Xendit
- Integrasi provider VIP Reseller untuk fulfillment otomatis
- Dashboard user dan admin
- Authentication dengan Supabase

### 1.2 Tech Stack: SEAN + Better Auth + Drizzle

| Huruf | Teknologi | Fungsi |
|-------|-----------|--------|
| **S** | Supabase | Database PostgreSQL (via Drizzle ORM) |
| **E** | Express.js | Backend REST API |
| **A** | Astro | Frontend Framework (SSR/SSG) |
| **N** | Node.js | JavaScript Runtime |

**Tambahan Tech Stack:**
| Teknologi | Fungsi |
|-----------|--------|
| **Better Auth** | Authentication library (mengganti Supabase Auth) |
| **Drizzle ORM** | Type-safe ORM untuk PostgreSQL |

### 1.3 Arsitektur Aplikasi

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│   Supabase      │
│   (Astro)       │     │   (Express)     │     │   (Database)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼                         ▼
           ┌─────────────────┐     ┌─────────────────┐
           │     Xendit      │     │  VIP Reseller   │
           │   (Payment)     │     │   (Provider)    │
           └─────────────────┘     └─────────────────┘
```

### 1.4 Alur Transaksi

```
User → Pilih Produk → Input ID Game → Pilih Payment → Bayar → 
Webhook Xendit → Proses VIP Reseller → Callback → Selesai
```

---

## 2. Prerequisites & Persiapan

### 2.1 Software yang Dibutuhkan

| Software | Versi Minimum | Cek Instalasi |
|----------|---------------|---------------|
| Node.js | v18.x | `node --version` |
| npm | v9.x | `npm --version` |
| Git | v2.x | `git --version` |
| VS Code | Latest | - |

### 2.2 Akun yang Diperlukan

#### A. Supabase (Gratis)
1. Kunjungi https://supabase.com
2. Sign up dengan GitHub/Email
3. Buat project baru
4. Catat:
   - `Project URL` → akan jadi `SUPABASE_URL`
   - `anon public key` → akan jadi `SUPABASE_ANON_KEY`
   - `service_role key` → akan jadi `SUPABASE_SERVICE_KEY`

#### B. Xendit (Test Mode Gratis)
1. Kunjungi https://dashboard.xendit.co
2. Daftar akun (otomatis masuk Test Mode)
3. Masuk ke Settings > API Keys
4. Catat:
   - `Secret API Key`
   - `Webhook Verification Token`

#### C. VIP Reseller (Deposit Required)
1. Kunjungi https://vip-reseller.co.id
2. Daftar akun member
3. Masuk ke menu Pengaturan > API
4. Catat:
   - `ID API`
   - `API Key`

### 2.3 Struktur Folder Project

```
boba.store/
├── frontend/          # Astro project
├── backend/           # Express project
├── supabase/          # Database migrations
└── docs/              # Dokumentasi
```

---

## 3. Setup Project Structure

### 3.1 Inisialisasi Root Project

```bash
# Buat folder project
mkdir boba.store
cd boba.store

# Inisialisasi git
git init
```

### 3.2 Setup Frontend (Astro)

#### Langkah 1: Create Astro Project

```bash
# Buat project Astro
npm create astro@latest frontend

# Pilih opsi:
# - Template: Empty
# - TypeScript: No (atau Yes jika familiar)
# - Install dependencies: Yes
```

#### Langkah 2: Install Dependencies

```bash
cd frontend

# Install dependencies tambahan
npm install @better-auth/client
npm install -D tailwindcss @astrojs/tailwind
```

#### Langkah 3: Konfigurasi Astro

File: `frontend/astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // Enable SSR
});
```

#### Langkah 4: Struktur Folder Frontend

```bash
# Buat struktur folder
mkdir -p src/components/{atoms,widgets,sections}
mkdir -p src/layouts
mkdir -p src/lib
mkdir -p src/pages/{products,dashboard,admin,auth,api}
mkdir -p src/styles
```

**Penjelasan Struktur:**

| Folder | Fungsi |
|--------|--------|
| `atoms/` | Komponen terkecil (Button, Input, Card) |
| `widgets/` | Komponen gabungan (Navbar, ProductCard) |
| `sections/` | Bagian halaman (Hero, Categories) |
| `layouts/` | Template halaman |
| `lib/` | Helper functions & API client |
| `pages/` | Routing otomatis Astro |
| `styles/` | CSS global |

### 3.3 Setup Backend (Express)

#### Langkah 1: Inisialisasi

```bash
# Kembali ke root
cd ..

# Buat folder backend
mkdir backend
cd backend

# Inisialisasi npm
npm init -y
```

#### Langkah 2: Install Dependencies

```bash
# Core dependencies
npm install express cors dotenv helmet morgan

# Database & ORM (Drizzle + Supabase PostgreSQL)
npm install drizzle-orm postgres

# Authentication (Better Auth)
npm install better-auth

# Xendit SDK
npm install xendit-node

# Utilities
npm install axios crypto uuid

# Development
npm install -D nodemon drizzle-kit
```

#### Langkah 3: Struktur Folder Backend

```bash
mkdir -p src/{config,routes,controllers,services,middleware,utils}
```

**Penjelasan Struktur:**

| Folder | Fungsi |
|--------|--------|
| `config/` | Konfigurasi (Supabase, Xendit, dll) |
| `routes/` | Definisi endpoint API |
| `controllers/` | Logic handler untuk routes |
| `services/` | Business logic & external API |
| `middleware/` | Auth, validation, rate limit |
| `utils/` | Helper functions |

#### Langkah 4: Setup package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

### 3.4 Setup Environment Variables

#### Frontend: `frontend/.env`

```env
# Backend API URL (untuk Better Auth dan API calls)
PUBLIC_API_URL=http://localhost:3000
```

#### Backend: `backend/.env`

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Supabase PostgreSQL via Drizzle)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Better Auth
BETTER_AUTH_SECRET=rahasia-auth-yang-panjang-dan-aman-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# VIP Reseller
VIPRESELLER_API_ID=api-id-anda
VIPRESELLER_API_KEY=api-key-anda

# Xendit
XENDIT_SECRET_KEY=xnd_development_xxx
XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token
XENDIT_IS_PRODUCTION=false
```

---

## 4. Setup Database (Supabase)

### 4.1 Membuat Project Supabase

1. Login ke https://app.supabase.com
2. Klik "New Project"
3. Isi:
   - **Name**: boba.store
   - **Database Password**: (catat password ini!)
   - **Region**: Singapore (terdekat)
4. Tunggu hingga project ready (~2 menit)

### 4.2 Membuat Tabel dengan SQL Editor

Buka **SQL Editor** di Supabase Dashboard, lalu jalankan query berikut satu per satu:

#### Tabel 1: profiles

```sql
-- Tabel untuk menyimpan data user tambahan
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  phone VARCHAR(15),
  balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger untuk auto-create profile saat user register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Penjelasan:**
- `id` = UUID dari auth.users (relasi 1:1)
- `balance` = saldo user untuk pembayaran
- Trigger otomatis membuat profile saat user register

#### Tabel 2: products

```sql
-- Tabel untuk menyimpan daftar produk
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50),
  provider VARCHAR(50),
  name TEXT NOT NULL,
  slug VARCHAR(100) UNIQUE,
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  stock_status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_slug ON products(slug);
```

**Penjelasan Kolom:**
- `category`: Kategori produk ('game', 'pulsa', 'ewallet')
- `provider`: Provider spesifik ('mobile-legends', 'telkomsel')
- `sku`: Kode produk dari VIP Reseller
- `slug`: URL-friendly identifier

#### Tabel 3: orders

```sql
-- Tabel untuk menyimpan pesanan
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users,
  product_id UUID REFERENCES products,
  target_id VARCHAR(100) NOT NULL,
  target_name VARCHAR(100),
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(15,2) NOT NULL,
  admin_fee DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_method VARCHAR(50),
  provider_trx_id VARCHAR(100),
  provider_status VARCHAR(50),
  provider_sn TEXT,
  payment_url TEXT,
  payment_expired_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

**Penjelasan Status:**

| Status | Payment Status | Keterangan |
|--------|----------------|------------|
| pending | unpaid | Menunggu pembayaran |
| pending | paid | Pembayaran diterima, proses ke provider |
| processing | paid | Sedang diproses provider |
| success | paid | Berhasil |
| failed | paid | Gagal (perlu refund) |
| cancelled | unpaid | Dibatalkan user |

#### Tabel 4: transactions

```sql
-- Tabel untuk log transaksi saldo
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders,
  user_id UUID REFERENCES auth.users,
  type VARCHAR(20),
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Tipe Transaksi:**
- `topup`: Pengisian saldo
- `purchase`: Pembelian produk
- `refund`: Pengembalian dana

#### Tabel 5: settings

```sql
-- Tabel untuk konfigurasi aplikasi
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('admin_fee', '1000', 'Biaya admin per transaksi'),
('min_topup', '10000', 'Minimum top-up saldo'),
('maintenance_mode', 'false', 'Mode maintenance');
```

### 4.3 Row Level Security (RLS)

RLS penting untuk keamanan data. Aktifkan untuk setiap tabel:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: User hanya bisa akses data sendiri
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Products bisa diakses semua orang
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

-- Orders hanya bisa diakses pemilik
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);
```

### 4.4 Realtime Subscriptions

Fitur Realtime memungkinkan frontend menerima update data secara instan tanpa perlu polling. Untuk aplikasi top-up, ini sangat penting agar user bisa melihat status order berubah secara real-time.

> 💡 **Catatan Penting:** Tutorial ini menggunakan **Realtime Standard** yang langsung tersedia untuk semua project Supabase. Tidak perlu waitlist atau aktivasi khusus seperti fitur "Replication" yang memerlukan approval terlebih dahulu. Realtime Standard sudah cukup untuk kebutuhan aplikasi top-up game.

#### 4.4.1 Aktivasi Realtime via SQL

Untuk mengaktifkan Realtime pada tabel, kita perlu menambahkan tabel ke publication `supabase_realtime`. Buka **SQL Editor** di Supabase Dashboard, lalu jalankan query berikut:

```sql
-- Enable Realtime untuk tabel-tabel penting
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Verifikasi realtime sudah aktif
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Penjelasan Tabel yang Perlu Di-enable:**

| Tabel | Prioritas | Alasan |
|-------|-----------|--------|
| `orders` | 🔴 HIGH | Tracking status order real-time (pending → paid → processing → success). User perlu tahu kapan pembayaran terdeteksi dan kapan top-up berhasil. |
| `profiles` | 🟡 MEDIUM | Update saldo user secara real-time setelah top-up atau refund. Penting untuk UX yang responsif. |
| `transactions` | 🟡 MEDIUM | Log transaksi baru muncul langsung di history user tanpa refresh halaman. |
| `products` | 🟢 LOW (Opsional) | Update stok/harga produk. Jarang berubah, bisa di-skip jika ingin menghemat resource. |

> ⚠️ **Tips:** Jika query `ALTER PUBLICATION` menampilkan error "table already added", berarti tabel tersebut sudah terdaftar di publication. Anda bisa langsung lanjut ke langkah verifikasi.

#### 4.4.2 Implementasi di Frontend

Setelah Realtime diaktifkan di database, frontend bisa subscribe ke perubahan data. Berikut contoh implementasinya:

```javascript
// Subscribe ke perubahan status order
const channel = supabase
  .channel('orders-channel')
  .on('postgres_changes', 
    { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'orders',
      filter: `user_id=eq.${userId}` // Filter hanya order milik user ini
    },
    (payload) => {
      console.log('Order updated:', payload.new);
      
      // Update UI berdasarkan status baru
      if (payload.new.status === 'success') {
        showNotification('Top-up berhasil! 🎉');
        updateOrderStatus(payload.new);
      } else if (payload.new.status === 'failed') {
        showNotification('Top-up gagal. Hubungi admin.');
      }
    }
  )
  .subscribe();

// Jangan lupa unsubscribe saat komponen di-unmount
// channel.unsubscribe();
```

**Contoh Subscribe ke Multiple Tables:**

```javascript
// Subscribe ke orders dan profiles sekaligus
const channel = supabase
  .channel('realtime-updates')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'orders' },
    (payload) => handleOrderUpdate(payload)
  )
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'profiles' },
    (payload) => handleBalanceUpdate(payload)
  )
  .subscribe();
```

**Event Types yang Tersedia:**
- `INSERT` - Data baru ditambahkan
- `UPDATE` - Data diubah
- `DELETE` - Data dihapus
- `*` - Semua event di atas

---

## 5. Membangun Backend (Express.js)

### 5.1 Entry Point

File: `backend/src/index.js`

```javascript
// Import dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const routes = require('./routes');

// Initialize app
const app = express();

// Middleware
app.use(helmet());              // Security headers
app.use(cors());                // CORS
app.use(morgan('dev'));         // Logging
app.use(express.json());        // Parse JSON body

// Routes
app.use('/api', routes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 5.2 Konfigurasi

#### Database Config (Drizzle ORM)

File: `backend/src/lib/db.js`

```javascript
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('../db/schema');

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);

const db = drizzle(client, { schema });

module.exports = { db };
```

#### Better Auth Config

File: `backend/src/lib/auth.js`

```javascript
const { betterAuth } = require('better-auth');
const { drizzleAdapter } = require('better-auth/adapters/drizzle');
const { db } = require('./db');
const schema = require('../db/schema');

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

module.exports = { auth };
```

#### Xendit Config

File: `backend/src/config/payment.js`

```javascript
const Xendit = require('xendit-node');

// Initialize Xendit client
const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY
});

// Invoice service untuk pembayaran
const { Invoice } = xenditClient;
const invoiceClient = new Invoice({});

// Balance service untuk cek saldo
const { Balance } = xenditClient;
const balanceClient = new Balance({});

module.exports = { xenditClient, invoiceClient, balanceClient };
```

### 5.3 Struktur Routes

File: `backend/src/routes/index.js`

```javascript
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const productRoutes = require('./products');
const orderRoutes = require('./orders');
const paymentRoutes = require('./payments');
const webhookRoutes = require('./webhooks');
const adminRoutes = require('./admin');

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
```

### 5.4 Contoh Route: Products

File: `backend/src/routes/products.js`

```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - List semua produk
router.get('/', productController.getAll);

// GET /api/products/:category - Produk by kategori
router.get('/:category', productController.getByCategory);

// GET /api/products/detail/:slug - Detail produk
router.get('/detail/:slug', productController.getBySlug);

// POST /api/products/check-target - Validasi ID game
router.post('/check-target', productController.checkTarget);

module.exports = router;
```

### 5.5 Contoh Controller

File: `backend/src/controllers/productController.js`

```javascript
const { db } = require('../lib/db');
const { products } = require('../db/schema');
const { eq, and } = require('drizzle-orm');

const productController = {
  // Get all active products
  async getAll(req, res) {
    try {
      const data = await db
        .select()
        .from(products)
        .where(eq(products.isActive, true));

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get products by category
  async getByCategory(req, res) {
    try {
      const { category } = req.params;
      const data = await db
        .select()
        .from(products)
        .where(and(
          eq(products.category, category),
          eq(products.isActive, true)
        ));

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get product by slug
  async getBySlug(req, res) {
    try {
      const { slug } = req.params;
      const data = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (!data.length) {
        return res.status(404).json({ 
          success: false, 
          error: 'Product not found' 
        });
      }
      res.json({ success: true, data: data[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Check/validate game user ID
  async checkTarget(req, res) {
    // Implementasi validasi ID game via VIP Reseller
    // Contoh: cek apakah User ID Mobile Legends valid
  }
};

module.exports = productController;
```

### 5.6 Middleware

#### Authentication Middleware (Better Auth)

File: `backend/src/middleware/auth.js`

```javascript
const { auth } = require('../lib/auth');

const authMiddleware = async (req, res, next) => {
  try {
    // Get session dari Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({ error: 'No valid session' });
    }

    // Attach user dan session ke request
    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;
```

#### Validation Middleware

File: `backend/src/middleware/validation.js`

```javascript
// Contoh validasi untuk create order
const validateOrder = (req, res, next) => {
  const { product_id, target_id, payment_method } = req.body;

  const errors = [];

  if (!product_id) errors.push('product_id is required');
  if (!target_id) errors.push('target_id is required');
  if (!payment_method) errors.push('payment_method is required');

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false, 
      errors 
    });
  }

  next();
};

module.exports = { validateOrder };
```

---

## 6. Membangun Frontend (Astro)

### 6.1 Layout Dasar

File: `frontend/src/layouts/Layout.astro`

```astro
---
// Props interface
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Platform top-up game terpercaya' } = Astro.props;
---

<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content={description}>
  <title>{title} | Boba Store</title>
  <link rel="stylesheet" href="/styles/global.css">
</head>
<body>
  <!-- Navbar -->
  <slot name="navbar" />
  
  <!-- Main content -->
  <main>
    <slot />
  </main>
  
  <!-- Footer -->
  <slot name="footer" />
</body>
</html>
```

**Sintaks Astro:**
- `---` = Frontmatter (JavaScript/TypeScript)
- `Astro.props` = Props yang diterima komponen
- `<slot />` = Tempat konten child
- `<slot name="x" />` = Named slot

### 6.2 Komponen Atoms

#### Button Component

File: `frontend/src/components/atoms/Button.astro`

```astro
---
interface Props {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  disabled?: boolean;
  class?: string;
}

const { 
  variant = 'primary', 
  size = 'md', 
  type = 'button',
  disabled = false,
  class: className = ''
} = Astro.props;

// Class mapping
const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};
---

<button
  type={type}
  disabled={disabled}
  class:list={[
    'rounded-lg font-medium transition-colors',
    variantClasses[variant],
    sizeClasses[size],
    disabled && 'opacity-50 cursor-not-allowed',
    className
  ]}
>
  <slot />
</button>
```

**Penjelasan:**
- `class:list` = Utility Astro untuk menggabungkan class
- Conditional class dengan `&&`

#### Card Component

File: `frontend/src/components/atoms/Card.astro`

```astro
---
interface Props {
  padding?: boolean;
  hover?: boolean;
  class?: string;
}

const { 
  padding = true, 
  hover = false,
  class: className = '' 
} = Astro.props;
---

<div 
  class:list={[
    'bg-white rounded-xl shadow-sm border border-gray-100',
    padding && 'p-4',
    hover && 'hover:shadow-md transition-shadow cursor-pointer',
    className
  ]}
>
  <slot />
</div>
```

### 6.3 Komponen Widgets

#### Product Card

File: `frontend/src/components/widgets/ProductCard.astro`

```astro
---
import Card from '../atoms/Card.astro';
import Badge from '../atoms/Badge.astro';

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    discount: number;
    image_url: string;
    stock_status: string;
  };
}

const { product } = Astro.props;

// Hitung harga setelah diskon
const finalPrice = product.price - product.discount;

// Format currency
const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num);
};
---

<a href={`/products/${product.slug}`}>
  <Card hover>
    <!-- Image -->
    <div class="aspect-square overflow-hidden rounded-lg mb-3">
      <img 
        src={product.image_url} 
        alt={product.name}
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>

    <!-- Info -->
    <h3 class="font-semibold text-gray-900 mb-1">{product.name}</h3>
    
    <!-- Price -->
    <div class="flex items-center gap-2">
      {product.discount > 0 && (
        <span class="text-sm text-gray-400 line-through">
          {formatRupiah(product.price)}
        </span>
      )}
      <span class="text-lg font-bold text-blue-600">
        {formatRupiah(finalPrice)}
      </span>
    </div>

    <!-- Stock status -->
    {product.stock_status !== 'available' && (
      <Badge variant="danger" class="mt-2">Stok Habis</Badge>
    )}
  </Card>
</a>
```

#### Navbar

File: `frontend/src/components/widgets/Navbar.astro`

```astro
---
// Get current path untuk active state
const currentPath = Astro.url.pathname;

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products/game', label: 'Game' },
  { href: '/products/pulsa', label: 'Pulsa' },
  { href: '/products/ewallet', label: 'E-Wallet' },
];
---

<nav class="bg-white shadow-sm sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a href="/" class="font-bold text-xl text-blue-600">
        Boba Store
      </a>

      <!-- Navigation -->
      <div class="hidden md:flex items-center gap-6">
        {navLinks.map((link) => (
          <a 
            href={link.href}
            class:list={[
              'text-gray-600 hover:text-blue-600 transition-colors',
              currentPath === link.href && 'text-blue-600 font-medium'
            ]}
          >
            {link.label}
          </a>
        ))}
      </div>

      <!-- Auth buttons -->
      <div class="flex items-center gap-3">
        <a href="/auth/login" class="text-gray-600 hover:text-blue-600">
          Login
        </a>
        <a 
          href="/auth/register" 
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Daftar
        </a>
      </div>
    </div>
  </div>
</nav>
```

### 6.4 Sections

#### Hero Section

File: `frontend/src/components/sections/Hero.astro`

```astro
---
import Button from '../atoms/Button.astro';
---

<section class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
  <div class="max-w-7xl mx-auto px-4 py-20">
    <div class="max-w-2xl">
      <h1 class="text-4xl md:text-5xl font-bold mb-4">
        Top-Up Game & Pulsa Tercepat
      </h1>
      <p class="text-lg text-blue-100 mb-8">
        Isi diamond, voucher game, pulsa, dan e-wallet dengan harga termurah. 
        Proses instan 24 jam non-stop.
      </p>
      <div class="flex gap-4">
        <Button size="lg">Mulai Top-Up</Button>
        <Button variant="secondary" size="lg">Lihat Promo</Button>
      </div>
    </div>
  </div>
</section>
```

### 6.5 Pages

#### Homepage

File: `frontend/src/pages/index.astro`

```astro
---
import Layout from '../layouts/Layout.astro';
import Navbar from '../components/widgets/Navbar.astro';
import Footer from '../components/widgets/Footer.astro';
import Hero from '../components/sections/Hero.astro';
import Categories from '../components/sections/Categories.astro';
import FeaturedProducts from '../components/sections/FeaturedProducts.astro';

// Fetch products dari API
const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/products`);
const { data: products } = await response.json();
---

<Layout title="Home">
  <Navbar slot="navbar" />
  
  <Hero />
  <Categories />
  <FeaturedProducts products={products} />
  
  <Footer slot="footer" />
</Layout>
```

#### Dynamic Route: Product Category

File: `frontend/src/pages/products/[category].astro`

```astro
---
import Layout from '../../layouts/Layout.astro';
import ProductCard from '../../components/widgets/ProductCard.astro';

// Get category dari URL params
const { category } = Astro.params;

// Validasi category
const validCategories = ['game', 'pulsa', 'ewallet'];
if (!validCategories.includes(category)) {
  return Astro.redirect('/404');
}

// Fetch products by category
const response = await fetch(
  `${import.meta.env.PUBLIC_API_URL}/products/${category}`
);
const { data: products } = await response.json();

// Title mapping
const titles = {
  game: 'Voucher Game',
  pulsa: 'Pulsa & Data',
  ewallet: 'E-Wallet'
};
---

<Layout title={titles[category]}>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">{titles[category]}</h1>
    
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard product={product} />
      ))}
    </div>
  </div>
</Layout>
```

**Sintaks Dynamic Route:**
- `[category].astro` = Dynamic segment
- `Astro.params.category` = Nilai dari URL
- `[...slug].astro` = Catch-all route

### 6.6 Client-Side JavaScript

Untuk interaktivitas, gunakan `<script>` tag atau islands:

```astro
---
// Component dengan client-side JS
---

<div id="counter">
  <span id="count">0</span>
  <button id="increment">+</button>
</div>

<script>
  // Script ini berjalan di browser
  const countEl = document.getElementById('count');
  const btnEl = document.getElementById('increment');
  
  let count = 0;
  
  btnEl.addEventListener('click', () => {
    count++;
    countEl.textContent = count.toString();
  });
</script>
```

### 6.7 API Route (Endpoint)

File: `frontend/src/pages/api/check-status.js`

```javascript
// API endpoint di Astro
export async function GET({ request }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');

  if (!orderId) {
    return new Response(JSON.stringify({ error: 'Missing order_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Call backend API
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_URL}/orders/${orderId}`
  );
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 6.8 Better Auth Client di Frontend

File: `frontend/src/lib/auth-client.js`

```javascript
import { createAuthClient } from '@better-auth/client';

const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_URL,
});

// Helper functions
export async function signUp(email, password, name) {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await authClient.signOut();
  return { error };
}

export async function getSession() {
  const session = await authClient.getSession();
  return session;
}

export { authClient };
```

---

## 7. Integrasi Payment Gateway (Xendit)

### 7.1 Konsep Alur Pembayaran

```
1. User checkout → Frontend kirim order ke Backend
2. Backend create order di Supabase
3. Backend create Invoice ke Xendit API
4. Xendit return Invoice URL
5. Backend kirim URL ke Frontend
6. User redirect ke Xendit payment page
7. User bayar (transfer, QRIS, e-wallet, dll)
8. Xendit kirim webhook ke Backend
9. Backend update status order
10. Lanjut ke fulfillment (VIP Reseller)
```

### 7.2 Create Payment (Backend)

File: `backend/src/services/xendit.js`

```javascript
const { invoiceClient } = require('../config/payment');
const { v4: uuidv4 } = require('uuid');

const xenditService = {
  async createInvoice(order) {
    const externalId = `ORDER-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    const invoiceParams = {
      externalId: externalId,
      amount: order.total_price,
      payerEmail: order.user_email,
      description: `Pembayaran ${order.product_name}`,
      invoiceDuration: 86400, // 24 jam dalam detik
      customer: {
        email: order.user_email,
        mobileNumber: order.user_phone
      },
      items: [
        {
          name: order.product_name,
          quantity: 1,
          price: order.price
        },
        {
          name: 'Biaya Admin',
          quantity: 1,
          price: order.admin_fee
        }
      ],
      successRedirectUrl: `${process.env.FRONTEND_URL}/checkout/success`,
      failureRedirectUrl: `${process.env.FRONTEND_URL}/checkout/failed`
    };

    try {
      const invoice = await invoiceClient.createInvoice(invoiceParams);
      return {
        success: true,
        invoice_id: invoice.id,
        invoice_url: invoice.invoiceUrl,
        external_id: externalId,
        expiry_date: invoice.expiryDate
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  async getInvoice(invoiceId) {
    try {
      const invoice = await invoiceClient.getInvoice({ invoiceId });
      return { success: true, data: invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = xenditService;
```

### 7.3 Webhook Handler

File: `backend/src/routes/webhooks.js`

```javascript
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const vipresellerService = require('../services/vipreseller');

// Xendit webhook
router.post('/xendit', async (req, res) => {
  try {
    const callback = req.body;
    
    // Verify webhook token dari header
    const webhookToken = req.headers['x-callback-token'];
    if (webhookToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    // Get order dari database berdasarkan external_id
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', callback.external_id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Handle berdasarkan status invoice
    const invoiceStatus = callback.status;
    let newStatus = order.payment_status;
    
    if (invoiceStatus === 'PAID' || invoiceStatus === 'SETTLED') {
      newStatus = 'paid';
      
      // Trigger fulfillment ke VIP Reseller
      await vipresellerService.processOrder(order);
    } else if (invoiceStatus === 'PENDING') {
      newStatus = 'pending';
    } else if (invoiceStatus === 'EXPIRED') {
      newStatus = 'expired';
    }

    // Update order
    await supabase
      .from('orders')
      .update({ 
        payment_status: newStatus,
        payment_method: callback.payment_method,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null
      })
      .eq('id', order.id);

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Xendit webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 7.4 Frontend: Redirect ke Xendit

```javascript
// Di halaman checkout
async function handlePayment() {
  // Create order
  const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: selectedProduct.id,
      target_id: targetId,
      payment_method: 'xendit'
    })
  });

  const { data } = await response.json();

  // Redirect ke Xendit Invoice
  if (data.invoice_url) {
    window.location.href = data.invoice_url;
  }
}
```

---

## 8. Integrasi Provider Top-Up (VIP Reseller)

### 8.1 Konsep VIP Reseller

VIP Reseller adalah provider PPOB Indonesia untuk:
- Voucher game (Mobile Legends, Free Fire, PUBG, dll)
- Pulsa & paket data semua operator
- Token listrik PLN
- E-wallet (DANA, OVO, GoPay, ShopeePay)
- Voucher digital lainnya

### 8.2 Authentication VIP Reseller

VIP Reseller menggunakan kombinasi API ID dan API Key:

```javascript
// Format untuk setiap request
const params = {
  key: process.env.VIPRESELLER_API_KEY,
  sign: generateSign(data),
  // ... parameter lainnya
};

// Generate signature dengan MD5
function generateSign(data) {
  const apiId = process.env.VIPRESELLER_API_ID;
  const apiKey = process.env.VIPRESELLER_API_KEY;
  
  return crypto
    .createHash('md5')
    .update(apiKey + apiId)
    .digest('hex');
}
```

### 8.3 Service VIP Reseller

File: `backend/src/services/vipreseller.js`

```javascript
const axios = require('axios');
const crypto = require('crypto');

const VIPRESELLER_URL = 'https://vip-reseller.co.id/api';

const vipresellerService = {
  // Generate signature
  generateSign() {
    const apiId = process.env.VIPRESELLER_API_ID;
    const apiKey = process.env.VIPRESELLER_API_KEY;
    return crypto.createHash('md5').update(apiKey + apiId).digest('hex');
  },

  // Cek saldo VIP Reseller
  async checkBalance() {
    const sign = this.generateSign();
    
    const response = await axios.post(`${VIPRESELLER_URL}/profile`, {
      key: process.env.VIPRESELLER_API_KEY,
      sign,
      type: 'balance'
    });

    return response.data;
  },

  // Get daftar layanan/produk
  async getServices(filterType = 'all') {
    const sign = this.generateSign();
    
    const response = await axios.post(`${VIPRESELLER_URL}/services`, {
      key: process.env.VIPRESELLER_API_KEY,
      sign,
      type: filterType // 'pulsa', 'game', 'pln', dll
    });

    return response.data;
  },

  // Process order (top-up)
  async processOrder(order) {
    const sign = this.generateSign();

    const payload = {
      key: process.env.VIPRESELLER_API_KEY,
      sign,
      type: 'order',
      service: order.sku,              // Kode layanan dari VIP Reseller
      data_no: order.target_id,        // ID game / nomor HP
      data_zone: order.target_zone     // Zone ID (untuk game tertentu)
    };

    try {
      const response = await axios.post(
        `${VIPRESELLER_URL}/game-feature`,
        payload
      );

      if (response.data.result) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data.message
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  },

  // Cek status order
  async checkStatus(orderId) {
    const sign = this.generateSign();

    const response = await axios.post(`${VIPRESELLER_URL}/game-feature`, {
      key: process.env.VIPRESELLER_API_KEY,
      sign,
      type: 'status',
      trxid: orderId
    });

    return response.data;
  }
};

module.exports = vipresellerService;
```

### 8.4 Callback VIP Reseller

File: `backend/src/routes/webhooks.js` (tambahan)

```javascript
// VIP Reseller callback
router.post('/vipreseller', async (req, res) => {
  try {
    const callback = req.body;
    
    // Get order berdasarkan trxid
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('provider_trx_id', callback.trxid)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Map status VIP Reseller ke status order
    let orderStatus = order.status;
    
    if (callback.status === 'success') {
      orderStatus = 'success';
    } else if (callback.status === 'pending' || callback.status === 'process') {
      orderStatus = 'processing';
    } else if (callback.status === 'failed' || callback.status === 'error') {
      orderStatus = 'failed';
      // TODO: Trigger refund
    }

    // Update order
    await supabase
      .from('orders')
      .update({
        status: orderStatus,
        provider_status: callback.status,
        provider_sn: callback.sn,
        notes: callback.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('VIP Reseller callback error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 8.5 Response VIP Reseller

Contoh response sukses:
```json
{
  "result": true,
  "data": {
    "trxid": "VIP123456789",
    "service": "ml86",
    "data_no": "123456789",
    "data_zone": "1234",
    "status": "success",
    "sn": "1234567890123456",
    "price": 15000,
    "message": "Transaksi berhasil"
  }
}
```

---

## 9. Authentication & Authorization

### 9.1 Register Flow

```
1. User isi form register
2. Frontend call Supabase auth.signUp()
3. Supabase kirim email verifikasi
4. User klik link verifikasi
5. Supabase create user di auth.users
6. Trigger otomatis create profile
7. User redirect ke dashboard
```

### 9.2 Login Flow

```
1. User isi email & password
2. Frontend call Supabase auth.signInWithPassword()
3. Supabase verify credentials
4. Supabase return access_token & refresh_token
5. Frontend simpan token di localStorage/cookie
6. User redirect ke dashboard
```

### 9.3 Contoh Implementasi Auth Page

File: `frontend/src/pages/auth/login.astro`

```astro
---
import Layout from '../../layouts/Layout.astro';
import Card from '../../components/atoms/Card.astro';
import Input from '../../components/atoms/Input.astro';
import Button from '../../components/atoms/Button.astro';
---

<Layout title="Login">
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <Card class="w-full max-w-md p-8">
      <h1 class="text-2xl font-bold text-center mb-6">Login</h1>
      
      <form id="loginForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <Input type="email" name="email" required />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <Input type="password" name="password" required />
        </div>
        
        <Button type="submit" class="w-full">Login</Button>
      </form>
      
      <p class="text-center mt-4 text-sm text-gray-600">
        Belum punya akun? 
        <a href="/auth/register" class="text-blue-600 hover:underline">
          Daftar
        </a>
      </p>
    </Card>
  </div>
</Layout>

<script>
  import { signIn } from '../../lib/auth-client';

  const form = document.getElementById('loginForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    
    const { data, error } = await signIn(email, password);
    
    if (error) {
      alert(error.message);
      return;
    }
    
    // Redirect ke dashboard
    window.location.href = '/dashboard';
  });
</script>
```

### 9.4 Protected Routes

Untuk halaman yang butuh login:

```astro
---
// Cek session via API call ke backend
const apiUrl = import.meta.env.PUBLIC_API_URL;

// Get cookies untuk dikirim ke backend
const cookies = Astro.request.headers.get('cookie');

const response = await fetch(`${apiUrl}/api/auth/get-session`, {
  headers: {
    cookie: cookies || '',
  },
  credentials: 'include',
});

const session = await response.json();

if (!session || !session.user) {
  return Astro.redirect('/auth/login');
}

// User authenticated, lanjut render
const user = session.user;
---

<Layout title="Dashboard">
  <h1>Welcome, {user.email}</h1>
</Layout>
```

### 9.5 Role-Based Access (Admin)

```javascript
// Di backend middleware
const adminMiddleware = async (req, res, next) => {
  // Cek apakah user sudah login
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Cek role di profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};
```

---

## 10. Testing & Debugging

### 10.1 Testing Backend dengan Postman/Insomnia

#### Test Health Check
```
GET http://localhost:3000/api/health
Expected: { "status": "ok" }
```

#### Test Get Products
```
GET http://localhost:3000/api/products
Expected: { "success": true, "data": [...] }
```

#### Test Create Order
```
POST http://localhost:3000/api/orders/create
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
  {
    "product_id": "uuid",
    "target_id": "123456789",
    "payment_method": "qris"
  }
```

### 10.2 Testing Webhook Lokal

Gunakan **ngrok** untuk expose localhost:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Copy URL (contoh: https://abc123.ngrok.io)
# Set URL ini di Xendit Dashboard > Settings > Callbacks
```

### 10.3 Debugging Tips

#### Console Logging
```javascript
// Di controller
console.log('[OrderController] Creating order:', req.body);

// Di service
console.log('[VIPReseller] Request:', payload);
console.log('[VIPReseller] Response:', response.data);
```

#### Error Handling yang Baik
```javascript
try {
  // risky code
} catch (error) {
  console.error('[Service] Error:', {
    message: error.message,
    stack: error.stack,
    data: error.response?.data
  });
  throw error;
}
```

### 10.4 Testing Mode Sandbox

#### Xendit Test Mode
- Gunakan API key dengan prefix `xnd_development_`
- Test Virtual Account: Gunakan nomor VA yang diberikan
- Test E-Wallet: Simulasi pembayaran di dashboard Xendit
- Test Cards:
  - Success: `4000000000000002`
  - Failure: `4000000000000010`
  - Expiry: Bulan/Tahun di masa depan
  - CVV: `123`

#### VIP Reseller Testing
- Gunakan akun development/sandbox jika tersedia
- Cek dokumentasi VIP Reseller untuk produk testing
- Minimal deposit untuk testing produk dengan harga rendah

---

## 11. Deployment ke Production

### 11.1 Persiapan Production

#### Checklist:
- [ ] Ganti semua API key ke production
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Setup domain
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Setup logging service

### 11.2 Deploy Backend ke Railway/Render

#### Railway:
1. Push code ke GitHub
2. Connect repository di Railway
3. Set environment variables
4. Deploy otomatis setiap push

#### Render:
1. Create Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables

### 11.3 Deploy Frontend ke Vercel/Netlify

#### Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

#### Netlify:
1. Connect GitHub repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables

### 11.4 Deploy Supabase

Supabase sudah cloud-hosted. Yang perlu dilakukan:
1. Pastikan RLS sudah aktif
2. Backup database secara berkala
3. Monitor usage di Dashboard

### 11.5 Domain & SSL

1. Beli domain (Namecheap, Cloudflare, dll)
2. Setup DNS:
   - `boba.store` → Frontend (Vercel/Netlify)
   - `api.boba.store` → Backend (Railway/Render)
3. SSL otomatis dari provider

### 11.6 Environment Production

#### Frontend (.env.production)
```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
PUBLIC_API_URL=https://api.boba.store
```

#### Backend (.env.production)
```env
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx

XENDIT_SECRET_KEY=xnd_production_xxx  # Production key
XENDIT_WEBHOOK_TOKEN=your_production_webhook_token
XENDIT_IS_PRODUCTION=true

VIPRESELLER_API_ID=xxx
VIPRESELLER_API_KEY=xxx
```

---

## 12. Maintenance & Monitoring

### 12.1 Logging

Gunakan service seperti:
- **LogTail** (gratis tier)
- **Papertrail**
- **Datadog**

```javascript
// Contoh dengan Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 12.2 Error Tracking

Gunakan **Sentry** untuk track errors:

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'https://xxx@sentry.io/xxx'
});

// Di error handler
app.use((err, req, res, next) => {
  Sentry.captureException(err);
  res.status(500).json({ error: 'Something went wrong' });
});
```

### 12.3 Uptime Monitoring

- **UptimeRobot** (gratis)
- **Better Uptime**
- **Pingdom**

Setup alert ke email/Slack jika server down.

### 12.4 Database Backup

Supabase backup:
1. Dashboard > Settings > Database
2. Enable Point-in-Time Recovery
3. Manual backup via `pg_dump`

### 12.5 Security Checklist

- [ ] Rate limiting aktif
- [ ] Helmet.js untuk security headers
- [ ] Input validation di semua endpoint
- [ ] SQL injection prevention (Supabase handle ini)
- [ ] XSS prevention
- [ ] CORS configured properly
- [ ] Secrets tidak di-commit ke Git
- [ ] HTTPS everywhere

### 12.6 Performance Optimization

#### Backend:
- Enable compression (gzip)
- Cache response yang jarang berubah
- Index database columns

#### Frontend:
- Lazy loading images
- Code splitting
- CDN untuk assets

---

## Referensi & Link Penting

### Dokumentasi Resmi
- [Astro Docs](https://docs.astro.build)
- [Express.js Guide](https://expressjs.com/en/guide)
- [Supabase Docs](https://supabase.com/docs)
- [Xendit API Docs](https://developers.xendit.co)
- [VIP Reseller API Docs](https://vip-reseller.co.id/api)

### Tools Development
- [Postman](https://postman.com) - API testing
- [ngrok](https://ngrok.com) - Localhost tunneling
- [TablePlus](https://tableplus.com) - Database GUI

### Hosting Services
- [Vercel](https://vercel.com) - Frontend hosting
- [Railway](https://railway.app) - Backend hosting
- [Render](https://render.com) - Alternative backend hosting

---

## Kesimpulan

Tutorial ini mencakup seluruh proses pembuatan website top-up dari awal hingga production-ready. Langkah-langkah yang perlu dilakukan secara berurutan:

1. **Setup environment** - Install tools dan buat akun services
2. **Setup database** - Buat schema di Supabase
3. **Build backend** - Express API dengan integrasi Xendit & VIP Reseller
4. **Build frontend** - UI dengan Astro
5. **Integrasi** - Connect semua komponen
6. **Testing** - Test semua fitur di sandbox
7. **Deploy** - Deploy ke production
8. **Monitor** - Setup logging dan monitoring

Selamat membangun platform top-up Anda!

---

*Dokumentasi ini dibuat untuk Boba.Store - Platform Top-Up Game & Pulsa*

*Terakhir diperbarui: Desember 2024*
