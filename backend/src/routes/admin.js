const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimit');
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);
router.use(apiLimiter);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Orders management
router.get('/orders', 
  validateQuery({
    status: { required: false, type: 'string' },
    paymentStatus: { required: false, type: 'string' },
    search: { required: false, type: 'string' },
    startDate: { required: false, type: 'string' },
    endDate: { required: false, type: 'string' },
    page: { required: false, type: 'number' },
    limit: { required: false, type: 'number' },
  }),
  adminController.getAllOrders
);

router.patch('/orders/:id', 
  validateParams({ id: { required: true } }),
  validateBody({
    status: { required: false, type: 'string' },
    providerSn: { required: false, type: 'string' },
    providerMessage: { required: false, type: 'string' },
    notes: { required: false, type: 'string' },
  }),
  adminController.updateOrderStatus
);

router.post('/orders/:id/retry', 
  validateParams({ id: { required: true } }),
  adminController.retryOrder
);

router.post('/orders/:id/refund', 
  validateParams({ id: { required: true } }),
  adminController.refundOrder
);

// Users management
router.get('/users', 
  validateQuery({
    role: { required: false, type: 'string' },
    search: { required: false, type: 'string' },
    page: { required: false, type: 'number' },
    limit: { required: false, type: 'number' },
  }),
  adminController.getAllUsers
);

router.patch('/users/:id/role', 
  validateParams({ id: { required: true } }),
  validateBody({
    role: { required: true, type: 'string', enum: ['user', 'admin', 'reseller'] },
  }),
  adminController.updateUserRole
);

router.post('/users/:id/balance', 
  validateParams({ id: { required: true } }),
  validateBody({
    amount: { required: true, type: 'number' },
    description: { required: false, type: 'string' },
  }),
  adminController.adjustUserBalance
);

// Products management (using productController admin functions)
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.patch('/products/:id/toggle', productController.toggleProductStatus);
router.post('/products/sync', productController.syncProducts);

// Settings
router.get('/settings', 
  validateQuery({ isPublic: { required: false, type: 'string' } }),
  adminController.getSettings
);

router.put('/settings', 
  adminController.updateSettings
);

// Audit logs
router.get('/audit-logs', 
  validateQuery({
    tableName: { required: false, type: 'string' },
    action: { required: false, type: 'string' },
    userId: { required: false, type: 'string' },
    page: { required: false, type: 'number' },
    limit: { required: false, type: 'number' },
  }),
  adminController.getAuditLogs
);

// Provider info
router.get('/provider/balance', adminController.getProviderBalance);

module.exports = router;
