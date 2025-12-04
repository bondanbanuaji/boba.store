const express = require('express');
const router = express.Router();
const { webhookLimiter } = require('../middleware/rateLimit');
const paymentController = require('../controllers/paymentController');
const logger = require('../utils/logger');

// Xendit webhook
router.post('/xendit', 
  webhookLimiter,
  express.json(),
  paymentController.handleXenditWebhook
);

// VIP Reseller webhook/callback
router.post('/vipreseller', 
  webhookLimiter,
  express.json(),
  paymentController.handleVipResellerWebhook
);

// Generic callback endpoint for testing
router.post('/callback', 
  webhookLimiter,
  (req, res) => {
    logger.info('Generic callback received', { body: req.body, headers: req.headers });
    res.json({ received: true, timestamp: new Date().toISOString() });
  }
);

module.exports = router;
