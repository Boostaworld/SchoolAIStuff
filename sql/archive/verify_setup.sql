-- ============================================
-- FINAL VERIFICATION - Check everything is ready
-- ============================================

-- 1. Check all Gold Master tables exist
SELECT 
  CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shop_items') THEN '✅' ELSE '❌' END || ' shop_items' as status
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_inventory') THEN '✅' ELSE '❌' END || ' user_inventory'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN '✅' ELSE '❌' END || ' contracts'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_files') THEN '✅' ELSE '❌' END || ' vault_files'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_access') THEN '✅' ELSE '❌' END || ' vault_access'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN '✅' ELSE '❌' END || ' notifications'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN '✅' ELSE '❌' END || ' user_settings';

-- 2. Check shop items were seeded
SELECT COUNT(*) || ' shop items seeded' as seed_status FROM shop_items;

-- 3. Check RPC functions exist
SELECT 
  CASE WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'claim_passive_points') THEN '✅' ELSE '❌' END || ' claim_passive_points()' as function_status
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'purchase_item') THEN '✅' ELSE '❌' END || ' purchase_item()'
UNION ALL
SELECT CASE WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'equip_item') THEN '✅' ELSE '❌' END || ' equip_item()';

-- 4. Check your profile has all new columns
SELECT 
  can_customize_ai,
  unlocked_models,
  is_admin,
  super_admin,
  current_theme_id,
  last_passive_claim,
  orbit_points
FROM profiles 
WHERE id = auth.uid();

-- 5. Test passive mining (should return 0 if too soon)
SELECT claim_passive_points() as points_claimed;
