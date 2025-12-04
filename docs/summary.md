# Platform Top-Up Boba.Store - SEAN Stack + Better Auth + Drizzle

## Tech Stack
- **S**upabase - Database PostgreSQL (via Drizzle ORM)
- **E**xpress - Backend API
- **A**stro - Frontend Framework
- **N**ode.js - Runtime

### Tambahan Tech Stack
- **Better Auth** - Authentication library (mengganti Supabase Auth)
- **Drizzle ORM** - Type-safe ORM untuk PostgreSQL

## 📁 Project Structure (Plan vs Current Status)

### Frontend (Astro)

```
frontend/
├── astro.config.mjs              ✅ EXISTS
├── package.json                  ✅ EXISTS
├── src/
│   ├── assets/                   ✅ EXISTS (empty)
│   ├── components/
│   │   ├── atoms/                ✅ EXISTS (empty - needs components)
│   │   │   ├── Button.astro            ✅ EXISTS
│   │   │   ├── Input.astro             ✅ EXISTS
│   │   │   ├── Card.astro              ✅ EXISTS
│   │   │   └── Badge.astro             ✅ EXISTS
│   │   ├── widgets/              ✅ EXISTS (empty - needs components)
│   │   │   ├── Navbar.astro            ✅ EXISTS
│   │   │   ├── Footer.astro            ✅ EXISTS
│   │   │   ├── ProductCard.astro       ✅ EXISTS
│   │   │   ├── OrderForm.astro         ✅ EXISTS
│   │   │   ├── PaymentMethod.astro     ✅ EXISTS
│   │   │   └── TransactionStatus.astro ✅ EXISTS
│   │   └── sections/             ✅ EXISTS (empty - needs components)
│   │       ├── Hero.astro              ✅ EXISTS
│   │       ├── Categories.astro        ✅ EXISTS
│   │       └── FeaturedProducts.astro  ✅ EXISTS
│   ├── layouts/
│   │   ├── Layout.astro          ✅ EXISTS (basic - needs update)
│   │   └── DashboardLayout.astro ✅ EXISTS
│   ├── lib/                      ✅ EXISTS
│   │   ├── auth-client.js        ✅ EXISTS (Better Auth client)
│   │   └── api.js                ✅ EXISTS
│   ├── pages/
│   │   ├── index.astro           ✅ EXISTS (empty shell)
│   │   ├── checkout.astro        ✅ EXISTS (needs implementation)
│   │   ├── products/
│   │   │   ├── [category].astro  ✅ EXISTS (needs implementation)
│   │   │   └── [slug].astro      ✅ EXISTS (needs implementation)
│   │   ├── dashboard/
│   │   │   ├── index.astro       ✅ EXISTS (needs implementation)
│   │   │   ├── history.astro     ✅ EXISTS (needs implementation)
│   │   │   └── profile.astro     ✅ EXISTS (needs implementation)
│   │   ├── admin/
│   │   │   ├── index.astro       ✅ EXISTS (needs implementation)
│   │   │   ├── orders.astro      ✅ EXISTS (needs implementation)
│   │   │   └── products.astro    ✅ EXISTS (needs implementation)
│   │   ├── auth/
│   │   │   ├── login.astro       ✅ EXISTS (needs implementation)
│   │   │   └── register.astro    ✅ EXISTS (needs implementation)
│   │   └── api/
│   │       └── check-status.js   ✅ EXISTS (needs implementation)
│   └── styles/
│       └── global.css            ✅ EXISTS
```

### Backend (Express) - PARTIALLY CREATED

```
backend/
├── package.json                  ✅ EXISTS (with Drizzle & Better Auth)
├── drizzle.config.js             ✅ EXISTS (Drizzle config)
├── .env.example                  ✅ EXISTS
├── src/
│   ├── index.js                  ✅ EXISTS (entry point)
│   ├── db/
│   │   └── schema.js             ✅ EXISTS (Drizzle schema)
│   ├── lib/
│   │   ├── db.js                 ✅ EXISTS (Drizzle connection)
│   │   └── auth.js               ✅ EXISTS (Better Auth config)
│   ├── config/
│   │   ├── payment.js            ❌ TODO
│   │   └── provider.js           ❌ TODO
│   ├── routes/
│   │   ├── auth.js               ✅ EXISTS (Better Auth handler)
│   │   ├── products.js           ❌ TODO
│   │   ├── orders.js             ❌ TODO
│   │   ├── payments.js           ❌ TODO
│   │   └── webhooks.js           ❌ TODO
│   ├── controllers/
│   │   ├── orderController.js    ❌ TODO
│   │   ├── paymentController.js  ❌ TODO
│   │   └── providerController.js ❌ TODO
│   ├── services/
│   │   ├── vipreseller.js        ❌ TODO
│   │   ├── xendit.js             ❌ TODO
│   │   └── notification.js       ❌ TODO
│   ├── middleware/
│   │   ├── auth.js               ✅ EXISTS (Better Auth middleware)
│   │   ├── validation.js         ❌ TODO
│   │   └── rateLimit.js          ❌ TODO
│   └── utils/
│       ├── logger.js             ❌ TODO
│       └── helpers.js            ❌ TODO
```

