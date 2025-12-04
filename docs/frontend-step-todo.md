# Tutorial Frontend Lengkap - Boba.Store

> **Panduan Frontend** - Astro 5 + Better Auth + Tailwind CSS + TypeScript

---

## Daftar Isi

1. [Setup Project](#1-setup-project)
2. [Konfigurasi & Types](#2-konfigurasi--types)
3. [Authentication](#3-authentication)
4. [Layouts & Components](#4-layouts--components)
5. [Pages](#5-pages)
6. [Data Fetching](#6-data-fetching)
7. [Realtime Integration](#7-realtime-integration)
8. [Form Handling](#8-form-handling)
9. [Error & Loading States](#9-error--loading-states)
10. [Performance & SEO](#10-performance--seo)
11. [Testing & Deployment](#11-testing--deployment)

---

## 1. Setup Project

### 1.1 Inisialisasi Astro Project

```bash
# Create Astro project
npm create astro@latest frontend

# Pilih opsi:
# - Template: Empty
# - TypeScript: Yes (strict)
# - Install dependencies: Yes

cd frontend
```

### 1.2 Install Dependencies

```bash
# Core dependencies
npm install @better-auth/client
npm install @supabase/supabase-js

# UI & Styling
npm install @tailwindcss/vite tailwindcss

# Form & Validation
npm install zod

# Utilities
npm install clsx

# Development
npm install -D typescript @types/node
```

### 1.3 Konfigurasi Astro

File: `astro.config.mjs`

```javascript
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
  },
  security: {
    checkOrigin: true,
  },
});
```

### 1.4 Konfigurasi TypeScript

File: `tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"],
      "@lib/*": ["src/lib/*"],
      "@styles/*": ["src/styles/*"]
    },
    "strictNullChecks": true,
    "noImplicitAny": true
  },
  "include": ["src/**/*", "env.d.ts"],
  "exclude": ["node_modules"]
}
```

### 1.5 Environment Variables

File: `.env`

```env
# Backend API URL
PUBLIC_API_URL=http://localhost:3000

# Supabase (untuk Realtime)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

File: `src/env.d.ts`

```typescript
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 1.6 Struktur Folder

```
frontend/
├── src/
│   ├── components/
│   │   ├── atoms/           # Button, Input, Card, Badge, etc.
│   │   ├── widgets/         # Navbar, Footer, ProductCard, etc.
│   │   ├── sections/        # Hero, Categories, FeaturedProducts
│   │   └── forms/           # LoginForm, RegisterForm, OrderForm
│   ├── layouts/
│   │   ├── Layout.astro     # Base layout
│   │   ├── AuthLayout.astro # Auth pages layout
│   │   └── DashboardLayout.astro
│   ├── lib/
│   │   ├── auth-client.ts   # Better Auth client
│   │   ├── api.ts           # API client
│   │   ├── supabase.ts      # Supabase client (realtime)
│   │   ├── utils.ts         # Utility functions
│   │   └── types.ts         # TypeScript types
│   ├── pages/
│   │   ├── index.astro
│   │   ├── auth/
│   │   ├── products/
│   │   ├── dashboard/
│   │   ├── admin/
│   │   └── api/
│   └── styles/
│       └── global.css
├── public/
│   └── images/
├── astro.config.mjs
├── tsconfig.json
└── package.json
```

---

## 2. Konfigurasi & Types

### 2.1 TypeScript Types

File: `src/lib/types.ts`

```typescript
// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface AuthSession {
  user: User;
  session: Session;
}

export interface Profile {
  id: string;
  fullName: string | null;
  phone: string | null;
  balance: number;
  role: 'user' | 'admin' | 'reseller';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PRODUCT TYPES
// ============================================

export type ProductCategory = 'game' | 'pulsa' | 'ewallet' | 'pln' | 'voucher';
export type StockStatus = 'available' | 'limited' | 'empty';

export interface Product {
  id: string;
  category: ProductCategory;
  provider: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  discount: number;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  stockStatus: StockStatus;
  minQty: number;
  maxQty: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductGroup {
  provider: string;
  providerName: string;
  imageUrl: string;
  products: Product[];
}

// ============================================
// ORDER TYPES
// ============================================

export type OrderStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'expired' | 'refunded';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  productId: string | null;
  targetId: string;
  targetName: string | null;
  targetServer: string | null;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  adminFee: number;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  providerTrxId: string | null;
  providerStatus: string | null;
  providerSn: string | null;
  providerMessage: string | null;
  paymentId: string | null;
  paymentUrl: string | null;
  paymentExpiredAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type TransactionType = 'topup' | 'purchase' | 'refund' | 'bonus' | 'adjustment';

export interface Transaction {
  id: string;
  userId: string;
  orderId: string | null;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// FORM TYPES
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface OrderFormData {
  productId: string;
  targetId: string;
  targetServer?: string;
  quantity: number;
  paymentMethod: string;
}

export interface ProfileFormData {
  fullName: string;
  phone: string;
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface Settings {
  adminFee: number;
  minTopup: number;
  maxTopup: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  contactWhatsapp: string;
  contactEmail: string;
}
```

### 2.2 Better Auth Client

File: `src/lib/auth-client.ts`

```typescript
import { createAuthClient } from '@better-auth/client';
import type { AuthSession, User } from './types';

const API_URL = import.meta.env.PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('PUBLIC_API_URL environment variable is required');
}

export const authClient = createAuthClient({
  baseURL: API_URL,
});

// ============================================
// AUTH FUNCTIONS
// ============================================

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ data: AuthSession | null; error: Error | null }> {
  try {
    const result = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }

    return { data: result.data as AuthSession, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Registration failed') 
    };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ data: AuthSession | null; error: Error | null }> {
  try {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }

    return { data: result.data as AuthSession, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Login failed') 
    };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    await authClient.signOut();
    return { error: null };
  } catch (error) {
    return { 
      error: error instanceof Error ? error : new Error('Logout failed') 
    };
  }
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const session = await authClient.getSession();
    return session.data as AuthSession | null;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

// ============================================
// SERVER-SIDE AUTH (untuk Astro pages)
// ============================================

export async function getSessionFromRequest(
  request: Request
): Promise<AuthSession | null> {
  try {
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: {
        cookie: cookies,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as AuthSession;
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request): Promise<AuthSession> {
  const session = await getSessionFromRequest(request);
  
  if (!session) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: '/auth/login?redirect=' + new URL(request.url).pathname,
      },
    });
  }

  return session;
}

export async function requireAdmin(request: Request): Promise<AuthSession> {
  const session = await requireAuth(request);
  
  // Fetch profile to check role
  const cookies = request.headers.get('cookie') || '';
  const response = await fetch(`${API_URL}/api/profile`, {
    headers: { cookie: cookies },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/dashboard' },
    });
  }

  const profile = await response.json();
  
  if (profile.data?.role !== 'admin') {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/dashboard' },
    });
  }

  return session;
}
```

### 2.3 API Client

File: `src/lib/api.ts`

```typescript
import type { 
  ApiResponse, 
  PaginatedResponse,
  Product, 
  Order, 
  Transaction,
  Profile,
  Settings,
  OrderFormData
} from './types';

const API_URL = import.meta.env.PUBLIC_API_URL;

// ============================================
// BASE FETCH FUNCTION
// ============================================

interface FetchOptions extends RequestInit {
  timeout?: number;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Request failed',
      };
    }

    return {
      success: true,
      data: data.data ?? data,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Request timeout' };
      }
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Network error' };
  }
}

// ============================================
// PRODUCTS API
// ============================================

export async function getProducts(
  category?: string
): Promise<ApiResponse<Product[]>> {
  const endpoint = category ? `/api/products/${category}` : '/api/products';
  return fetchApi<Product[]>(endpoint);
}

export async function getProductBySlug(
  slug: string
): Promise<ApiResponse<Product>> {
  return fetchApi<Product>(`/api/products/detail/${slug}`);
}

export async function getProductsByProvider(
  provider: string
): Promise<ApiResponse<Product[]>> {
  return fetchApi<Product[]>(`/api/products/provider/${provider}`);
}

export async function checkTargetId(
  productId: string,
  targetId: string,
  targetServer?: string
): Promise<ApiResponse<{ valid: boolean; name: string }>> {
  return fetchApi('/api/products/check-target', {
    method: 'POST',
    body: JSON.stringify({ productId, targetId, targetServer }),
  });
}

// ============================================
// ORDERS API
// ============================================

export async function createOrder(
  data: OrderFormData,
  cookies?: string
): Promise<ApiResponse<Order>> {
  return fetchApi<Order>('/api/orders/create', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

export async function getOrder(
  orderId: string,
  cookies?: string
): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/api/orders/${orderId}`, {
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

export async function getOrderByNumber(
  orderNumber: string
): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/api/orders/number/${orderNumber}`);
}

export async function getUserOrders(
  cookies?: string,
  page = 1,
  limit = 10
): Promise<PaginatedResponse<Order>> {
  const response = await fetchApi<Order[]>(
    `/api/orders/user/history?page=${page}&limit=${limit}`,
    { headers: cookies ? { cookie: cookies } : undefined }
  );

  if (!response.success) {
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0 },
    };
  }

  return response as unknown as PaginatedResponse<Order>;
}

export async function cancelOrder(
  orderId: string,
  cookies?: string
): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

// ============================================
// PROFILE API
// ============================================

export async function getProfile(
  cookies?: string
): Promise<ApiResponse<Profile>> {
  return fetchApi<Profile>('/api/profile', {
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

export async function updateProfile(
  data: { fullName?: string; phone?: string },
  cookies?: string
): Promise<ApiResponse<Profile>> {
  return fetchApi<Profile>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

// ============================================
// TRANSACTIONS API
// ============================================

export async function getTransactions(
  cookies?: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Transaction>> {
  const response = await fetchApi<Transaction[]>(
    `/api/transactions?page=${page}&limit=${limit}`,
    { headers: cookies ? { cookie: cookies } : undefined }
  );

  if (!response.success) {
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0 },
    };
  }

  return response as unknown as PaginatedResponse<Transaction>;
}

// ============================================
// SETTINGS API
// ============================================

export async function getPublicSettings(): Promise<ApiResponse<Settings>> {
  return fetchApi<Settings>('/api/settings/public');
}

// ============================================
// ADMIN API
// ============================================

export async function getAdminDashboard(
  cookies: string
): Promise<ApiResponse<{
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  todayOrders: number;
}>> {
  return fetchApi('/api/admin/dashboard', {
    headers: { cookie: cookies },
  });
}

export async function getAllOrders(
  cookies: string,
  page = 1,
  limit = 20,
  status?: string
): Promise<PaginatedResponse<Order>> {
  let endpoint = `/api/admin/orders?page=${page}&limit=${limit}`;
  if (status) endpoint += `&status=${status}`;
  
  const response = await fetchApi<Order[]>(endpoint, {
    headers: { cookie: cookies },
  });

  return response as unknown as PaginatedResponse<Order>;
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  cookies: string
): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/api/admin/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { cookie: cookies },
  });
}
```

### 2.4 Supabase Client (untuk Realtime)

File: `src/lib/supabase.ts`

```typescript
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Order, Profile } from './types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Realtime features disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToOrderUpdates(
  userId: string,
  onUpdate: (order: Order) => void
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel(`orders-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new as Order);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToBalanceUpdates(
  userId: string,
  onUpdate: (balance: number) => void
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel(`profile-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const profile = payload.new as Profile;
        onUpdate(profile.balance);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToNewOrders(
  onNewOrder: (order: Order) => void
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel('admin-orders')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
      },
      (payload) => {
        onNewOrder(payload.new as Order);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel | null): void {
  if (channel && supabase) {
    supabase.removeChannel(channel);
  }
}
```

### 2.5 Utility Functions

File: `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';

// ============================================
// CLASS NAME UTILITY
// ============================================

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ============================================
// CURRENCY FORMATTING
// ============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

// ============================================
// DATE FORMATTING
// ============================================

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  
  return formatDateShort(date);
}

// ============================================
// STATUS HELPERS
// ============================================

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    refunded: 'bg-purple-100 text-purple-800',
    unpaid: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    expired: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu',
    processing: 'Diproses',
    success: 'Berhasil',
    failed: 'Gagal',
    cancelled: 'Dibatalkan',
    refunded: 'Dikembalikan',
    unpaid: 'Belum Bayar',
    paid: 'Sudah Bayar',
    expired: 'Kadaluarsa',
  };
  return labels[status] || status;
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{7,10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

// ============================================
// SLUG HELPERS
// ============================================

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// PROVIDER HELPERS
// ============================================

export function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    'mobile-legends': 'Mobile Legends',
    'free-fire': 'Free Fire',
    'pubg-mobile': 'PUBG Mobile',
    'genshin-impact': 'Genshin Impact',
    'valorant': 'Valorant',
    'telkomsel': 'Telkomsel',
    'indosat': 'Indosat',
    'xl': 'XL Axiata',
    'tri': 'Tri',
    'smartfren': 'Smartfren',
    'dana': 'DANA',
    'ovo': 'OVO',
    'gopay': 'GoPay',
    'shopeepay': 'ShopeePay',
    'linkaja': 'LinkAja',
  };
  return names[provider] || provider;
}

export function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    game: 'Voucher Game',
    pulsa: 'Pulsa & Data',
    ewallet: 'E-Wallet',
    pln: 'Token PLN',
    voucher: 'Voucher Lainnya',
  };
  return names[category] || category;
}

// ============================================
// COPY TO CLIPBOARD
// ============================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// ============================================
// DEBOUNCE
// ============================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

---

## 3. Authentication

### 3.1 Login Page

File: `src/pages/auth/login.astro`

```astro
---
import AuthLayout from '@layouts/AuthLayout.astro';
import { getSessionFromRequest } from '@lib/auth-client';

// Redirect if already logged in
const session = await getSessionFromRequest(Astro.request);
if (session) {
  return Astro.redirect('/dashboard');
}

const redirectTo = Astro.url.searchParams.get('redirect') || '/dashboard';
---

<AuthLayout title="Login">
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Masuk ke Akun</h1>
        <p class="mt-2 text-gray-600">
          Belum punya akun?
          <a href="/auth/register" class="text-blue-600 hover:text-blue-500 font-medium">
            Daftar sekarang
          </a>
        </p>
      </div>

      <!-- Form -->
      <form id="loginForm" class="mt-8 space-y-6">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <!-- Error Alert -->
        <div id="errorAlert" class="hidden rounded-lg bg-red-50 p-4">
          <p id="errorMessage" class="text-sm text-red-700"></p>
        </div>

        <div class="space-y-4">
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 
                     focus:border-blue-500 focus:ring-blue-500 focus:outline-none
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="nama@email.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div class="relative mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                minlength="8"
                class="block w-full rounded-lg border border-gray-300 px-4 py-3 pr-12
                       focus:border-blue-500 focus:ring-blue-500 focus:outline-none
                       disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Masukkan password"
              />
              <button
                type="button"
                id="togglePassword"
                class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                aria-label="Toggle password visibility"
              >
                <svg id="eyeIcon" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          id="submitBtn"
          class="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 
                 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 
                 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors duration-200"
        >
          <span id="btnText">Masuk</span>
          <svg id="btnSpinner" class="hidden animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </form>

      <!-- Forgot Password -->
      <p class="text-center text-sm text-gray-600">
        <a href="/auth/forgot-password" class="text-blue-600 hover:text-blue-500">
          Lupa password?
        </a>
      </p>
    </div>
  </div>
</AuthLayout>

<script>
  import { signIn } from '@lib/auth-client';

  const form = document.getElementById('loginForm') as HTMLFormElement;
  const errorAlert = document.getElementById('errorAlert') as HTMLDivElement;
  const errorMessage = document.getElementById('errorMessage') as HTMLParagraphElement;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
  const btnText = document.getElementById('btnText') as HTMLSpanElement;
  const btnSpinner = document.getElementById('btnSpinner') as SVGElement;
  const togglePassword = document.getElementById('togglePassword') as HTMLButtonElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;

  // Toggle password visibility
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset error state
    errorAlert.classList.add('hidden');

    // Get form data
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const redirectTo = formData.get('redirectTo') as string;

    // Validate
    if (!email || !password) {
      showError('Email dan password wajib diisi');
      return;
    }

    // Show loading
    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        showError(error.message || 'Login gagal. Periksa email dan password Anda.');
        return;
      }

      if (data) {
        // Redirect on success
        window.location.href = redirectTo;
      }
    } catch (err) {
      showError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  });

  function showError(message: string) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setLoading(loading: boolean) {
    submitBtn.disabled = loading;
    btnText.textContent = loading ? 'Memproses...' : 'Masuk';
    btnSpinner.classList.toggle('hidden', !loading);
    
    // Disable form inputs
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => input.disabled = loading);
  }
</script>
```

### 3.2 Register Page

File: `src/pages/auth/register.astro`

```astro
---
import AuthLayout from '@layouts/AuthLayout.astro';
import { getSessionFromRequest } from '@lib/auth-client';

// Redirect if already logged in
const session = await getSessionFromRequest(Astro.request);
if (session) {
  return Astro.redirect('/dashboard');
}
---

<AuthLayout title="Daftar">
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Buat Akun Baru</h1>
        <p class="mt-2 text-gray-600">
          Sudah punya akun?
          <a href="/auth/login" class="text-blue-600 hover:text-blue-500 font-medium">
            Masuk di sini
          </a>
        </p>
      </div>

      <!-- Form -->
      <form id="registerForm" class="mt-8 space-y-6">
        <!-- Error Alert -->
        <div id="errorAlert" class="hidden rounded-lg bg-red-50 p-4">
          <p id="errorMessage" class="text-sm text-red-700"></p>
        </div>

        <!-- Success Alert -->
        <div id="successAlert" class="hidden rounded-lg bg-green-50 p-4">
          <p class="text-sm text-green-700">
            Registrasi berhasil! Mengalihkan ke dashboard...
          </p>
        </div>

        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autocomplete="name"
              required
              minlength="3"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 
                     focus:border-blue-500 focus:ring-blue-500 focus:outline-none
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Nama lengkap"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 
                     focus:border-blue-500 focus:ring-blue-500 focus:outline-none
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="nama@email.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 
                     focus:border-blue-500 focus:ring-blue-500 focus:outline-none
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Minimal 8 karakter"
            />
            <p class="mt-1 text-xs text-gray-500">Minimal 8 karakter</p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              Konfirmasi Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              minlength="8"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 
                     focus:border-blue-500 focus:ring-blue-500 focus:outline-none
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Ulangi password"
            />
          </div>
        </div>

        <!-- Terms -->
        <div class="flex items-start">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            class="h-4 w-4 mt-1 rounded border-gray-300 text-blue-600 
                   focus:ring-blue-500"
          />
          <label for="terms" class="ml-2 text-sm text-gray-600">
            Saya menyetujui
            <a href="/terms" class="text-blue-600 hover:text-blue-500">Syarat & Ketentuan</a>
            dan
            <a href="/privacy" class="text-blue-600 hover:text-blue-500">Kebijakan Privasi</a>
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          id="submitBtn"
          class="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 
                 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 
                 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors duration-200"
        >
          <span id="btnText">Daftar</span>
          <svg id="btnSpinner" class="hidden animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </form>
    </div>
  </div>
</AuthLayout>

<script>
  import { signUp } from '@lib/auth-client';
  import { isValidEmail } from '@lib/utils';

  const form = document.getElementById('registerForm') as HTMLFormElement;
  const errorAlert = document.getElementById('errorAlert') as HTMLDivElement;
  const errorMessage = document.getElementById('errorMessage') as HTMLParagraphElement;
  const successAlert = document.getElementById('successAlert') as HTMLDivElement;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
  const btnText = document.getElementById('btnText') as HTMLSpanElement;
  const btnSpinner = document.getElementById('btnSpinner') as SVGElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset states
    errorAlert.classList.add('hidden');
    successAlert.classList.add('hidden');

    // Get form data
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate
    if (!name || name.length < 3) {
      showError('Nama minimal 3 karakter');
      return;
    }

    if (!isValidEmail(email)) {
      showError('Format email tidak valid');
      return;
    }

    if (password.length < 8) {
      showError('Password minimal 8 karakter');
      return;
    }

    if (password !== confirmPassword) {
      showError('Password tidak cocok');
      return;
    }

    // Show loading
    setLoading(true);

    try {
      const { data, error } = await signUp(name, email, password);

      if (error) {
        showError(error.message || 'Registrasi gagal. Silakan coba lagi.');
        return;
      }

      if (data) {
        successAlert.classList.remove('hidden');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      }
    } catch (err) {
      showError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  });

  function showError(message: string) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setLoading(loading: boolean) {
    submitBtn.disabled = loading;
    btnText.textContent = loading ? 'Memproses...' : 'Daftar';
    btnSpinner.classList.toggle('hidden', !loading);
    
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => input.disabled = loading);
  }
</script>
```

### 3.3 Protected Route Middleware

File: `src/middleware.ts`

```typescript
import { defineMiddleware } from 'astro:middleware';
import { getSessionFromRequest } from './lib/auth-client';

const protectedRoutes = ['/dashboard', '/admin', '/checkout'];
const authRoutes = ['/auth/login', '/auth/register'];
const adminRoutes = ['/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const request = context.request;

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isAuthRoute) {
    const session = await getSessionFromRequest(request);

    // Redirect logged-in users away from auth pages
    if (isAuthRoute && session) {
      return context.redirect('/dashboard');
    }

    // Redirect non-authenticated users to login
    if (isProtectedRoute && !session) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
      return context.redirect(redirectUrl);
    }

    // Check admin access
    if (isAdminRoute && session) {
      const API_URL = import.meta.env.PUBLIC_API_URL;
      const cookies = request.headers.get('cookie') || '';
      
      try {
        const response = await fetch(`${API_URL}/api/profile`, {
          headers: { cookie: cookies },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.role !== 'admin') {
            return context.redirect('/dashboard');
          }
        } else {
          return context.redirect('/dashboard');
        }
      } catch {
        return context.redirect('/dashboard');
      }
    }

    // Add session to locals for use in pages
    if (session) {
      context.locals.session = session;
      context.locals.user = session.user;
    }
  }

  return next();
});
```

File: `src/env.d.ts` (tambahan untuk locals)

```typescript
/// <reference path="../.astro/types.d.ts" />

import type { AuthSession, User } from './lib/types';

declare global {
  namespace App {
    interface Locals {
      session?: AuthSession;
      user?: User;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
```

---

## 4. Layouts & Components

### 4.1 Base Layout

File: `src/layouts/Layout.astro`

```astro
---
import '@styles/global.css';
import Navbar from '@components/widgets/Navbar.astro';
import Footer from '@components/widgets/Footer.astro';

interface Props {
  title: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

const { 
  title, 
  description = 'Boba Store - Platform top-up game, pulsa, dan e-wallet tercepat dan terpercaya.',
  image = '/images/og-image.jpg',
  noIndex = false 
} = Astro.props;

const canonicalUrl = new URL(Astro.url.pathname, Astro.site);
---

<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  
  <!-- SEO -->
  <title>{title} | Boba Store</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalUrl} />
  {noIndex && <meta name="robots" content="noindex, nofollow" />}
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={`${title} | Boba Store`} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={new URL(image, Astro.site)} />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={`${title} | Boba Store`} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={new URL(image, Astro.site)} />
  
  <!-- Preconnect -->
  <link rel="preconnect" href={import.meta.env.PUBLIC_API_URL} />
  
  <!-- Theme Color -->
  <meta name="theme-color" content="#2563eb" />
</head>
<body class="min-h-screen flex flex-col bg-gray-50">
  <Navbar />
  
  <main class="flex-1">
    <slot />
  </main>
  
  <Footer />
  
  <!-- Toast Container -->
  <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>
</body>
</html>
```

### 4.2 Dashboard Layout

File: `src/layouts/DashboardLayout.astro`

```astro
---
import '@styles/global.css';
import { getSessionFromRequest } from '@lib/auth-client';
import { getProfile } from '@lib/api';
import { formatCurrency } from '@lib/utils';
import type { Profile } from '@lib/types';

interface Props {
  title: string;
}

const { title } = Astro.props;

// Get session (middleware already validates)
const session = await getSessionFromRequest(Astro.request);
const cookies = Astro.request.headers.get('cookie') || '';

// Fetch profile
let profile: Profile | null = null;
if (session) {
  const profileRes = await getProfile(cookies);
  if (profileRes.success && profileRes.data) {
    profile = profileRes.data;
  }
}

const user = session?.user;
const isAdmin = profile?.role === 'admin';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/dashboard/history', label: 'Riwayat Order', icon: 'list' },
  { href: '/dashboard/profile', label: 'Profil', icon: 'user' },
];

const adminItems = [
  { href: '/admin', label: 'Admin Dashboard', icon: 'chart' },
  { href: '/admin/orders', label: 'Kelola Order', icon: 'orders' },
  { href: '/admin/products', label: 'Kelola Produk', icon: 'products' },
];

const currentPath = Astro.url.pathname;
---

<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>{title} | Boba Store</title>
  <meta name="robots" content="noindex, nofollow" />
</head>
<body class="min-h-screen bg-gray-100">
  <div class="flex">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform -translate-x-full lg:translate-x-0 transition-transform duration-300" id="sidebar">
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="flex items-center justify-between h-16 px-6 border-b">
          <a href="/" class="text-xl font-bold text-blue-600">Boba Store</a>
          <button id="closeSidebar" class="lg:hidden text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- User Info -->
        <div class="px-6 py-4 border-b bg-gray-50">
          <p class="font-medium text-gray-900 truncate">{user?.name}</p>
          <p class="text-sm text-gray-500 truncate">{user?.email}</p>
          {profile && (
            <p class="mt-2 text-lg font-bold text-blue-600">
              {formatCurrency(profile.balance)}
            </p>
          )}
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-4 py-4 overflow-y-auto">
          <ul class="space-y-1">
            {navItems.map(item => (
              <li>
                <a
                  href={item.href}
                  class:list={[
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    currentPath === item.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  ]}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <>
              <div class="my-4 border-t" />
              <p class="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
              <ul class="mt-2 space-y-1">
                {adminItems.map(item => (
                  <li>
                    <a
                      href={item.href}
                      class:list={[
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        currentPath === item.href
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      ]}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <!-- Logout -->
        <div class="p-4 border-t">
          <button
            id="logoutBtn"
            class="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      </div>
    </aside>

    <!-- Overlay -->
    <div id="sidebarOverlay" class="fixed inset-0 z-30 bg-black/50 lg:hidden hidden"></div>

    <!-- Main Content -->
    <div class="flex-1 lg:ml-64">
      <!-- Top Bar -->
      <header class="sticky top-0 z-20 h-16 bg-white shadow-sm">
        <div class="flex items-center justify-between h-full px-4 lg:px-8">
          <button id="openSidebar" class="lg:hidden text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 class="text-lg font-semibold text-gray-900">{title}</h1>
          <a href="/" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Kembali ke Home
          </a>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>

  <script>
    import { signOut } from '@lib/auth-client';

    // Sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const openBtn = document.getElementById('openSidebar');
    const closeBtn = document.getElementById('closeSidebar');

    function toggleSidebar(open: boolean) {
      sidebar?.classList.toggle('-translate-x-full', !open);
      overlay?.classList.toggle('hidden', !open);
    }

    openBtn?.addEventListener('click', () => toggleSidebar(true));
    closeBtn?.addEventListener('click', () => toggleSidebar(false));
    overlay?.addEventListener('click', () => toggleSidebar(false));

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', async () => {
      const confirmed = confirm('Yakin ingin keluar?');
      if (!confirmed) return;

      const { error } = await signOut();
      if (!error) {
        window.location.href = '/';
      }
    });
  </script>
</body>
</html>
```

### 4.3 Button Component

File: `src/components/atoms/Button.astro`

```astro
---
import { cn } from '@lib/utils';

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  class?: string;
  href?: string;
}

const {
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  class: className,
  href,
  ...props
} = Astro.props;

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const baseStyles = cn(
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-colors duration-200',
  variants[variant],
  sizes[size],
  fullWidth && 'w-full',
  className
);

const Tag = href ? 'a' : 'button';
---

{href ? (
  <a href={href} class={baseStyles} {...props}>
    {loading && (
      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )}
    <slot />
  </a>
) : (
  <button type={type} disabled={disabled || loading} class={baseStyles} {...props}>
    {loading && (
      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )}
    <slot />
  </button>
)}
```

### 4.4 Input Component

File: `src/components/atoms/Input.astro`

```astro
---
import { cn } from '@lib/utils';

interface Props {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'search';
  name: string;
  id?: string;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  minlength?: number;
  maxlength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  autocomplete?: string;
  error?: string;
  label?: string;
  hint?: string;
  class?: string;
}

const {
  type = 'text',
  name,
  id = name,
  value,
  placeholder,
  required = false,
  disabled = false,
  readonly = false,
  minlength,
  maxlength,
  min,
  max,
  pattern,
  autocomplete,
  error,
  label,
  hint,
  class: className,
  ...props
} = Astro.props;

const inputStyles = cn(
  'block w-full rounded-lg border px-4 py-3',
  'focus:outline-none focus:ring-2 focus:ring-offset-0',
  'disabled:bg-gray-100 disabled:cursor-not-allowed',
  'transition-colors duration-200',
  error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
  className
);
---

<div class="space-y-1">
  {label && (
    <label for={id} class="block text-sm font-medium text-gray-700">
      {label}
      {required && <span class="text-red-500">*</span>}
    </label>
  )}
  
  <input
    type={type}
    id={id}
    name={name}
    value={value}
    placeholder={placeholder}
    required={required}
    disabled={disabled}
    readonly={readonly}
    minlength={minlength}
    maxlength={maxlength}
    min={min}
    max={max}
    pattern={pattern}
    autocomplete={autocomplete}
    class={inputStyles}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
    {...props}
  />
  
  {hint && !error && (
    <p id={`${id}-hint`} class="text-xs text-gray-500">{hint}</p>
  )}
  
  {error && (
    <p id={`${id}-error`} class="text-xs text-red-600" role="alert">{error}</p>
  )}
</div>
```

### 4.5 Card Component

File: `src/components/atoms/Card.astro`

```astro
---
import { cn } from '@lib/utils';

interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  class?: string;
}

const {
  padding = 'md',
  hover = false,
  class: className,
} = Astro.props;

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const styles = cn(
  'bg-white rounded-xl shadow-sm border border-gray-100',
  paddingStyles[padding],
  hover && 'hover:shadow-md hover:border-gray-200 transition-shadow cursor-pointer',
  className
);
---

<div class={styles}>
  <slot />
</div>
```

### 4.6 Badge Component

File: `src/components/atoms/Badge.astro`

```astro
---
import { cn } from '@lib/utils';

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  class?: string;
}

const {
  variant = 'default',
  size = 'md',
  class: className,
} = Astro.props;

const variants = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

const styles = cn(
  'inline-flex items-center font-medium rounded-full',
  variants[variant],
  sizes[size],
  className
);
---

<span class={styles}>
  <slot />
</span>
```

### 4.7 Product Card

File: `src/components/widgets/ProductCard.astro`

```astro
---
import Card from '@components/atoms/Card.astro';
import Badge from '@components/atoms/Badge.astro';
import { formatCurrency } from '@lib/utils';
import type { Product } from '@lib/types';

interface Props {
  product: Product;
}

const { product } = Astro.props;

const finalPrice = product.price - product.discount;
const hasDiscount = product.discount > 0;
const isAvailable = product.stockStatus === 'available';
---

<a href={`/products/${product.slug}`} class="block group">
  <Card hover padding="none">
    <!-- Image -->
    <div class="relative aspect-square overflow-hidden rounded-t-xl bg-gray-100">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        <div class="flex items-center justify-center h-full text-gray-400">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      
      {hasDiscount && (
        <Badge variant="danger" size="sm" class="absolute top-2 right-2">
          -{Math.round((product.discount / product.price) * 100)}%
        </Badge>
      )}
      
      {!isAvailable && (
        <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Badge variant="default" size="md">Stok Habis</Badge>
        </div>
      )}
    </div>

    <!-- Info -->
    <div class="p-4">
      <h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
        {product.name}
      </h3>
      
      <div class="mt-2 flex items-center gap-2">
        {hasDiscount && (
          <span class="text-sm text-gray-400 line-through">
            {formatCurrency(product.price)}
          </span>
        )}
        <span class="text-lg font-bold text-blue-600">
          {formatCurrency(finalPrice)}
        </span>
      </div>
    </div>
  </Card>
</a>
```

### 4.8 Navbar

File: `src/components/widgets/Navbar.astro`

```astro
---
import { getSessionFromRequest } from '@lib/auth-client';
import Button from '@components/atoms/Button.astro';

const session = await getSessionFromRequest(Astro.request);
const user = session?.user;

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products/game', label: 'Game' },
  { href: '/products/pulsa', label: 'Pulsa' },
  { href: '/products/ewallet', label: 'E-Wallet' },
];

const currentPath = Astro.url.pathname;
---

<nav class="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-2">
        <span class="text-2xl font-bold text-blue-600">Boba</span>
        <span class="text-2xl font-bold text-gray-900">Store</span>
      </a>

      <!-- Desktop Navigation -->
      <div class="hidden md:flex items-center gap-8">
        {navLinks.map(link => (
          <a
            href={link.href}
            class:list={[
              'text-sm font-medium transition-colors',
              currentPath === link.href
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            ]}
          >
            {link.label}
          </a>
        ))}
      </div>

      <!-- Auth Buttons -->
      <div class="flex items-center gap-3">
        {user ? (
          <>
            <a 
              href="/dashboard"
              class="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <span class="truncate max-w-[120px]">{user.name}</span>
            </a>
            <Button href="/dashboard" size="sm">Dashboard</Button>
          </>
        ) : (
          <>
            <a href="/auth/login" class="text-sm font-medium text-gray-600 hover:text-blue-600">
              Masuk
            </a>
            <Button href="/auth/register" size="sm">Daftar</Button>
          </>
        )}

        <!-- Mobile Menu Button -->
        <button id="mobileMenuBtn" class="md:hidden text-gray-600 hover:text-blue-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile Menu -->
  <div id="mobileMenu" class="hidden md:hidden border-t">
    <div class="px-4 py-3 space-y-1">
      {navLinks.map(link => (
        <a
          href={link.href}
          class:list={[
            'block px-3 py-2 rounded-lg text-sm font-medium',
            currentPath === link.href
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-600 hover:bg-gray-50'
          ]}
        >
          {link.label}
        </a>
      ))}
    </div>
  </div>
</nav>

<script>
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  menuBtn?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('hidden');
  });
</script>
```

---

## 5. Pages

### 5.1 Homepage

File: `src/pages/index.astro`

```astro
---
import Layout from '@layouts/Layout.astro';
import Card from '@components/atoms/Card.astro';
import ProductCard from '@components/widgets/ProductCard.astro';
import Button from '@components/atoms/Button.astro';
import { getProducts } from '@lib/api';
import { getCategoryName, getProviderName } from '@lib/utils';
import type { Product, ProductCategory } from '@lib/types';

// Fetch products
const productsResponse = await getProducts();
const allProducts = productsResponse.success ? productsResponse.data || [] : [];

// Group products by category
const categories: ProductCategory[] = ['game', 'pulsa', 'ewallet'];
const productsByCategory = categories.reduce((acc, category) => {
  acc[category] = allProducts
    .filter(p => p.category === category)
    .slice(0, 8);
  return acc;
}, {} as Record<ProductCategory, Product[]>);

// Featured products (with discount)
const featuredProducts = allProducts
  .filter(p => p.discount > 0)
  .slice(0, 4);
---

<Layout title="Home">
  <!-- Hero Section -->
  <section class="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white overflow-hidden">
    <div class="absolute inset-0 bg-grid-white/10" />
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
      <div class="max-w-2xl">
        <h1 class="text-4xl lg:text-5xl font-bold leading-tight">
          Top-Up Game & Pulsa
          <span class="text-yellow-400">Tercepat</span>
        </h1>
        <p class="mt-6 text-lg text-blue-100">
          Isi diamond, voucher game, pulsa, dan e-wallet dengan harga termurah. 
          Proses instan 24 jam non-stop.
        </p>
        <div class="mt-8 flex flex-wrap gap-4">
          <Button href="/products/game" size="lg" variant="secondary">
            Top-Up Game
          </Button>
          <Button href="/products/pulsa" size="lg" variant="outline" class="border-white text-white hover:bg-white/10">
            Beli Pulsa
          </Button>
        </div>
      </div>
    </div>
  </section>

  <!-- Categories -->
  <section class="py-12 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/products/game', icon: '🎮', label: 'Voucher Game', color: 'bg-purple-50 hover:bg-purple-100' },
          { href: '/products/pulsa', icon: '📱', label: 'Pulsa & Data', color: 'bg-blue-50 hover:bg-blue-100' },
          { href: '/products/ewallet', icon: '💳', label: 'E-Wallet', color: 'bg-green-50 hover:bg-green-100' },
          { href: '/products/pln', icon: '⚡', label: 'Token PLN', color: 'bg-yellow-50 hover:bg-yellow-100' },
        ].map(cat => (
          <a href={cat.href} class={`${cat.color} rounded-xl p-6 text-center transition-colors`}>
            <span class="text-4xl">{cat.icon}</span>
            <p class="mt-2 font-semibold text-gray-900">{cat.label}</p>
          </a>
        ))}
      </div>
    </div>
  </section>

  <!-- Featured Products -->
  {featuredProducts.length > 0 && (
    <section class="py-12 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold text-gray-900">Promo Spesial</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          {featuredProducts.map(product => (
            <ProductCard product={product} />
          ))}
        </div>
      </div>
    </section>
  )}

  <!-- Products by Category -->
  {categories.map(category => (
    productsByCategory[category].length > 0 && (
      <section class="py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-bold text-gray-900">{getCategoryName(category)}</h2>
            <a href={`/products/${category}`} class="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Lihat Semua →
            </a>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {productsByCategory[category].map(product => (
              <ProductCard product={product} />
            ))}
          </div>
        </div>
      </section>
    )
  ))}

  <!-- Trust Badges -->
  <section class="py-12 bg-gray-900 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { value: '100K+', label: 'Transaksi Sukses' },
          { value: '50K+', label: 'Pengguna Aktif' },
          { value: '24/7', label: 'Layanan Non-Stop' },
          { value: '⭐ 4.9', label: 'Rating Pengguna' },
        ].map(stat => (
          <div>
            <p class="text-3xl font-bold text-blue-400">{stat.value}</p>
            <p class="mt-1 text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
</Layout>
```

### 5.2 Product Category Page

File: `src/pages/products/[category].astro`

```astro
---
import Layout from '@layouts/Layout.astro';
import ProductCard from '@components/widgets/ProductCard.astro';
import { getProducts } from '@lib/api';
import { getCategoryName, getProviderName } from '@lib/utils';
import type { Product, ProductCategory } from '@lib/types';

// Validate category
const { category } = Astro.params;
const validCategories: ProductCategory[] = ['game', 'pulsa', 'ewallet', 'pln', 'voucher'];

if (!category || !validCategories.includes(category as ProductCategory)) {
  return Astro.redirect('/404');
}

// Fetch products
const response = await getProducts(category);
const products = response.success ? response.data || [] : [];

// Group by provider
const providers = [...new Set(products.map(p => p.provider))];
const productsByProvider = providers.reduce((acc, provider) => {
  acc[provider] = products.filter(p => p.provider === provider);
  return acc;
}, {} as Record<string, Product[]>);

const categoryName = getCategoryName(category);
---

<Layout 
  title={categoryName}
  description={`Top-up ${categoryName} murah dan cepat di Boba Store`}
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <nav class="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <a href="/" class="hover:text-blue-600">Home</a>
        <span>/</span>
        <span class="text-gray-900">{categoryName}</span>
      </nav>
      <h1 class="text-3xl font-bold text-gray-900">{categoryName}</h1>
      <p class="mt-2 text-gray-600">
        Pilih provider dan nominal yang kamu inginkan
      </p>
    </div>

    {products.length === 0 ? (
      <div class="text-center py-12">
        <p class="text-gray-500">Belum ada produk tersedia</p>
      </div>
    ) : (
      <div class="space-y-12">
        {providers.map(provider => (
          <section>
            <div class="flex items-center gap-4 mb-6">
              <h2 class="text-xl font-bold text-gray-900">
                {getProviderName(provider)}
              </h2>
              <div class="flex-1 h-px bg-gray-200" />
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {productsByProvider[provider].map(product => (
                <ProductCard product={product} />
              ))}
            </div>
          </section>
        ))}
      </div>
    )}
  </div>
</Layout>
```

### 5.3 Product Detail Page

File: `src/pages/products/[slug].astro`

```astro
---
import Layout from '@layouts/Layout.astro';
import Card from '@components/atoms/Card.astro';
import Button from '@components/atoms/Button.astro';
import Input from '@components/atoms/Input.astro';
import Badge from '@components/atoms/Badge.astro';
import { getProductBySlug, getPublicSettings } from '@lib/api';
import { getSessionFromRequest } from '@lib/auth-client';
import { formatCurrency, getProviderName, getCategoryName } from '@lib/utils';

const { slug } = Astro.params;

if (!slug) {
  return Astro.redirect('/404');
}

// Fetch product
const productRes = await getProductBySlug(slug);
if (!productRes.success || !productRes.data) {
  return Astro.redirect('/404');
}

const product = productRes.data;

// Fetch settings
const settingsRes = await getPublicSettings();
const adminFee = settingsRes.success ? settingsRes.data?.adminFee || 1000 : 1000;

// Check auth
const session = await getSessionFromRequest(Astro.request);
const isLoggedIn = !!session;

const finalPrice = product.price - product.discount;
const hasDiscount = product.discount > 0;
const isAvailable = product.stockStatus === 'available';
---

<Layout 
  title={product.name}
  description={product.description || `Beli ${product.name} murah di Boba Store`}
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-gray-500 mb-8">
      <a href="/" class="hover:text-blue-600">Home</a>
      <span>/</span>
      <a href={`/products/${product.category}`} class="hover:text-blue-600">
        {getCategoryName(product.category)}
      </a>
      <span>/</span>
      <span class="text-gray-900 truncate max-w-[200px]">{product.name}</span>
    </nav>

    <div class="grid lg:grid-cols-2 gap-8 lg:gap-12">
      <!-- Product Image -->
      <div>
        <Card padding="none">
          <div class="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                class="w-full h-full object-cover"
              />
            ) : (
              <div class="flex items-center justify-center h-full text-gray-400">
                <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </Card>
      </div>

      <!-- Product Info & Order Form -->
      <div class="space-y-6">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <Badge variant="info">{getProviderName(product.provider)}</Badge>
            {!isAvailable && <Badge variant="danger">Stok Habis</Badge>}
          </div>
          <h1 class="text-2xl lg:text-3xl font-bold text-gray-900">{product.name}</h1>
        </div>

        <!-- Price -->
        <div class="flex items-baseline gap-3">
          {hasDiscount && (
            <span class="text-lg text-gray-400 line-through">
              {formatCurrency(product.price)}
            </span>
          )}
          <span class="text-3xl font-bold text-blue-600">
            {formatCurrency(finalPrice)}
          </span>
          {hasDiscount && (
            <Badge variant="danger">
              Hemat {formatCurrency(product.discount)}
            </Badge>
          )}
        </div>

        {product.description && (
          <p class="text-gray-600">{product.description}</p>
        )}

        <!-- Order Form -->
        <Card>
          <form id="orderForm" class="space-y-4">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="productName" value={product.name} />
            <input type="hidden" name="unitPrice" value={finalPrice} />
            <input type="hidden" name="adminFee" value={adminFee} />

            <!-- Target ID -->
            <Input
              name="targetId"
              label={product.category === 'pulsa' ? 'Nomor HP' : 'User ID / Player ID'}
              placeholder={product.category === 'pulsa' ? '08xxxxxxxxxx' : 'Masukkan User ID'}
              required
            />

            <!-- Server ID (for games) -->
            {product.category === 'game' && (
              <Input
                name="targetServer"
                label="Server ID (Opsional)"
                placeholder="Masukkan Server ID"
              />
            )}

            <!-- Quantity -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
              <div class="flex items-center gap-2">
                <button type="button" id="decreaseQty" class="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50">
                  -
                </button>
                <input
                  type="number"
                  name="quantity"
                  id="quantity"
                  value="1"
                  min={product.minQty}
                  max={product.maxQty}
                  class="w-20 text-center border border-gray-300 rounded-lg py-2"
                  readonly
                />
                <button type="button" id="increaseQty" class="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50">
                  +
                </button>
              </div>
            </div>

            <!-- Price Summary -->
            <div class="border-t pt-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Harga</span>
                <span id="subtotal">{formatCurrency(finalPrice)}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Biaya Admin</span>
                <span>{formatCurrency(adminFee)}</span>
              </div>
              <div class="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span id="total" class="text-blue-600">{formatCurrency(finalPrice + adminFee)}</span>
              </div>
            </div>

            <!-- Error Message -->
            <div id="errorMessage" class="hidden p-3 rounded-lg bg-red-50 text-red-700 text-sm"></div>

            <!-- Submit Button -->
            {isLoggedIn ? (
              <Button type="submit" fullWidth disabled={!isAvailable} id="submitBtn">
                {isAvailable ? 'Beli Sekarang' : 'Stok Habis'}
              </Button>
            ) : (
              <Button href={`/auth/login?redirect=/products/${slug}`} fullWidth>
                Login untuk Membeli
              </Button>
            )}
          </form>
        </Card>
      </div>
    </div>
  </div>
</Layout>

<script define:vars={{ unitPrice: finalPrice, adminFee, minQty: product.minQty, maxQty: product.maxQty }}>
  const qtyInput = document.getElementById('quantity');
  const decreaseBtn = document.getElementById('decreaseQty');
  const increaseBtn = document.getElementById('increaseQty');
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');
  const form = document.getElementById('orderForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorEl = document.getElementById('errorMessage');

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function updatePrice() {
    const qty = parseInt(qtyInput.value) || 1;
    const subtotal = unitPrice * qty;
    const total = subtotal + adminFee;
    
    subtotalEl.textContent = formatCurrency(subtotal);
    totalEl.textContent = formatCurrency(total);
  }

  decreaseBtn?.addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current > minQty) {
      qtyInput.value = current - 1;
      updatePrice();
    }
  });

  increaseBtn?.addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current < maxQty) {
      qtyInput.value = current + 1;
      updatePrice();
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    const formData = new FormData(form);
    const data = {
      productId: formData.get('productId'),
      targetId: formData.get('targetId'),
      targetServer: formData.get('targetServer') || undefined,
      quantity: parseInt(formData.get('quantity')) || 1,
      paymentMethod: 'xendit', // Will select on checkout
    };

    try {
      // Store order data and redirect to checkout
      sessionStorage.setItem('pendingOrder', JSON.stringify(data));
      window.location.href = '/checkout';
    } catch (err) {
      errorEl.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
      errorEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Beli Sekarang';
    }
  });
