-- ============================================
-- ADDITIONAL PARTIAL INDEXES
-- Optimized for common query patterns
-- ============================================

-- Pending orders for dashboard
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(created_at DESC) WHERE status = 'pending';

-- Orders that need action (paid but not processed)
CREATE INDEX IF NOT EXISTS idx_orders_needs_action ON orders(created_at DESC) 
WHERE status IN ('pending', 'processing') AND payment_status = 'paid';

-- Active game products for category pages
CREATE INDEX IF NOT EXISTS idx_products_game_active ON products(provider, name) 
WHERE category = 'game' AND is_active = TRUE;

-- Active pulsa products
CREATE INDEX IF NOT EXISTS idx_products_pulsa_active ON products(provider, price) 
WHERE category = 'pulsa' AND is_active = TRUE;

-- Active e-wallet products
CREATE INDEX IF NOT EXISTS idx_products_ewallet_active ON products(provider, price) 
WHERE category = 'ewallet' AND is_active = TRUE;

-- Recent successful orders for analytics
CREATE INDEX IF NOT EXISTS idx_orders_success_recent ON orders(created_at DESC) 
WHERE status = 'success';

-- ============================================
-- UPDATE STATISTICS
-- ============================================
ANALYZE "user";
ANALYZE "session";
ANALYZE profiles;
ANALYZE products;
ANALYZE orders;
ANALYZE transactions;
ANALYZE settings;
ANALYZE audit_logs;
