-- ============================================
-- DIAGNOSTIC SQL - Run this FIRST to see what exists
-- ============================================

-- 1. Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check specific Gold Master tables
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shop_items') 
    THEN 'shop_items EXISTS ✅' 
    ELSE 'shop_items MISSING ❌' 
  END as shop_items_status,
  
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_inventory') 
    THEN 'user_inventory EXISTS ✅' 
    ELSE 'user_inventory MISSING ❌' 
  END as inventory_status,
  
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') 
    THEN 'contracts EXISTS ✅' 
    ELSE 'contracts MISSING ❌' 
  END as contracts_status,
  
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vault_files') 
    THEN 'vault_files EXISTS ✅' 
    ELSE 'vault_files MISSING ❌' 
  END as vault_status,
  
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') 
    THEN 'notifications EXISTS ✅' 
    ELSE 'notifications MISSING ❌' 
  END as notifications_status;

-- 3. Check if profiles has new columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('can_customize_ai', 'unlocked_models', 'is_admin', 'super_admin', 'current_theme_id');
