const { isValidEmail, sanitizeInput } = require('../utils/helpers');

const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
      }

      if (rules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ field, message: `${field} must be a number` });
        } else if (rules.min !== undefined && num < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        } else if (rules.max !== undefined && num > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
        }
      }

      if (rules.type === 'email' && !isValidEmail(value)) {
        errors.push({ field, message: `${field} must be a valid email` });
      }

      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({ field, message: rules.patternMessage || `${field} format is invalid` });
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }

      if (rules.sanitize && typeof value === 'string') {
        req.body[field] = sanitizeInput(value);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.query[field];

      if (rules.required && !value) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (!value) continue;

      if (rules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ field, message: `${field} must be a number` });
        } else {
          req.query[field] = num;
        }
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.params[field];

      if (rules.required && !value) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({ field, message: rules.patternMessage || `${field} format is invalid` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
};

const orderValidation = {
  productId: { required: true, type: 'string' },
  targetId: { required: true, type: 'string', minLength: 5, maxLength: 100 },
  targetServer: { required: false, type: 'string', maxLength: 50 },
  quantity: { required: false, type: 'number', min: 1, max: 100 },
  paymentMethod: { required: true, type: 'string' },
};

const topupValidation = {
  amount: { required: true, type: 'number', min: 10000, max: 10000000 },
  paymentMethod: { required: true, type: 'string' },
};

const productValidation = {
  category: { required: true, type: 'string', enum: ['game', 'pulsa', 'ewallet', 'pln', 'voucher'] },
  provider: { required: true, type: 'string', minLength: 2, maxLength: 50 },
  name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
  slug: { required: false, type: 'string', maxLength: 100 },
  sku: { required: false, type: 'string', maxLength: 100 },
  price: { required: true, type: 'number', min: 0 },
  discount: { required: false, type: 'number', min: 0 },
  description: { required: false, type: 'string', maxLength: 1000 },
  imageUrl: { required: false, type: 'string' },
  isActive: { required: false, type: 'boolean' },
  stockStatus: { required: false, type: 'string', enum: ['available', 'limited', 'empty'] },
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  orderValidation,
  topupValidation,
  productValidation,
};