</script>
```

### 5.4 Dashboard Page

File: `src/pages/dashboard/index.astro`

```astro
---
import DashboardLayout from '@layouts/DashboardLayout.astro';
import Card from '@components/atoms/Card.astro';
import Badge from '@components/atoms/Badge.astro';
import { getSessionFromRequest } from '@lib/auth-client';
import { getProfile, getUserOrders } from '@lib/api';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@lib/utils';

// Get session (middleware already validates)
const session = await getSessionFromRequest(Astro.request);
const cookies = Astro.request.headers.get('cookie') || '';

// Fetch data
const [profileRes, ordersRes] = await Promise.all([
  getProfile(cookies),
  getUserOrders(cookies, 1, 5),
]);

const profile = profileRes.success ? profileRes.data : null;
const recentOrders = ordersRes.success ? ordersRes.data : [];

const stats = [
  { 
    label: 'Saldo', 
    value: formatCurrency(profile?.balance || 0), 
    color: 'text-blue-600',
    href: '/dashboard/topup'
  },
  { 
    label: 'Total Order', 
    value: ordersRes.pagination?.total || 0, 
    color: 'text-gray-900' 
  },
];
---

<DashboardLayout title="Dashboard">
  <!-- Stats -->
  <div class="grid grid-cols-2 gap-4 mb-8">
    {stats.map(stat => (
      <Card>
        <p class="text-sm text-gray-500">{stat.label}</p>
        <p class={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        {stat.href && (
          <a href={stat.href} class="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Top-up Saldo →
          </a>
        )}
      </Card>
    ))}
  </div>

  <!-- Quick Actions -->
  <Card class="mb-8">
    <h2 class="text-lg font-semibold mb-4">Beli Sekarang</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { href: '/products/game', icon: '🎮', label: 'Game' },
        { href: '/products/pulsa', icon: '📱', label: 'Pulsa' },
        { href: '/products/ewallet', icon: '💳', label: 'E-Wallet' },
        { href: '/products/pln', icon: '⚡', label: 'PLN' },
      ].map(item => (
        <a 
          href={item.href}
          class="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span class="text-2xl">{item.icon}</span>
          <span class="text-sm font-medium">{item.label}</span>
        </a>
      ))}
    </div>
  </Card>

  <!-- Recent Orders -->
  <Card>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">Order Terakhir</h2>
      <a href="/dashboard/history" class="text-sm text-blue-600 hover:underline">
        Lihat Semua →
      </a>
    </div>

    {recentOrders.length === 0 ? (
      <p class="text-center text-gray-500 py-8">Belum ada order</p>
    ) : (
      <div class="space-y-4">
        {recentOrders.map(order => (
          <a 
            href={`/dashboard/orders/${order.id}`}
            class="block p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{order.productName}</p>
                <p class="text-sm text-gray-500">{order.orderNumber}</p>
                <p class="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">{formatCurrency(order.totalPrice)}</p>
                <Badge 
                  variant={order.status === 'success' ? 'success' : order.status === 'failed' ? 'danger' : 'warning'}
                  size="sm"
                  class="mt-1"
                >
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
            </div>
          </a>
        ))}
      </div>
    )}
  </Card>
