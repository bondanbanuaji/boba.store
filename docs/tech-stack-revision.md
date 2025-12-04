# Revisi Tech Stack: Better Auth + Drizzle ORM + Supabase

> **Dokumen Revisi** - Pembaruan tech stack untuk authentication dan database ORM

---

## Perubahan Tech Stack

### Sebelumnya (SEAN Stack)
| Komponen | Teknologi |
|----------|-----------|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| ORM | Supabase JS Client |
| Backend | Express.js |
| Frontend | Astro |

### Sesudah (SEAN Stack + Better Auth + Drizzle)
| Komponen | Teknologi |
|----------|-----------|
| Database | Supabase (PostgreSQL) |
| Auth | **Better Auth** |
| ORM | **Drizzle ORM** |
| Backend | Express.js |
| Frontend | Astro |

---

## 1. Better Auth

### 1.1 Apa itu Better Auth?

Better Auth adalah authentication library modern untuk JavaScript/TypeScript yang:
- Framework-agnostic (bisa dipakai dengan Express, Astro, Next.js, dll)
- Type-safe dengan TypeScript
- Mendukung berbagai auth method (email/password, OAuth, magic link)
- Mudah dikustomisasi

### 1.2 Mengapa Better Auth?

| Fitur | Supabase Auth | Better Auth |
|-------|---------------|-------------|
| Self-hosted | ❌ | ✅ |
| Full control | Terbatas | ✅ |
| Custom tables | Terbatas | ✅ |
| Type safety | Partial | ✅ Full |
| Database agnostic | ❌ | ✅ |

### 1.3 Instalasi

```bash
# Backend
cd backend
npm install better-auth

# Frontend (Astro)
cd frontend
npm install @better-auth/client
```

### 1.4 Konfigurasi Backend

File: `backend/src/lib/auth.js`

```javascript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set true untuk production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
```

### 1.5 Konfigurasi Frontend (Astro)

File: `frontend/src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "@better-auth/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### 1.6 Integrasi dengan Express

File: `backend/src/routes/auth.js`

```javascript
import { auth } from "../lib/auth";
import { toNodeHandler } from "better-auth/node";

const router = express.Router();

// Mount Better Auth handler
router.all("/*", toNodeHandler(auth));

export default router;
```

---

## 2. Drizzle ORM

### 2.1 Apa itu Drizzle ORM?

Drizzle ORM adalah TypeScript ORM yang:
- Lightweight dan performant
- Type-safe queries
- SQL-like syntax
- Support migrations
- Zero dependencies

### 2.2 Mengapa Drizzle ORM?

| Fitur | Supabase Client | Drizzle ORM |
|-------|-----------------|-------------|
| Type safety | Partial | ✅ Full |
| Raw SQL access | Terbatas | ✅ |
| Migrations | Via Dashboard | ✅ CLI |
| Relations | Basic | ✅ Advanced |
| Bundle size | ~50KB | ~7KB |

### 2.3 Instalasi

```bash
cd backend
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### 2.4 Konfigurasi Database

File: `backend/src/lib/db.js`