### Database Schema - DOCUMENTED

```
docs/
├── backend-step-todo.md          ✅ EXISTS (Complete SQL migrations)
└── Database includes:
    ├── Better Auth tables        ✅ (user, session, account, verification)
    ├── Application tables        ✅ (profiles, products, orders, transactions, settings, audit_logs)
    ├── RLS Policies              ✅ (All tables secured)
    ├── Functions & Triggers      ✅ (Auto timestamps, order number, balance, audit)
    ├── Indexes                   ✅ (Optimized for common queries)
    └── Realtime setup            ✅ (orders, profiles, transactions)
```

## 🗄️ Database Schema (Supabase)

### Table: profiles
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  phone VARCHAR(15),
  balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50),        -- 'game', 'pulsa', 'ewallet'
  provider VARCHAR(50),        -- 'mobile-legends', 'free-fire', 'telkomsel'
  name TEXT NOT NULL,
  slug VARCHAR(100) UNIQUE,
  sku VARCHAR(100) UNIQUE,     -- SKU dari provider
  price DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  stock_status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: orders
```sql
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
```

### Table: transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders,
  user_id UUID REFERENCES auth.users,
  type VARCHAR(20),            -- 'topup', 'purchase', 'refund'
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: settings
```sql
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_slug ON products(slug);
```

## 🔧 Backend API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/me | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List all products |
| GET | /api/products/:category | Products by category |
| GET | /api/products/detail/:slug | Product detail |
| POST | /api/products/check-target | Validate game user ID |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders/create | Create new order |
| GET | /api/orders/:orderId | Get order detail |
| GET | /api/orders/user/history | User order history |
| POST | /api/orders/:orderId/cancel | Cancel order |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/create | Create payment |
| GET | /api/payments/:orderId/status | Check payment status |
| POST | /api/payments/balance/topup | Top-up balance |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/webhooks/xendit | Xendit webhook |
| POST | /api/webhooks/vipreseller | VIP Reseller callback |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Dashboard stats |
| GET | /api/admin/orders | All orders |
| PATCH | /api/admin/orders/:id | Update order |
| POST | /api/admin/products | Create product |
| PUT | /api/admin/products/:id | Update product |
| DELETE | /api/admin/products/:id | Delete product |

## 🔄 Order Flow

```
1. User memilih produk               → Frontend (Astro)
2. User input target ID              → Validasi via API
3. User pilih payment method         → Create Order (Express)
4. Express create order di Supabase  → Generate payment
5. Express call Xendit API           → Get payment URL/Invoice
6. User bayar via Xendit
7. Xendit webhook                    → Express receive notification
8. Express update order              → Call VIP Reseller API
9. VIP Reseller process              → Send callback
10. Express update order with SN     → Real-time update ke frontend
11. User receive notification        → Order completed
```

## 🔐 Environment Variables

### Frontend (.env)
```env
# Backend API URL (untuk Better Auth dan API calls)
PUBLIC_API_URL=http://localhost:3000
```

### Backend (.env)
```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4321

# Database (Supabase PostgreSQL via Drizzle ORM)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

# VIP Reseller
VIPRESELLER_API_ID=your_api_id
VIPRESELLER_API_KEY=your_api_key

# Xendit
XENDIT_SECRET_KEY=your_secret_key
XENDIT_WEBHOOK_TOKEN=your_webhook_token
XENDIT_IS_PRODUCTION=false
```

## 📊 Progress Summary

| Section | Status | Progress |
|---------|--------|----------|
| Frontend Pages | Shell exists | 20% |
| Frontend Components | Folders exist | 5% |
| Frontend Lib | Auth client created | 30% |
| Backend Core | Drizzle + Better Auth setup | 40% |
| Backend Routes | Auth route only | 15% |
| Database Schema | Complete SQL migrations | 90% |
| Database Functions | All triggers & functions | 100% |
| RLS Policies | All tables secured | 100% |
| **Overall** | | **~40%** |

## 🔗 External Services

1. **Supabase** - Database PostgreSQL
   - Website: https://supabase.com
   - Docs: https://supabase.com/docs

2. **Better Auth** - Authentication Library
   - Website: https://better-auth.com
   - Docs: https://better-auth.com/docs

3. **Drizzle ORM** - Database ORM
   - Website: https://orm.drizzle.team
   - Docs: https://orm.drizzle.team/docs

4. **VIP Reseller** - Top-up Provider
   - Website: https://vip-reseller.co.id
   - API Docs: https://vip-reseller.co.id/api

5. **Xendit** - Payment Gateway
   - Website: https://xendit.co
   - Docs: https://developers.xendit.co
