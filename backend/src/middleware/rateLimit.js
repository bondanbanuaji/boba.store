const rateLimitStore = new Map();

const CLEANUP_INTERVAL = 60 * 1000; // Clean up every minute

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    skip = () => false,
  } = options;

  return (req, res, next) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    record.count++;
    rateLimitStore.set(key, record);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: message,
        retryAfter,
      });
    }

    next();
  };
};

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many API requests',
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts',
  keyGenerator: (req) => `auth:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`,
});

const orderLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many order requests',
  keyGenerator: (req) => `order:${req.user?.id || req.ip || 'unknown'}`,
});

const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many webhook requests',
});

const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Rate limit exceeded',
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  orderLimiter,
  webhookLimiter,
  strictLimiter,
};
