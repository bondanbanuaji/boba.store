-- ============================================
-- RLS HELPER FUNCTIONS
-- ============================================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.get_current_user_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE current_user_id TEXT;
BEGIN
    SELECT user_id INTO current_user_id FROM "session"
    WHERE token = current_setting('request.headers', true)::json->>'x-session-token'
      AND expires_at > NOW();
    RETURN current_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.get_current_user_id();
    RETURN user_role = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN RETURN auth.get_current_user_id() IS NOT NULL; END;
$$;