</DashboardLayout>
```

---

## 6. Data Fetching

### 6.1 Server-Side Fetching (SSR)

Astro menggunakan SSR secara default, data fetching dilakukan di frontmatter:

```astro
---
// Ini berjalan di server
import { getProducts } from '@lib/api';

const response = await getProducts('game');
const products = response.success ? response.data : [];
---

<div>
  {products.map(product => (
    <div>{product.name}</div>
  ))}
</div>
```

### 6.2 Client-Side Fetching

Untuk data yang perlu diupdate tanpa reload:

```astro
---
// Server-side initial data
const initialOrders = await getOrders();
---

<div id="orders-container">
  <!-- Initial render -->
</div>

<script>
  async function fetchOrders() {
    const response = await fetch('/api/orders');
    const data = await response.json();
    updateUI(data);
  }

  // Polling setiap 30 detik
  setInterval(fetchOrders, 30000);
</script>
```

---

## 7. Realtime Integration

### 7.1 Order Status Updates

File: `src/pages/dashboard/orders/[id].astro` (partial)

```astro
---
import { getOrder } from '@lib/api';
import { getSessionFromRequest } from '@lib/auth-client';

const session = await getSessionFromRequest(Astro.request);
const cookies = Astro.request.headers.get('cookie') || '';

const { id } = Astro.params;
const orderRes = await getOrder(id, cookies);
const order = orderRes.data;
---

