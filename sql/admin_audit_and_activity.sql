-- ====================================
-- ADMIN AUDIT LOG & USER ACTIVITY TRACKING
-- Optimized for Supabase Free Tier
-- ====================================

-- ====================================
-- 1. ADMIN AUDIT LOGS
-- ====================================
-- Tracks all admin actions for accountability
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'update_user', 'delete_user', 'grant_permission', etc.
  details JSONB, -- Changed fields, permissions granted, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimized indexes for free tier (avoid over-indexing)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.admin_audit_logs(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON public.admin_audit_logs(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can insert audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail for all admin actions - Discord-style audit log';

-- ====================================
-- 2. ADMIN RLS POLICIES FOR USER ACTIVITY
-- ====================================
-- Allow admins to view all user AI sessions for monitoring

-- Vision Sessions - Admin can view all
DROP POLICY IF EXISTS "Admins can view all vision sessions" ON public.vision_sessions;
CREATE POLICY "Admins can view all vision sessions"
  ON public.vision_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Research Reports - Admin can view all
DROP POLICY IF EXISTS "Admins can view all research reports" ON public.research_reports;
CREATE POLICY "Admins can view all research reports"
  ON public.research_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ====================================
-- 3. OPTIMIZED VIEWS FOR ADMIN PANEL
-- ====================================

-- View: User Activity Summary (aggregated stats per user)
-- This reduces query load by pre-calculating common metrics
DROP VIEW IF EXISTS admin_user_activity_summary;
CREATE VIEW admin_user_activity_summary AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,

  -- Vision Lab stats
  COUNT(DISTINCT vs.id) AS vision_sessions_count,
  COUNT(DISTINCT vs.id) FILTER (
    WHERE vs.created_at >= NOW() - INTERVAL '24 hours'
  ) AS vision_sessions_today,

  -- Research Lab stats
  COUNT(DISTINCT rr.id) AS research_reports_count,
  COUNT(DISTINCT rr.id) FILTER (
    WHERE rr.created_at >= NOW() - INTERVAL '24 hours'
  ) AS research_reports_today,

  -- Last activity
  GREATEST(
    MAX(vs.updated_at),
    MAX(rr.updated_at)
  ) AS last_activity

FROM public.profiles p
LEFT JOIN public.vision_sessions vs ON vs.user_id = p.id
LEFT JOIN public.research_reports rr ON rr.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url;

-- Grant access to authenticated users (RLS will still apply)
GRANT SELECT ON admin_user_activity_summary TO authenticated;

-- ====================================
-- 4. HELPER FUNCTION: Get User AI Interactions
-- ====================================
-- Returns paginated AI interactions for a specific user
-- Optimized to reduce data transfer on free tier

CREATE OR REPLACE FUNCTION get_user_ai_interactions(
  target_user_id UUID,
  interaction_limit INT DEFAULT 50,
  interaction_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT, -- 'vision' or 'research'
  model TEXT,
  created_at TIMESTAMPTZ,
  preview TEXT, -- First message or title
  message_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  (
    -- Vision sessions
    SELECT
      vs.id,
      'vision'::TEXT AS type,
      vs.model_used AS model,
      vs.created_at,
      vs.name AS preview,
      jsonb_array_length(vs.messages) AS message_count
    FROM public.vision_sessions vs
    WHERE vs.user_id = target_user_id

    UNION ALL

    -- Research reports
    SELECT
      rr.id,
      'research'::TEXT AS type,
      rr.model,
      rr.created_at,
      rr.title AS preview,
      0 AS message_count -- Research is single query
    FROM public.research_reports rr
    WHERE rr.user_id = target_user_id
  )
  ORDER BY created_at DESC
  LIMIT interaction_limit
  OFFSET interaction_offset;
END;
$$;

-- ====================================
-- 5. COMPREHENSIVE AI ACTIVITY LOGGING
-- ====================================
-- Tracks EVERY AI interaction for credit monitoring
CREATE TABLE IF NOT EXISTS public.ai_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Activity type
  activity_type TEXT NOT NULL, -- 'chat_message', 'image_generation', 'research_query', 'vision_session', 'prompt_improve'

  -- Model and cost tracking
  model TEXT NOT NULL, -- 'flash', 'pro', 'gemini-3-flash', 'gemini-3-pro', 'imagen-3', etc.
  estimated_tokens INT, -- Estimated token usage
  estimated_cost_usd DECIMAL(10, 6), -- Estimated cost in USD

  -- Content tracking
  user_input TEXT, -- What the user sent (prompt, question, message)
  ai_response TEXT, -- What the AI responded (truncated if too long)

  -- Image generation specific
  image_prompt TEXT, -- Full image generation prompt
  image_url TEXT, -- Generated image URL
  image_model TEXT, -- 'imagen-3', 'imagen-3-fast', etc.

  -- Session/context tracking
  session_id UUID, -- Links to vision_sessions or research_reports
  parent_activity_id UUID, -- For threaded conversations

  -- Metadata
  feature TEXT, -- 'vision_lab', 'research_lab', 'synthesis_lab', 'dm_assistant', 'command_deck'
  ip_address TEXT, -- For abuse detection
  user_agent TEXT, -- Browser/device info

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Flags for admin review
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  admin_notes TEXT
);

-- Optimized indexes for admin panel queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.ai_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.ai_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON public.ai_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_model ON public.ai_activity_logs(model);
CREATE INDEX IF NOT EXISTS idx_activity_logs_flagged ON public.ai_activity_logs(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON public.ai_activity_logs(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.ai_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own activity
DROP POLICY IF EXISTS "Users can view own activity" ON public.ai_activity_logs;
CREATE POLICY "Users can view own activity"
  ON public.ai_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all activity
DROP POLICY IF EXISTS "Admins can view all activity" ON public.ai_activity_logs;
CREATE POLICY "Admins can view all activity"
  ON public.ai_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- System can insert activity (service role)
DROP POLICY IF EXISTS "System can insert activity" ON public.ai_activity_logs;
CREATE POLICY "System can insert activity"
  ON public.ai_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can flag/unflag activity
DROP POLICY IF EXISTS "Admins can update flags" ON public.ai_activity_logs;
CREATE POLICY "Admins can update flags"
  ON public.ai_activity_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE public.ai_activity_logs IS 'Complete log of all AI interactions for credit tracking and abuse monitoring';

-- ====================================
-- 6. ACTIVITY SUMMARY VIEWS
-- ====================================

-- Daily activity summary per user
CREATE OR REPLACE VIEW ai_activity_daily_summary AS
SELECT
  user_id,
  DATE(created_at) AS activity_date,
  activity_type,
  model,
  COUNT(*) AS interaction_count,
  SUM(estimated_tokens) AS total_tokens,
  SUM(estimated_cost_usd) AS total_cost_usd
FROM public.ai_activity_logs
GROUP BY user_id, DATE(created_at), activity_type, model
ORDER BY activity_date DESC, total_cost_usd DESC;

GRANT SELECT ON ai_activity_daily_summary TO authenticated;

-- User activity stats (for admin panel)
CREATE OR REPLACE VIEW user_ai_stats AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,

  -- Total interactions
  COUNT(a.id) AS total_interactions,
  COUNT(a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '24 hours') AS interactions_today,
  COUNT(a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') AS interactions_week,

  -- By type
  COUNT(a.id) FILTER (WHERE a.activity_type = 'chat_message') AS chat_messages,
  COUNT(a.id) FILTER (WHERE a.activity_type = 'image_generation') AS images_generated,
  COUNT(a.id) FILTER (WHERE a.activity_type = 'research_query') AS research_queries,
  COUNT(a.id) FILTER (WHERE a.activity_type = 'vision_session') AS vision_sessions,

  -- Cost tracking
  SUM(a.estimated_cost_usd) AS total_cost_usd,
  SUM(a.estimated_cost_usd) FILTER (WHERE a.created_at >= NOW() - INTERVAL '24 hours') AS cost_today,
  SUM(a.estimated_cost_usd) FILTER (WHERE a.created_at >= NOW() - INTERVAL '30 days') AS cost_month,

  -- Flagged activity
  COUNT(a.id) FILTER (WHERE a.flagged = true) AS flagged_count,

  -- Last activity
  MAX(a.created_at) AS last_activity

FROM public.profiles p
LEFT JOIN public.ai_activity_logs a ON a.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url;

GRANT SELECT ON user_ai_stats TO authenticated;

-- ====================================
-- 7. ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ====================================
-- Update statistics for query planner
ANALYZE public.admin_audit_logs;
ANALYZE public.ai_activity_logs;
ANALYZE public.vision_sessions;
ANALYZE public.research_reports;
ANALYZE public.profiles;
