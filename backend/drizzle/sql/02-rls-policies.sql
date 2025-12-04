-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- USER POLICIES
CREATE POLICY "users_select_own" ON "user" FOR SELECT USING (id = auth.get_current_user_id());
CREATE POLICY "users_select_admin" ON "user" FOR SELECT USING (auth.is_admin());
CREATE POLICY "users_update_own" ON "user" FOR UPDATE USING (id = auth.get_current_user_id());

-- SESSION POLICIES
CREATE POLICY "sessions_select_own" ON "session" FOR SELECT USING (user_id = auth.get_current_user_id());
CREATE POLICY "sessions_delete_own" ON "session" FOR DELETE USING (user_id = auth.get_current_user_id());

-- ACCOUNT POLICIES
CREATE POLICY "accounts_select_own" ON "account" FOR SELECT USING (user_id = auth.get_current_user_id());

-- PROFILES POLICIES
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.get_current_user_id());
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (auth.is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.get_current_user_id());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (auth.is_admin());

-- PRODUCTS POLICIES (public read for active)
CREATE POLICY "products_select_public" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "products_select_admin" ON products FOR SELECT USING (auth.is_admin());
CREATE POLICY "products_insert_admin" ON products FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY "products_update_admin" ON products FOR UPDATE USING (auth.is_admin());
CREATE POLICY "products_delete_admin" ON products FOR DELETE USING (auth.is_admin());

-- ORDERS POLICIES
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (user_id = auth.get_current_user_id());
CREATE POLICY "orders_select_admin" ON orders FOR SELECT USING (auth.is_admin());
CREATE POLICY "orders_insert_auth" ON orders FOR INSERT WITH CHECK (auth.is_authenticated() AND user_id = auth.get_current_user_id());
CREATE POLICY "orders_update_own" ON orders FOR UPDATE USING (user_id = auth.get_current_user_id() AND status = 'pending');
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (auth.is_admin());

-- TRANSACTIONS POLICIES
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (user_id = auth.get_current_user_id());
CREATE POLICY "transactions_select_admin" ON transactions FOR SELECT USING (auth.is_admin());

-- SETTINGS POLICIES
CREATE POLICY "settings_select_public" ON settings FOR SELECT USING (is_public = TRUE);
CREATE POLICY "settings_select_admin" ON settings FOR SELECT USING (auth.is_admin());
CREATE POLICY "settings_all_admin" ON settings FOR ALL USING (auth.is_admin());

-- AUDIT LOGS POLICIES
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT USING (auth.is_admin());
