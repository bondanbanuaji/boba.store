const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery, orderValidation } = require('../middleware/validation');
const { orderLimiter, apiLimiter } = require('../middleware/rateLimit');
const orderController = require('../controllers/orderController');

// Create order (optional auth for guest checkout)
router.post('/', 
  orderLimiter,
  optionalAuthMiddleware,
  validateBody(orderValidation),
  orderController.createOrder
);

// Get user's orders (requires auth)
router.get('/history', 
  apiLimiter,
  authMiddleware,
  validateQuery({
    status: { required: false, type: 'string' },
    page: { required: false, type: 'number' },
    limit: { required: false, type: 'number' },
  }),
  orderController.getUserOrders
);

// Get order by order number (for tracking)
router.get('/track/:orderNumber', 
  apiLimiter,
  optionalAuthMiddleware,
  validateParams({ orderNumber: { required: true } }),
  orderController.getOrderByNumber
);

// Get order by ID
router.get('/:id', 
  apiLimiter,
  optionalAuthMiddleware,
  validateParams({ 
    id: { 
      required: true,
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      patternMessage: 'Invalid order ID format',
    } 
  }),
  orderController.getOrderById
);

// Check order status (refresh from provider)
router.get('/:id/status', 
  apiLimiter,
  validateParams({ id: { required: true } }),
  orderController.checkOrderStatus
);

// Cancel order (requires auth)
router.post('/:id/cancel', 
  authMiddleware,
  validateParams({ id: { required: true } }),
  orderController.cancelOrder
);

module.exports = router;
