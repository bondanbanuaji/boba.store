-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (key, value, value_type, description, is_public) VALUES
    ('admin_fee', '1000', 'number', 'Biaya admin per transaksi', true),
    ('min_topup', '10000', 'number', 'Minimum top-up saldo', true),
    ('max_topup', '10000000', 'number', 'Maximum top-up saldo', true),
    ('maintenance_mode', 'false', 'boolean', 'Mode maintenance', true),
    ('maintenance_message', 'Sistem sedang dalam perbaikan', 'string', 'Pesan maintenance', true),
    ('contact_whatsapp', '6281234567890', 'string', 'Nomor WhatsApp CS', true),
    ('contact_email', 'support@boba.store', 'string', 'Email support', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - MOBILE LEGENDS
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('game', 'mobile-legends', '86 Diamonds', 'ml-86-dm', 'ML86', 20000, 0, '86 Diamonds ML', true),
    ('game', 'mobile-legends', '172 Diamonds', 'ml-172-dm', 'ML172', 40000, 2000, '172 Diamonds ML', true),
    ('game', 'mobile-legends', '257 Diamonds', 'ml-257-dm', 'ML257', 58000, 3000, '257 Diamonds ML', true),
    ('game', 'mobile-legends', '344 Diamonds', 'ml-344-dm', 'ML344', 76000, 4000, '344 Diamonds ML', true),
    ('game', 'mobile-legends', '514 Diamonds', 'ml-514-dm', 'ML514', 112000, 6000, '514 Diamonds ML', true),
    ('game', 'mobile-legends', '706 Diamonds', 'ml-706-dm', 'ML706', 152000, 8000, '706 Diamonds ML', true),
    ('game', 'mobile-legends', 'Starlight', 'ml-starlight', 'MLSTAR', 150000, 5000, 'Starlight Member', true),
    ('game', 'mobile-legends', 'Starlight Plus', 'ml-starlight-plus', 'MLSTARPLUS', 300000, 10000, 'Starlight Plus Member', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - FREE FIRE
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('game', 'free-fire', '70 Diamonds', 'ff-70-dm', 'FF70', 15000, 0, '70 Diamonds FF', true),
    ('game', 'free-fire', '140 Diamonds', 'ff-140-dm', 'FF140', 29000, 1500, '140 Diamonds FF', true),
    ('game', 'free-fire', '355 Diamonds', 'ff-355-dm', 'FF355', 72000, 4000, '355 Diamonds FF', true),
    ('game', 'free-fire', '720 Diamonds', 'ff-720-dm', 'FF720', 145000, 8000, '720 Diamonds FF', true),
    ('game', 'free-fire', '1450 Diamonds', 'ff-1450-dm', 'FF1450', 290000, 15000, '1450 Diamonds FF', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - PUBG MOBILE
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('game', 'pubg-mobile', '60 UC', 'pubg-60-uc', 'PUBG60', 15000, 0, '60 UC PUBG Mobile', true),
    ('game', 'pubg-mobile', '325 UC', 'pubg-325-uc', 'PUBG325', 75000, 3000, '325 UC PUBG Mobile', true),
    ('game', 'pubg-mobile', '660 UC', 'pubg-660-uc', 'PUBG660', 150000, 7000, '660 UC PUBG Mobile', true),
    ('game', 'pubg-mobile', '1800 UC', 'pubg-1800-uc', 'PUBG1800', 400000, 20000, '1800 UC PUBG Mobile', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - GENSHIN IMPACT
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('game', 'genshin-impact', '60 Genesis Crystals', 'gi-60-gc', 'GI60', 16000, 0, '60 Genesis Crystals', true),
    ('game', 'genshin-impact', '300 Genesis Crystals', 'gi-300-gc', 'GI300', 79000, 4000, '300+30 Genesis Crystals', true),
    ('game', 'genshin-impact', '980 Genesis Crystals', 'gi-980-gc', 'GI980', 249000, 12000, '980+110 Genesis Crystals', true),
    ('game', 'genshin-impact', 'Blessing of Welkin Moon', 'gi-welkin', 'GIWELKIN', 79000, 0, 'Blessing of Welkin Moon', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - PULSA TELKOMSEL
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('pulsa', 'telkomsel', 'Pulsa 5K', 'tsel-5k', 'TSEL5', 6500, 0, 'Pulsa Telkomsel 5.000', true),
    ('pulsa', 'telkomsel', 'Pulsa 10K', 'tsel-10k', 'TSEL10', 11500, 500, 'Pulsa Telkomsel 10.000', true),
    ('pulsa', 'telkomsel', 'Pulsa 25K', 'tsel-25k', 'TSEL25', 26500, 1000, 'Pulsa Telkomsel 25.000', true),
    ('pulsa', 'telkomsel', 'Pulsa 50K', 'tsel-50k', 'TSEL50', 51500, 2000, 'Pulsa Telkomsel 50.000', true),
    ('pulsa', 'telkomsel', 'Pulsa 100K', 'tsel-100k', 'TSEL100', 101500, 3000, 'Pulsa Telkomsel 100.000', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - PULSA INDOSAT
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('pulsa', 'indosat', 'Pulsa 5K', 'isat-5k', 'ISAT5', 6200, 0, 'Pulsa Indosat 5.000', true),
    ('pulsa', 'indosat', 'Pulsa 10K', 'isat-10k', 'ISAT10', 11200, 500, 'Pulsa Indosat 10.000', true),
    ('pulsa', 'indosat', 'Pulsa 25K', 'isat-25k', 'ISAT25', 26000, 1000, 'Pulsa Indosat 25.000', true),
    ('pulsa', 'indosat', 'Pulsa 50K', 'isat-50k', 'ISAT50', 51000, 2000, 'Pulsa Indosat 50.000', true),
    ('pulsa', 'indosat', 'Pulsa 100K', 'isat-100k', 'ISAT100', 101000, 3000, 'Pulsa Indosat 100.000', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - PULSA XL
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('pulsa', 'xl', 'Pulsa 5K', 'xl-5k', 'XL5', 6300, 0, 'Pulsa XL 5.000', true),
    ('pulsa', 'xl', 'Pulsa 10K', 'xl-10k', 'XL10', 11300, 500, 'Pulsa XL 10.000', true),
    ('pulsa', 'xl', 'Pulsa 25K', 'xl-25k', 'XL25', 26200, 1000, 'Pulsa XL 25.000', true),
    ('pulsa', 'xl', 'Pulsa 50K', 'xl-50k', 'XL50', 51200, 2000, 'Pulsa XL 50.000', true),
    ('pulsa', 'xl', 'Pulsa 100K', 'xl-100k', 'XL100', 101200, 3000, 'Pulsa XL 100.000', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - E-WALLET
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('ewallet', 'dana', 'DANA 25K', 'dana-25k', 'DANA25', 26000, 500, 'Saldo DANA 25.000', true),
    ('ewallet', 'dana', 'DANA 50K', 'dana-50k', 'DANA50', 51000, 1000, 'Saldo DANA 50.000', true),
    ('ewallet', 'dana', 'DANA 100K', 'dana-100k', 'DANA100', 101000, 2000, 'Saldo DANA 100.000', true),
    ('ewallet', 'gopay', 'GoPay 25K', 'gopay-25k', 'GOPAY25', 26000, 500, 'Saldo GoPay 25.000', true),
    ('ewallet', 'gopay', 'GoPay 50K', 'gopay-50k', 'GOPAY50', 51000, 1000, 'Saldo GoPay 50.000', true),
    ('ewallet', 'gopay', 'GoPay 100K', 'gopay-100k', 'GOPAY100', 101000, 2000, 'Saldo GoPay 100.000', true),
    ('ewallet', 'ovo', 'OVO 25K', 'ovo-25k', 'OVO25', 26000, 500, 'Saldo OVO 25.000', true),
    ('ewallet', 'ovo', 'OVO 50K', 'ovo-50k', 'OVO50', 51000, 1000, 'Saldo OVO 50.000', true),
    ('ewallet', 'ovo', 'OVO 100K', 'ovo-100k', 'OVO100', 101000, 2000, 'Saldo OVO 100.000', true),
    ('ewallet', 'shopeepay', 'ShopeePay 25K', 'spay-25k', 'SPAY25', 26000, 500, 'Saldo ShopeePay 25.000', true),
    ('ewallet', 'shopeepay', 'ShopeePay 50K', 'spay-50k', 'SPAY50', 51000, 1000, 'Saldo ShopeePay 50.000', true),
    ('ewallet', 'shopeepay', 'ShopeePay 100K', 'spay-100k', 'SPAY100', 101000, 2000, 'Saldo ShopeePay 100.000', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - TOKEN PLN
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('pln', 'token-listrik', 'Token 20K', 'pln-20k', 'PLN20', 22000, 0, 'Token Listrik 20.000', true),
    ('pln', 'token-listrik', 'Token 50K', 'pln-50k', 'PLN50', 52000, 1000, 'Token Listrik 50.000', true),
    ('pln', 'token-listrik', 'Token 100K', 'pln-100k', 'PLN100', 102000, 2000, 'Token Listrik 100.000', true),
    ('pln', 'token-listrik', 'Token 200K', 'pln-200k', 'PLN200', 202000, 3000, 'Token Listrik 200.000', true),
    ('pln', 'token-listrik', 'Token 500K', 'pln-500k', 'PLN500', 502000, 5000, 'Token Listrik 500.000', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();

-- ============================================
-- SAMPLE PRODUCTS - VOUCHER
-- ============================================
INSERT INTO products (category, provider, name, slug, sku, price, discount, description, is_active) VALUES
    ('voucher', 'google-play', 'Google Play 50K', 'gplay-50k', 'GPLAY50', 51000, 1000, 'Voucher Google Play 50.000', true),
    ('voucher', 'google-play', 'Google Play 100K', 'gplay-100k', 'GPLAY100', 101000, 2000, 'Voucher Google Play 100.000', true),
    ('voucher', 'google-play', 'Google Play 300K', 'gplay-300k', 'GPLAY300', 301000, 5000, 'Voucher Google Play 300.000', true),
    ('voucher', 'steam', 'Steam Wallet 60K', 'steam-60k', 'STEAM60', 62000, 1000, 'Steam Wallet IDR 60.000', true),
    ('voucher', 'steam', 'Steam Wallet 120K', 'steam-120k', 'STEAM120', 124000, 2000, 'Steam Wallet IDR 120.000', true),
    ('voucher', 'steam', 'Steam Wallet 250K', 'steam-250k', 'STEAM250', 257000, 4000, 'Steam Wallet IDR 250.000', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, discount = EXCLUDED.discount, updated_at = NOW();