<div id="order-status" data-order-id={id} data-user-id={session?.user.id}>
  <span id="status-badge">{order?.status}</span>
</div>

<script>
  import { subscribeToOrderUpdates, unsubscribe } from '@lib/supabase';
  import { getStatusLabel, getStatusColor } from '@lib/utils';

  const container = document.getElementById('order-status');
  const orderId = container?.dataset.orderId;
  const userId = container?.dataset.userId;

  if (userId) {
    const channel = subscribeToOrderUpdates(userId, (updatedOrder) => {
      if (updatedOrder.id === orderId) {
        const badge = document.getElementById('status-badge');
        if (badge) {
          badge.textContent = getStatusLabel(updatedOrder.status);
          badge.className = getStatusColor(updatedOrder.status);
        }

        // Show notification
        if (updatedOrder.status === 'success') {
          showToast('Order berhasil! Cek akun game kamu.', 'success');
        } else if (updatedOrder.status === 'failed') {
          showToast('Order gagal. Silakan hubungi CS.', 'error');
        }
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      unsubscribe(channel);
    });
  }

  function showToast(message: string, type: 'success' | 'error') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    toast.textContent = message;
    container?.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
  }
</script>
```

---

## 8. Form Handling

### 8.1 Form Validation dengan Zod

File: `src/lib/validation.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export const registerSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

