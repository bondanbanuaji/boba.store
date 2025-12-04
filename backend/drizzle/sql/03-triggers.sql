-- =============================================
-- AUTO UPDATE TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_session_updated_at BEFORE UPDATE ON "session" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON "account" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verification_updated_at BEFORE UPDATE ON "verification" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTO CREATE PROFILE
-- ============================================
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, created_at) VALUES (NEW.id, NEW.name, NOW()) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created AFTER INSERT ON "user" FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ============================================
-- ORDER NUMBER GENERATOR
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE new_order_number TEXT; counter INTEGER := 0;
BEGIN
    LOOP
        new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN RETURN new_order_number; END IF;
        counter := counter + 1;
        IF counter > 100 THEN RAISE EXCEPTION 'Could not generate unique order number'; END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_order_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN NEW.order_number := generate_order_number(); END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_order_insert BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- ============================================
-- BALANCE TRANSACTION
-- ============================================
CREATE OR REPLACE FUNCTION process_balance_transaction(
    p_user_id TEXT, p_type VARCHAR(20), p_amount DECIMAL(15,2),
    p_description TEXT DEFAULT NULL, p_order_id UUID DEFAULT NULL, p_reference_id VARCHAR(100) DEFAULT NULL
) RETURNS transactions AS $$
DECLARE v_current_balance DECIMAL(15,2); v_new_balance DECIMAL(15,2); v_transaction transactions;
BEGIN
    SELECT balance INTO v_current_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF v_current_balance IS NULL THEN RAISE EXCEPTION 'User profile not found: %', p_user_id; END IF;
    v_new_balance := v_current_balance + p_amount;
    IF p_type = 'purchase' AND v_new_balance < 0 THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    UPDATE profiles SET balance = v_new_balance, updated_at = NOW() WHERE id = p_user_id;
    INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after, description, reference_id)
    VALUES (p_user_id, p_order_id, p_type, p_amount, v_current_balance, v_new_balance, p_description, p_reference_id)
    RETURNING * INTO v_transaction;
    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORDER STATUS UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID, p_new_status VARCHAR(20), p_payment_status VARCHAR(20) DEFAULT NULL,
    p_provider_trx_id VARCHAR(100) DEFAULT NULL, p_provider_status VARCHAR(50) DEFAULT NULL,
    p_provider_sn TEXT DEFAULT NULL, p_provider_message TEXT DEFAULT NULL
) RETURNS orders AS $$
DECLARE v_order orders; v_old_status VARCHAR(20); v_valid_transitions TEXT[];
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found: %', p_order_id; END IF;
    v_old_status := v_order.status;
    v_valid_transitions := CASE v_old_status
        WHEN 'pending' THEN ARRAY['processing', 'cancelled', 'failed']
        WHEN 'processing' THEN ARRAY['success', 'failed']
        WHEN 'failed' THEN ARRAY['refunded', 'processing']
        WHEN 'success' THEN ARRAY['refunded']
        ELSE ARRAY[]::TEXT[] END;
    IF NOT (p_new_status = ANY(v_valid_transitions)) THEN RAISE EXCEPTION 'Invalid transition: % -> %', v_old_status, p_new_status; END IF;
    UPDATE orders SET status = p_new_status, payment_status = COALESCE(p_payment_status, payment_status),
        provider_trx_id = COALESCE(p_provider_trx_id, provider_trx_id), provider_status = COALESCE(p_provider_status, provider_status),
        provider_sn = COALESCE(p_provider_sn, provider_sn), provider_message = COALESCE(p_provider_message, provider_message),
        completed_at = CASE WHEN p_new_status IN ('success','failed','cancelled','refunded') THEN NOW() ELSE completed_at END, updated_at = NOW()
    WHERE id = p_order_id RETURNING * INTO v_order;
    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE OR REPLACE FUNCTION log_audit_changes() RETURNS TRIGGER AS $$
DECLARE v_old_values JSONB; v_new_values JSONB; v_action VARCHAR(50); v_record_id TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN v_action := 'INSERT'; v_old_values := NULL; v_new_values := to_jsonb(NEW); v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN v_action := 'UPDATE'; v_old_values := to_jsonb(OLD); v_new_values := to_jsonb(NEW); v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'DELETE' THEN v_action := 'DELETE'; v_old_values := to_jsonb(OLD); v_new_values := NULL; v_record_id := OLD.id::TEXT; END IF;
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (auth.get_current_user_id(), v_action, TG_TABLE_NAME, v_record_id, v_old_values, v_new_values);
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_orders_changes AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER audit_transactions_changes AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER audit_profiles_changes AFTER UPDATE ON profiles FOR EACH ROW WHEN (OLD.balance IS DISTINCT FROM NEW.balance OR OLD.role IS DISTINCT FROM NEW.role) EXECUTE FUNCTION log_audit_changes();

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS INTEGER AS $$
DECLARE v_deleted_count INTEGER;
BEGIN DELETE FROM "session" WHERE expires_at < NOW() RETURNING COUNT(*) INTO v_deleted_count; RETURN v_deleted_count; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_verifications() RETURNS INTEGER AS $$
DECLARE v_deleted_count INTEGER;
BEGIN DELETE FROM verification WHERE expires_at < NOW() RETURNING COUNT(*) INTO v_deleted_count; RETURN v_deleted_count; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
