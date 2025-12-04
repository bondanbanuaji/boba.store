const crypto = require('crypto');

const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

const generateReferenceId = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const calculateTotal = (unitPrice, quantity, discount = 0, adminFee = 0) => {
  const subtotal = parseFloat(unitPrice) * parseInt(quantity);
  const discountAmount = parseFloat(discount);
  const fee = parseFloat(adminFee);
  return subtotal - discountAmount + fee;
};

const formatCurrency = (amount, locale = 'id-ID', currency = 'IDR') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const parseDecimal = (value) => {
  if (value === null || value === undefined) return 0;
  return parseFloat(value) || 0;
};

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/<[^>]*>/g, '');
};

const validatePhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    return '62' + cleanPhone.slice(1);
  }
  if (cleanPhone.startsWith('62')) {
    return cleanPhone;
  }
  return '62' + cleanPhone;
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const maskSensitiveData = (data, showLast = 4) => {
  if (!data || typeof data !== 'string') return data;
  if (data.length <= showLast) return data;
  const masked = '*'.repeat(data.length - showLast);
  return masked + data.slice(-showLast);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay * (i + 1));
    }
  }
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    null;
};

const paginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

const formatDateIndonesian = (date) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const parseJSON = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

module.exports = {
  generateOrderNumber,
  generateReferenceId,
  calculateTotal,
  formatCurrency,
  parseDecimal,
  slugify,
  sanitizeInput,
  validatePhoneNumber,
  isValidEmail,
  maskSensitiveData,
  sleep,
  retry,
  getClientIP,
  paginationResponse,
  formatDateIndonesian,
  parseJSON,
};
