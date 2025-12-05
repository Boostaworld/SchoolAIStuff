-- ================================================
-- DIAGNOSTIC: Check Messages & Channels Status
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Check if messages table exists and count rows
SELECT 
  'messages' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as most_recent_message
FROM public.messages;

-- 2. Check if dm_channels table exists and count rows
SELECT 
  'dm_channels' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as most_recent_channel
FROM public.dm_channels;

-- 3. Show all messages with sender details (if any exist)
SELECT 
  m.id,
  m.content,
  m.created_at,
  m.read,
  p.username as sender_username,
  m.channel_id
FROM public.messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id
ORDER BY m.created_at DESC
LIMIT 20;

-- 4. Show all channels with user details
SELECT 
  c.id as channel_id,
  c.created_at,
  u1.username as user1,
  u2.username as user2,
  (SELECT COUNT(*) FROM public.messages WHERE channel_id = c.id) as message_count
FROM public.dm_channels c
LEFT JOIN public.profiles u1 ON c.user1_id = u1.id
LEFT JOIN public.profiles u2 ON c.user2_id = u2.id
ORDER BY c.created_at DESC;

-- 5. Check RLS policies on messages table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages';

-- 6. Check for orphaned messages (messages without valid channels)
SELECT 
  m.id,
  m.created_at,
  m.channel_id,
  CASE 
    WHEN c.id IS NULL THEN 'ORPHANED - Channel deleted'
    ELSE 'Valid'
  END as status
FROM public.messages m
LEFT JOIN public.dm_channels c ON m.channel_id = c.id
WHERE c.id IS NULL;
