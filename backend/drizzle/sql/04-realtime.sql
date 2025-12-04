-- ============================================
-- REALTIME SETUP
-- Enable realtime for tables that need live updates
-- ============================================

-- Enable realtime for orders (for order status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable realtime for profiles (for balance updates)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for transactions (for transaction history)
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