```javascript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### 2.5 Schema Definition

File: `backend/src/db/schema.js`

```javascript
import { pgTable, uuid, text, timestamp, decimal, boolean, varchar, integer } from "drizzle-orm/pg-core";

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application tables
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  phone: varchar("phone", { length: 15 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"),
  role: varchar("role", { length: 20 }).default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 50 }),
  provider: varchar("provider", { length: 50 }),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  sku: varchar("sku", { length: 100 }).unique(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).default("0"),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  stockStatus: varchar("stock_status", { length: 20 }).default("available"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 50 }).unique().notNull(),
  userId: text("user_id").references(() => user.id),
  productId: uuid("product_id").references(() => products.id),
  targetId: varchar("target_id", { length: 100 }).notNull(),
  targetName: varchar("target_name", { length: 100 }),
  productName: text("product_name"),
  quantity: integer("quantity").default(1),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  adminFee: decimal("admin_fee", { precision: 15, scale: 2 }).default("0"),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  paymentStatus: varchar("payment_status", { length: 20 }).default("unpaid"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  providerTrxId: varchar("provider_trx_id", { length: 100 }),
  providerStatus: varchar("provider_status", { length: 50 }),
  providerSn: text("provider_sn"),
  paymentUrl: text("payment_url"),
  paymentExpiredAt: timestamp("payment_expired_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  userId: text("user_id").references(() => user.id),
  type: varchar("type", { length: 20 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 2.6 Drizzle Config

File: `backend/drizzle.config.js`

```javascript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### 2.7 Migration Commands

```bash
# Generate migration
npx drizzle-kit generate

# Push schema ke database (development)
npx drizzle-kit push

# Run migrations (production)
npx drizzle-kit migrate
```

---

## 3. Supabase Database Connection

### 3.1 Connection String

Supabase PostgreSQL connection string bisa didapat dari:
1. Supabase Dashboard → Project Settings → Database
2. Connection string format:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 3.2 Environment Variables

File: `backend/.env`

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# Existing configs...
PORT=3000
NODE_ENV=development
```

---

## 4. Contoh Penggunaan

### 4.1 Query dengan Drizzle

```javascript
import { db } from "./lib/db";
import { products, orders } from "./db/schema";
import { eq, desc } from "drizzle-orm";

// Get all products
const allProducts = await db.select().from(products);

// Get products by category
const gameProducts = await db
  .select()
  .from(products)
  .where(eq(products.category, "game"));

// Get orders with relations
const userOrders = await db
  .select()
  .from(orders)
  .where(eq(orders.userId, userId))
  .orderBy(desc(orders.createdAt));

// Insert new order
const newOrder = await db.insert(orders).values({
  orderNumber: "ORD-123",
  userId: userId,
  productId: productId,
  targetId: "123456",
  price: 10000,
  totalPrice: 11000,
}).returning();

// Update order status
await db
  .update(orders)
  .set({ status: "success", updatedAt: new Date() })
  .where(eq(orders.id, orderId));
```

### 4.2 Auth dengan Better Auth

```javascript
// Backend: Protected route
import { auth } from "./lib/auth";

app.get("/api/profile", async (req, res) => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Get user profile from database
  const profile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);
  
  res.json({ user: session.user, profile: profile[0] });
});
```

```javascript
// Frontend: Login
import { authClient } from "./lib/auth-client";

const handleLogin = async (email, password) => {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
  });
  
  if (error) {
    console.error("Login failed:", error);
    return;
  }
  
  // Redirect to dashboard
  window.location.href = "/dashboard";
};

// Frontend: Get session
const session = await authClient.getSession();
if (session) {
  console.log("Logged in as:", session.user.email);
}
```

---

## 5. Perubahan pada Project Structure

### Backend

```
backend/
├── src/
│   ├── db/
│   │   └── schema.js           ✨ NEW - Drizzle schema
│   ├── lib/
│   │   ├── auth.js             ✨ NEW - Better Auth config
│   │   └── db.js               ✨ NEW - Drizzle connection
│   ├── config/
│   │   └── payment.js          (existing)
│   ├── routes/
│   │   ├── auth.js             🔄 UPDATE - Better Auth handler
│   │   └── ...                 (existing)
│   └── index.js                🔄 UPDATE - Mount auth routes
├── drizzle/                    ✨ NEW - Migrations folder
├── drizzle.config.js           ✨ NEW - Drizzle config
└── package.json                🔄 UPDATE - New dependencies
```

### Frontend

```
frontend/
├── src/
│   ├── lib/
│   │   ├── auth-client.ts      ✨ NEW - Better Auth client
│   │   └── api.js              (existing)
│   ├── pages/
│   │   └── auth/
│   │       ├── login.astro     🔄 UPDATE - Use Better Auth
│   │       └── register.astro  🔄 UPDATE - Use Better Auth
│   └── ...
└── package.json                🔄 UPDATE - New dependencies
```

---

## 6. Migration dari Supabase Auth

### 6.1 Data Migration

Jika sudah ada user di Supabase Auth, perlu migrasi:

```sql
-- Export users dari Supabase auth.users ke Better Auth user table
INSERT INTO "user" (id, name, email, email_verified, created_at)
SELECT 
  id::text,
  COALESCE(raw_user_meta_data->>'full_name', email),
  email,
  email_confirmed_at IS NOT NULL,
  created_at
FROM auth.users;

-- Migrate password hashes ke account table
INSERT INTO account (id, user_id, account_id, provider_id, password, created_at)
SELECT 
  gen_random_uuid()::text,
  id::text,
  id::text,
  'credential',
  encrypted_password,
  created_at
FROM auth.users
WHERE encrypted_password IS NOT NULL;
```

### 6.2 Frontend Migration

Ganti semua penggunaan `@supabase/supabase-js` auth dengan `@better-auth/client`:

```javascript
// Before (Supabase)
import { supabase } from "./supabase";
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// After (Better Auth)
import { authClient } from "./auth-client";
const { data, error } = await authClient.signIn.email({ email, password });
```

---

## 7. Keuntungan Perubahan

1. **Type Safety** - Drizzle memberikan full TypeScript support
2. **Performance** - Drizzle lebih ringan dari Supabase client
3. **Control** - Better Auth memberikan kontrol penuh atas auth flow
4. **Migrations** - Drizzle Kit untuk database migrations
5. **Flexibility** - Mudah switch database provider jika diperlukan

---

*Dokumen ini merupakan revisi tech stack untuk Boba.Store*

*Terakhir diperbarui: Desember 2024*
