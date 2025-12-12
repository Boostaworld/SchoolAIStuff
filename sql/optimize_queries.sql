-- ============================================
-- QUERY OPTIMIZATION: Phase 1
-- ============================================
-- This script creates optimized functions and indexes
-- to dramatically reduce query count and improve performance.
-- ============================================

-- ============================================
-- 1. OPTIMIZED DM CHANNELS FUNCTION
-- ============================================
-- Replaces the N+1 query pattern (40+ queries) with a single call.
-- Returns channels with unread counts, last message preview, and other user info.

CREATE OR REPLACE FUNCTION get_dm_channels_with_meta(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user1_id uuid,
  user2_id uuid,
  created_at timestamptz,
  read_receipts_enabled boolean,
  other_user_id uuid,
  other_user_username text,
  other_user_avatar text,
  other_user_orbit_points integer,
  other_user_tasks_completed integer,
  other_user_tasks_forfeited integer,
  other_user_last_active timestamptz,
  unread_count bigint,
  last_message_content text,
  last_message_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH user_channels AS (
    -- Get all channels for this user that aren't hidden
    SELECT c.*
    FROM dm_channels c
    LEFT JOIN user_hidden_channels uhc 
      ON uhc.channel_id = c.id AND uhc.user_id = p_user_id
    WHERE (c.user1_id = p_user_id OR c.user2_id = p_user_id)
      AND uhc.channel_id IS NULL
  ),
  channel_unreads AS (
    -- Count unread messages per channel (sent by OTHER user, not read)
    SELECT 
      m.channel_id,
      COUNT(*) as unread_count
    FROM messages m
    JOIN user_channels uc ON m.channel_id = uc.id
    WHERE m.sender_id != p_user_id
      AND m.read = false
      AND m.deleted_at IS NULL
    GROUP BY m.channel_id
  ),
  channel_last_msg AS (
    -- Get most recent message per channel
    SELECT DISTINCT ON (m.channel_id)
      m.channel_id,
      m.content as last_message_content,
      m.created_at as last_message_at
    FROM messages m
    JOIN user_channels uc ON m.channel_id = uc.id
    WHERE m.deleted_at IS NULL
    ORDER BY m.channel_id, m.created_at DESC
  )
  SELECT
    uc.id,
    uc.user1_id,
    uc.user2_id,
    uc.created_at,
    COALESCE(uc.read_receipts_enabled, true) as read_receipts_enabled,
    -- Other user info
    CASE WHEN uc.user1_id = p_user_id THEN uc.user2_id ELSE uc.user1_id END as other_user_id,
    p.username as other_user_username,
    p.avatar_url as other_user_avatar,
    COALESCE(p.orbit_points, 0) as other_user_orbit_points,
    COALESCE(p.tasks_completed, 0) as other_user_tasks_completed,
    COALESCE(p.tasks_forfeited, 0) as other_user_tasks_forfeited,
    p.last_active as other_user_last_active,
    -- Aggregated data
    COALESCE(cu.unread_count, 0) as unread_count,
    SUBSTRING(clm.last_message_content, 1, 100) as last_message_content,
    COALESCE(clm.last_message_at, uc.created_at) as last_message_at
  FROM user_channels uc
  LEFT JOIN channel_unreads cu ON cu.channel_id = uc.id
  LEFT JOIN channel_last_msg clm ON clm.channel_id = uc.id
  LEFT JOIN profiles p ON p.id = (
    CASE WHEN uc.user1_id = p_user_id THEN uc.user2_id ELSE uc.user1_id END
  )
  ORDER BY COALESCE(clm.last_message_at, uc.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dm_channels_with_meta(uuid) TO authenticated;

-- ============================================
-- 2. MISSING INDEXES
-- ============================================
-- These indexes speed up common query patterns.

-- Index for unread message counting (critical for DM performance)
CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON messages(channel_id, sender_id, read) 
  WHERE read = false AND deleted_at IS NULL;

-- Index for tasks by user and creation time (for sorted task lists)
CREATE INDEX IF NOT EXISTS idx_tasks_user_created 
  ON tasks(user_id, created_at DESC);

-- Index for intel drops by author and creation (for feed queries)
CREATE INDEX IF NOT EXISTS idx_intel_drops_created 
  ON intel_drops(created_at DESC);

-- Index for notifications (unread count queries)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
  ON notifications(recipient_id, is_read) 
  WHERE is_read = false;

-- Index for fast sorting of high-score users (Constellation Map / Leaderboards)
CREATE INDEX IF NOT EXISTS idx_profiles_orbit_points 
  ON profiles(orbit_points DESC);

-- ============================================
-- 3. VERIFICATION
-- ============================================
-- Run this to verify the function works:
-- SELECT * FROM get_dm_channels_with_meta('YOUR_USER_ID_HERE');