export const orderSchema = z.object({
  productId: z.string().uuid('Product ID tidak valid'),
  targetId: z.string().min(1, 'User ID wajib diisi'),
  targetServer: z.string().optional(),
  quantity: z.number().min(1).max(100),
  paymentMethod: z.string().min(1, 'Metode pembayaran wajib dipilih'),
});

export const profileSchema = z.object({
  fullName: z.string().min(3, 'Nama minimal 3 karakter'),
  phone: z.string()
    .regex(/^(\+62|62|0)8[1-9][0-9]{7,10}$/, 'Format nomor HP tidak valid')
    .optional()
    .or(z.literal('')),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
```

---

## 9. Error & Loading States

### 9.1 Error Page

File: `src/pages/404.astro`

```astro
---
import Layout from '@layouts/Layout.astro';
import Button from '@components/atoms/Button.astro';
---

<Layout title="Halaman Tidak Ditemukan" noIndex>
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-gray-200">404</h1>
      <h2 class="mt-4 text-2xl font-bold text-gray-900">Halaman Tidak Ditemukan</h2>
      <p class="mt-2 text-gray-600">
        Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <div class="mt-8">
        <Button href="/">Kembali ke Home</Button>
      </div>
    </div>
  </div>
</Layout>
```

### 9.2 Loading Component

File: `src/components/atoms/Loading.astro`

```astro
---
interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const { size = 'md', text } = Astro.props;

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};
---

<div class="flex flex-col items-center justify-center gap-3">
  <svg 
    class={`animate-spin text-blue-600 ${sizes[size]}`} 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      class="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      stroke-width="4"
    />
    <path 
      class="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
  {text && <p class="text-sm text-gray-500">{text}</p>}
</div>
```

---

## 10. Performance & SEO

### 10.1 Image Optimization

```astro
---
// Gunakan Astro Image
import { Image } from 'astro:assets';
import productImage from '@assets/product.png';
---

<Image 
  src={productImage} 
  alt="Product" 
  width={400} 
  height={400}
  loading="lazy"
  format="webp"
/>
```

### 10.2 Prefetching

```astro
---
// astro.config.mjs
export default defineConfig({
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
---

<!-- Di halaman -->
<a href="/products" data-astro-prefetch>Products</a>
```

---

## 11. Testing & Deployment

### 11.1 Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  }
}
```

### 11.2 Build & Deploy

```bash
# Type check
npm run check

# Build
npm run build

# Preview locally
npm run preview

# Deploy (contoh: Vercel)
vercel deploy --prod
```

### 11.3 Environment Production

```env
PUBLIC_API_URL=https://api.boba.store
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## Checklist Implementasi

### Setup
- [ ] Inisialisasi Astro project
- [ ] Install dependencies
- [ ] Konfigurasi TypeScript
- [ ] Setup environment variables

### Authentication
- [ ] Login page
- [ ] Register page
- [ ] Middleware protection
- [ ] Logout functionality

### Layouts & Components
- [ ] Base Layout
- [ ] Dashboard Layout
- [ ] Auth Layout
- [ ] Button, Input, Card, Badge
- [ ] Navbar, Footer
- [ ] ProductCard

### Pages
- [ ] Homepage
- [ ] Product category
- [ ] Product detail
- [ ] Checkout
- [ ] Dashboard
- [ ] Order history
- [ ] Profile

### Features
- [ ] Data fetching
- [ ] Realtime subscriptions
- [ ] Form validation
- [ ] Error handling
- [ ] Loading states

### Production
- [ ] SEO optimization
- [ ] Performance optimization
- [ ] Build & deploy

---

*Tutorial ini merupakan panduan lengkap frontend untuk Boba.Store*

*Terakhir diperbarui: Desember 2024*
