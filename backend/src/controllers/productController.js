const { db } = require('../lib/db');
const { products } = require('../db/schema');
const { eq, and, like, desc, asc, sql } = require('drizzle-orm');
const logger = require('../utils/logger');
const { paginationResponse, slugify } = require('../utils/helpers');
const { validateGameTarget, getCategoryProviders } = require('../config/provider');
const vipResellerService = require('../services/vipreseller');

const getAllProducts = async (req, res) => {
  try {
    const { 
      category, 
      provider, 
      search,
      isActive = 'true',
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const conditions = [];

    if (isActive !== 'all') {
      conditions.push(eq(products.isActive, isActive === 'true'));
    }

    if (category) {
      conditions.push(eq(products.category, category));
    }

    if (provider) {
      conditions.push(eq(products.provider, provider));
    }

    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const [productList, countResult] = await Promise.all([
      db.select()
        .from(products)
        .where(whereClause)
        .orderBy(orderDirection(products[sortBy] || products.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: sql`count(*)` })
        .from(products)
        .where(whereClause),
    ]);

    const total = parseInt(countResult[0]?.count || 0);

    res.json(paginationResponse(productList, page, limit, total));
  } catch (error) {
    logger.error('Failed to get products', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { provider } = req.query;

    const conditions = [
      eq(products.category, category),
      eq(products.isActive, true),
    ];

    if (provider) {
      conditions.push(eq(products.provider, provider));
    }

    const productList = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.price));

    const providers = getCategoryProviders(category);

    res.json({
      category,
      providers,
      products: productList,
    });
  } catch (error) {
    logger.error('Failed to get products by category', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('Failed to get product by slug', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('Failed to get product by id', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

const checkTarget = async (req, res) => {
  try {
    const { provider, targetId, serverId } = req.body;

    if (!provider || !targetId) {
      return res.status(400).json({ error: 'Provider and targetId are required' });
    }

    const validation = validateGameTarget(provider, targetId, serverId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await vipResellerService.checkTarget(provider, targetId, serverId);

    res.json({
      valid: result.valid,
      targetName: result.targetName,
    });
  } catch (error) {
    logger.error('Failed to check target', error);
    res.status(500).json({ error: 'Failed to validate target' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.isActive, true));

    res.json(categories.map(c => c.category));
  } catch (error) {
    logger.error('Failed to get categories', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

const getProviders = async (req, res) => {
  try {
    const { category } = req.query;

    const conditions = [eq(products.isActive, true)];
    if (category) {
      conditions.push(eq(products.category, category));
    }

    const providers = await db
      .selectDistinct({ 
        provider: products.provider,
        category: products.category,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.category), asc(products.provider));

    res.json(providers);
  } catch (error) {
    logger.error('Failed to get providers', error);
    res.status(500).json({ error: 'Failed to get providers' });
  }
};

// Admin functions
const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    if (!productData.slug) {
      productData.slug = slugify(productData.name);
    }

    const [existingProduct] = await db
      .select()
      .from(products)
      .where(eq(products.slug, productData.slug))
      .limit(1);

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this slug already exists' });
    }

    const [newProduct] = await db
      .insert(products)
      .values(productData)
      .returning();

    logger.info('Product created', { productId: newProduct.id, name: newProduct.name });
    res.status(201).json(newProduct);
  } catch (error) {
    logger.error('Failed to create product', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.name && !updateData.slug) {
      updateData.slug = slugify(updateData.name);
    }

    updateData.updatedAt = new Date();

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    logger.info('Product updated', { productId: id });
    res.json(updatedProduct);
  } catch (error) {
    logger.error('Failed to update product', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedProduct] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    logger.info('Product deleted', { productId: id });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete product', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [updatedProduct] = await db
      .update(products)
      .set({ 
        isActive: !product.isActive,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    logger.info('Product status toggled', { productId: id, isActive: updatedProduct.isActive });
    res.json(updatedProduct);
  } catch (error) {
    logger.error('Failed to toggle product status', error);
    res.status(500).json({ error: 'Failed to update product status' });
  }
};

const syncProducts = async (req, res) => {
  try {
    const services = await vipResellerService.getServices();
    
    let synced = 0;
    let failed = 0;

    for (const service of services) {
      try {
        const productSlug = slugify(`${service.category}-${service.name}`);
        
        await db
          .insert(products)
          .values({
            category: service.category || 'game',
            provider: service.brand || service.category,
            name: service.name,
            slug: productSlug,
            sku: service.code,
            price: parseFloat(service.price) || 0,
            description: service.desc || service.name,
            isActive: service.status === 'active',
            stockStatus: service.status === 'active' ? 'available' : 'empty',
          })
          .onConflictDoUpdate({
            target: products.slug,
            set: {
              price: parseFloat(service.price) || 0,
              isActive: service.status === 'active',
              stockStatus: service.status === 'active' ? 'available' : 'empty',
              updatedAt: new Date(),
            },
          });
        
        synced++;
      } catch (err) {
        failed++;
        logger.debug('Failed to sync product', { service: service.code, error: err.message });
      }
    }

    logger.info('Products synced', { synced, failed });
    res.json({ message: `Synced ${synced} products, ${failed} failed` });
  } catch (error) {
    logger.error('Failed to sync products', error);
    res.status(500).json({ error: 'Failed to sync products from provider' });
  }
};

module.exports = {
  getAllProducts,
  getProductsByCategory,
  getProductBySlug,
  getProductById,
  checkTarget,
  getCategories,
  getProviders,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  syncProducts,
};
