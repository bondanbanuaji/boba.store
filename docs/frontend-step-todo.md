# Tutorial Frontend Lengkap - Boba.Store

> **Panduan Frontend** - Astro 5 + Better Auth + Tailwind CSS (JavaScript)

---

## Daftar Isi

1. [Setup Project](#1-setup-project)
2. [Library & API Client](#2-library--api-client)
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
# - TypeScript: No
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
```

### 1.3 Konfigurasi Astro

File: `astro.config.mjs`

```javascript
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

### 1.4 Environment Variables

File: `.env`

```env
# Backend API URL
PUBLIC_API_URL=http://localhost:3000

# Supabase (untuk Realtime)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 1.5 Struktur Folder

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
│   │   ├── auth-client.js   # Better Auth client
│   │   ├── api.js           # API client
│   │   ├── supabase.js      # Supabase client (realtime)
│   │   └── utils.js         # Utility functions
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
└── package.json
```

---

## 2. Library & API Client

### 2.1 Better Auth Client

File: `src/lib/auth-client.js`

```javascript
import { createAuthClient } from '@better-auth/client';

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

export async function signUp(name, email, password) {
  try {
    const result = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }

    return { data: result.data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Registration failed') 
    };
  }
}

export async function signIn(email, password) {
  try {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      return { data: null, error: new Error(result.error.message) };
    }

    return { data: result.data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Login failed') 
    };
  }
}

export async function signOut() {
  try {
    await authClient.signOut();
    return { error: null };
  } catch (error) {
    return { 
      error: error instanceof Error ? error : new Error('Logout failed') 
    };
  }
}

export async function getSession() {
  try {
    const session = await authClient.getSession();
    return session.data || null;
  } catch {
    return null;
  }
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

// ============================================
// SERVER-SIDE AUTH (untuk Astro pages)
// ============================================

export async function getSessionFromRequest(request) {
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
    return data;
  } catch {
    return null;
  }
}

export async function requireAuth(request) {
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

export async function requireAdmin(request) {
  const session = await requireAuth(request);
  
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

### 2.2 API Client

File: `src/lib/api.js`

```javascript
const API_URL = import.meta.env.PUBLIC_API_URL;

// ============================================
// BASE FETCH FUNCTION
// ============================================

async function fetchApi(endpoint, options = {}) {
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

export async function getProducts(category) {
  const endpoint = category ? `/api/products/${category}` : '/api/products';
  return fetchApi(endpoint);
}

export async function getProductBySlug(slug) {
  return fetchApi(`/api/products/detail/${slug}`);
}

export async function getProductsByProvider(provider) {
  return fetchApi(`/api/products/provider/${provider}`);
}

export async function checkTargetId(productId, targetId, targetServer) {
  return fetchApi('/api/products/check-target', {
    method: 'POST',
    body: JSON.stringify({ productId, targetId, targetServer }),
  });
}

// ============================================
// ORDERS API
// ============================================

export async function createOrder(data, cookies) {
  return fetchApi('/api/orders/create', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

export async function getOrder(orderId, cookies) {
  return fetchApi(`/api/orders/${orderId}`, {
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

export async function getOrderByNumber(orderNumber) {
  return fetchApi(`/api/orders/number/${orderNumber}`);
}

export async function getUserOrders(cookies, page = 1, limit = 10) {
  const response = await fetchApi(
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

  return response;
}

export async function cancelOrder(orderId, cookies) {
  return fetchApi(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

// ============================================
// PROFILE API
// ============================================

export async function getProfile(cookies) {
  return fetchApi('/api/profile', {
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

export async function updateProfile(data, cookies) {
  return fetchApi('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: cookies ? { cookie: cookies } : undefined,
  });
}

// ============================================
// TRANSACTIONS API
// ============================================

export async function getTransactions(cookies, page = 1, limit = 20) {
  const response = await fetchApi(
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

  return response;
}

// ============================================
// SETTINGS API
// ============================================

export async function getPublicSettings() {
  return fetchApi('/api/settings/public');
}

// ============================================
// ADMIN API
// ============================================

export async function getAdminDashboard(cookies) {
  return fetchApi('/api/admin/dashboard', {
    headers: { cookie: cookies },
  });
}

export async function getAllOrders(cookies, page = 1, limit = 20, status) {
  let endpoint = `/api/admin/orders?page=${page}&limit=${limit}`;
  if (status) endpoint += `&status=${status}`;
  
  return fetchApi(endpoint, {
    headers: { cookie: cookies },
  });
}

export async function updateOrderStatus(orderId, status, cookies) {
  return fetchApi(`/api/admin/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { cookie: cookies },
  });
}
```

### 2.3 Supabase Client (untuk Realtime)

File: `src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

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

export function subscribeToOrderUpdates(userId, onUpdate) {
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
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToBalanceUpdates(userId, onUpdate) {
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
        onUpdate(payload.new.balance);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToNewOrders(onNewOrder) {
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
        onNewOrder(payload.new);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel) {
  if (channel && supabase) {
    supabase.removeChannel(channel);
  }
}
```

### 2.4 Utility Functions

File: `src/lib/utils.js`

```javascript
import { clsx } from 'clsx';

// ============================================
// CLASS NAME UTILITY
// ============================================

export function cn(...inputs) {
  return clsx(inputs);
}

// ============================================
// CURRENCY FORMATTING
// ============================================

export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

// ============================================
// DATE FORMATTING
// ============================================

export function formatDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatDateShort(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getRelativeTime(date) {
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

export function getStatusColor(status) {
  const colors = {
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

export function getStatusLabel(status) {
  const labels = {
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

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone) {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{7,10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function sanitizePhone(phone) {
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

export function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// PROVIDER HELPERS
// ============================================

export function getProviderName(provider) {
  const names = {
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

export function getCategoryName(category) {
  const names = {
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

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

export function debounce(func, wait) {
  let timeout;

  return function (...args) {
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
import AuthLayout from '../../layouts/AuthLayout.astro';
import { getSessionFromRequest } from '../../lib/auth-client.js';

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
  import { signIn } from '../../lib/auth-client.js';

  const form = document.getElementById('loginForm');
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

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
    const email = formData.get('email');
    const password = formData.get('password');
    const redirectTo = formData.get('redirectTo');

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
        window.location.href = redirectTo;
      }
    } catch (err) {
      showError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.textContent = loading ? 'Memproses...' : 'Masuk';
    btnSpinner.classList.toggle('hidden', !loading);
    
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => input.disabled = loading);
  }
</script>
```

### 3.2 Register Page

File: `src/pages/auth/register.astro`

```astro
---
import AuthLayout from '../../layouts/AuthLayout.astro';
import { getSessionFromRequest } from '../../lib/auth-client.js';

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
  import { signUp } from '../../lib/auth-client.js';
  import { isValidEmail } from '../../lib/utils.js';

  const form = document.getElementById('registerForm');
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  const successAlert = document.getElementById('successAlert');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset states
    errorAlert.classList.add('hidden');
    successAlert.classList.add('hidden');

    // Get form data
    const formData = new FormData(form);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

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

  function showError(message) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.textContent = loading ? 'Memproses...' : 'Daftar';
    btnSpinner.classList.toggle('hidden', !loading);
    
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => input.disabled = loading);
  }
</script>
```

### 3.3 Protected Route Middleware

File: `src/middleware.js`

```javascript
import { defineMiddleware } from 'astro:middleware';
import { getSessionFromRequest } from './lib/auth-client.js';

const protectedRoutes = ['/dashboard', '/admin', '/checkout'];
const authRoutes = ['/auth/login', '/auth/register'];
const adminRoutes = ['/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const request = context.request;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isAuthRoute) {
    const session = await getSessionFromRequest(request);

    if (isAuthRoute && session) {
      return context.redirect('/dashboard');
    }

    if (isProtectedRoute && !session) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
      return context.redirect(redirectUrl);
    }

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

    if (session) {
      context.locals.session = session;
      context.locals.user = session.user;
    }
  }

  return next();
});
```

---

## 4. Layouts & Components

### 4.1 Base Layout

File: `src/layouts/Layout.astro`

```astro
---
import '../styles/global.css';
import Navbar from '../components/widgets/Navbar.astro';
import Footer from '../components/widgets/Footer.astro';

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

### 4.2 Auth Layout

File: `src/layouts/AuthLayout.astro`

```astro
---
import '../styles/global.css';

const { title } = Astro.props;
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
<body class="min-h-screen bg-gray-50">
  <slot />
</body>
</html>
```

### 4.3 Dashboard Layout

File: `src/layouts/DashboardLayout.astro`

```astro
---
import '../styles/global.css';
import { getSessionFromRequest } from '../lib/auth-client.js';
import { getProfile } from '../lib/api.js';
import { formatCurrency } from '../lib/utils.js';

const { title } = Astro.props;

const session = await getSessionFromRequest(Astro.request);
const cookies = Astro.request.headers.get('cookie') || '';

let profile = null;
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
    import { signOut } from '../lib/auth-client.js';

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const openBtn = document.getElementById('openSidebar');
    const closeBtn = document.getElementById('closeSidebar');

    function toggleSidebar(open) {
      sidebar?.classList.toggle('-translate-x-full', !open);
      overlay?.classList.toggle('hidden', !open);
    }

    openBtn?.addEventListener('click', () => toggleSidebar(true));
    closeBtn?.addEventListener('click', () => toggleSidebar(false));
    overlay?.addEventListener('click', () => toggleSidebar(false));

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

### 4.4 Button Component

File: `src/components/atoms/Button.astro`

```astro
---
import { cn } from '../../lib/utils.js';

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

### 4.5 Input Component

File: `src/components/atoms/Input.astro`

```astro
---
import { cn } from '../../lib/utils.js';

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

### 4.6 Card Component

File: `src/components/atoms/Card.astro`

```astro
---
import { cn } from '../../lib/utils.js';

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

### 4.7 Badge Component

File: `src/components/atoms/Badge.astro`

```astro
---
import { cn } from '../../lib/utils.js';

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

### 4.8 Product Card

File: `src/components/widgets/ProductCard.astro`

```astro
---
import Card from '../atoms/Card.astro';
import Badge from '../atoms/Badge.astro';
import { formatCurrency } from '../../lib/utils.js';

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

### 4.9 Navbar

File: `src/components/widgets/Navbar.astro`

```astro
---
import { getSessionFromRequest } from '../../lib/auth-client.js';
import Button from '../atoms/Button.astro';

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

### 4.10 Footer

File: `src/components/widgets/Footer.astro`

```astro
---
const currentYear = new Date().getFullYear();
---

<footer class="bg-gray-900 text-gray-400">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      <!-- Brand -->
      <div class="col-span-2 md:col-span-1">
        <a href="/" class="flex items-center gap-2">
          <span class="text-xl font-bold text-white">Boba Store</span>
        </a>
        <p class="mt-4 text-sm">
          Platform top-up game, pulsa, dan e-wallet tercepat dan terpercaya.
        </p>
      </div>

      <!-- Links -->
      <div>
        <h3 class="text-white font-semibold mb-4">Produk</h3>
        <ul class="space-y-2 text-sm">
          <li><a href="/products/game" class="hover:text-white">Voucher Game</a></li>
          <li><a href="/products/pulsa" class="hover:text-white">Pulsa & Data</a></li>
          <li><a href="/products/ewallet" class="hover:text-white">E-Wallet</a></li>
          <li><a href="/products/pln" class="hover:text-white">Token PLN</a></li>
        </ul>
      </div>

      <div>
        <h3 class="text-white font-semibold mb-4">Bantuan</h3>
        <ul class="space-y-2 text-sm">
          <li><a href="/faq" class="hover:text-white">FAQ</a></li>
          <li><a href="/contact" class="hover:text-white">Hubungi Kami</a></li>
          <li><a href="/track" class="hover:text-white">Lacak Order</a></li>
        </ul>
      </div>

      <div>
        <h3 class="text-white font-semibold mb-4">Legal</h3>
        <ul class="space-y-2 text-sm">
          <li><a href="/terms" class="hover:text-white">Syarat & Ketentuan</a></li>
          <li><a href="/privacy" class="hover:text-white">Kebijakan Privasi</a></li>
        </ul>
      </div>
    </div>

    <div class="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
      <p>&copy; {currentYear} Boba Store. All rights reserved.</p>
    </div>
  </div>
</footer>
```

---

## 5. Pages

### 5.1 Homepage

File: `src/pages/index.astro`

```astro
---
import Layout from '../layouts/Layout.astro';
import Card from '../components/atoms/Card.astro';
import ProductCard from '../components/widgets/ProductCard.astro';
import Button from '../components/atoms/Button.astro';
import { getProducts } from '../lib/api.js';
import { getCategoryName, getProviderName } from '../lib/utils.js';

const productsResponse = await getProducts();
const allProducts = productsResponse.success ? productsResponse.data || [] : [];

const categories = ['game', 'pulsa', 'ewallet'];
const productsByCategory = {};
categories.forEach(category => {
  productsByCategory[category] = allProducts
    .filter(p => p.category === category)
    .slice(0, 8);
});

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

### 5.2 Dashboard Page

File: `src/pages/dashboard/index.astro`

```astro
---
import DashboardLayout from '../../layouts/DashboardLayout.astro';
import Card from '../../components/atoms/Card.astro';
import Badge from '../../components/atoms/Badge.astro';
import { getSessionFromRequest } from '../../lib/auth-client.js';
import { getProfile, getUserOrders } from '../../lib/api.js';
import { formatCurrency, formatDate, getStatusLabel } from '../../lib/utils.js';

const session = await getSessionFromRequest(Astro.request);
const cookies = Astro.request.headers.get('cookie') || '';

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
import { getProducts } from '../lib/api.js';

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

```astro
---
import { getOrder } from '../lib/api.js';
import { getSessionFromRequest } from '../lib/auth-client.js';

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
  import { subscribeToOrderUpdates, unsubscribe } from '../lib/supabase.js';
  import { getStatusLabel, getStatusColor } from '../lib/utils.js';

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

        if (updatedOrder.status === 'success') {
          showToast('Order berhasil! Cek akun game kamu.', 'success');
        } else if (updatedOrder.status === 'failed') {
          showToast('Order gagal. Silakan hubungi CS.', 'error');
        }
      }
    });

    window.addEventListener('beforeunload', () => {
      unsubscribe(channel);
    });
  }

  function showToast(message, type) {
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

File: `src/lib/validation.js`

```javascript
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
```

---

## 9. Error & Loading States

### 9.1 Error Page

File: `src/pages/404.astro`

```astro
---
import Layout from '../layouts/Layout.astro';
import Button from '../components/atoms/Button.astro';
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
import { Image } from 'astro:assets';
import productImage from '../assets/product.png';
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

```javascript
// astro.config.mjs
export default defineConfig({
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
```

```astro
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
    "preview": "astro preview"
  }
}
```

### 11.2 Build & Deploy

```bash
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

*Tutorial ini merupakan panduan lengkap frontend untuk Boba.Store (JavaScript)*

*Terakhir diperbarui: Desember 2024*
