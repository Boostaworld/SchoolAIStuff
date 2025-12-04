-- ============================================
-- Add Author Role Fields to Intel Drops
-- For VIP Badge System (Phase 2.4)
-- ============================================

-- Add columns for author roles to intel_drops table
ALTER TABLE public.intel_drops
ADD COLUMN IF NOT EXISTS author_is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS author_ai_plus BOOLEAN DEFAULT false;

-- Populate existing drops with author role data from profiles
UPDATE public.intel_drops d
SET
  author_is_admin = p.is_admin,
  author_ai_plus = p.can_customize_ai
FROM public.profiles p
WHERE d.author_id = p.id;

-- Verification query (run this after the migration)
-- SELECT id, query, author_username, author_is_admin, author_ai_plus
-- FROM intel_drops
-- WHERE author_is_admin = true OR author_ai_plus = true
-- LIMIT 10;

-- ✅ Migration complete!
-- Now intel drops will display VIP badges for admins and AI+ users
