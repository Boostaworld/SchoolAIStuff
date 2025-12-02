-- ============================================
-- QUICK FIX: Add this at the start of gold_master_schema.sql
-- ============================================
-- This drops ALL existing policies before creating new ones
-- Paste this RIGHT AFTER "CREATE EXTENSION IF NOT EXISTS "uuid-ossp";"

-- Drop all existing policies to prevent conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END$$;
