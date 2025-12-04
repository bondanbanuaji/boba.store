const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Base fetch wrapper with error handling
 */
async function fetchApi(endpoint, options = {}) {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
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
    console.error('API Error:', error);
    return { success: false, error: error.message || 'Network error' };
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

export async function checkTargetId(productId, targetId, targetServer) {
  return fetchApi('/api/products/check-target', {
    method: 'POST',
    body: JSON.stringify({ productId, targetId, targetServer }),
  });
}

// ============================================
// ORDERS API
// ============================================

export async function createOrder(data) {
  return fetchApi('/api/orders/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getOrder(orderId) {
  return fetchApi(`/api/orders/${orderId}`);
}

export async function trackOrder(orderId) {
  return fetchApi(`/api/orders/track/${orderId}`);
}
