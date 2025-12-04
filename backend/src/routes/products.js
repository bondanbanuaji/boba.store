const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const { validateBody, validateParams, validateQuery, productValidation } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimit');
const productController = require('../controllers/productController');

// Public routes
router.get('/', 
  apiLimiter,
  validateQuery({
    category: { required: false, type: 'string' },
    provider: { required: false, type: 'string' },
    search: { required: false, type: 'string' },
    isActive: { required: false, type: 'string' },
    page: { required: false, type: 'number' },
    limit: { required: false, type: 'number' },
  }),
  productController.getAllProducts
);

router.get('/categories', 
  apiLimiter,
  productController.getCategories
);

router.get('/providers', 
  apiLimiter,
  productController.getProviders
);

router.get('/category/:category', 
  apiLimiter,
  validateParams({ category: { required: true } }),
  productController.getProductsByCategory
);

router.get('/slug/:slug', 
  apiLimiter,
  validateParams({ slug: { required: true } }),
  productController.getProductBySlug
);

router.get('/:id', 
  apiLimiter,
  validateParams({ 
    id: { 
      required: true, 
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      patternMessage: 'Invalid product ID format',
    } 
  }),
  productController.getProductById
);

router.post('/check-target', 
  apiLimiter,
  validateBody({
    provider: { required: true, type: 'string' },
    targetId: { required: true, type: 'string' },
    serverId: { required: false, type: 'string' },
  }),
  productController.checkTarget
);

// Admin routes
router.post('/', 
  authMiddleware,
  adminMiddleware,
  validateBody(productValidation),
  productController.createProduct
);

router.put('/:id', 
  authMiddleware,
  adminMiddleware,
  validateParams({ id: { required: true } }),
  productController.updateProduct
);

router.delete('/:id', 
  authMiddleware,
  adminMiddleware,
  validateParams({ id: { required: true } }),
  productController.deleteProduct
);

router.patch('/:id/toggle', 
  authMiddleware,
  adminMiddleware,
  validateParams({ id: { required: true } }),
  productController.toggleProductStatus
);

router.post('/sync', 
  authMiddleware,
  adminMiddleware,
  productController.syncProducts
);

module.exports = router;
