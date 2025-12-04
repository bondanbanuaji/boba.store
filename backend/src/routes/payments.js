const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validateBody, validateParams, topupValidation } = require('../middleware/validation');
const { apiLimiter, orderLimiter } = require('../middleware/rateLimit');
const paymentController = require('../controllers/paymentController');

// Get available payment methods
router.get('/methods', 
  apiLimiter,
  optionalAuthMiddleware,
  paymentController.getPaymentMethods
);

// Get payment status for an order
router.get('/:orderId/status', 
  apiLimiter,
  validateParams({ orderId: { required: true } }),
  paymentController.getPaymentStatus
);

// Top-up balance (requires auth)
router.post('/topup', 
  orderLimiter,
  authMiddleware,
  validateBody(topupValidation),
  paymentController.topupBalance
);

// Get user's balance
router.get('/balance', 
  apiLimiter,
  authMiddleware,
  paymentController.getUserBalance
);

// Get user's transaction history
router.get('/transactions', 
  apiLimiter,
  authMiddleware,
  paymentController.getUserTransactions
);

module.exports = router;
