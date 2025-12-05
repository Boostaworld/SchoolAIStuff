-- Fix Oracle Task Count Display
-- This script resets the tasks_completed count to 0 for your profile
-- Run this in your Supabase SQL Editor

-- Option 1: If you know your username (replace 'Hay' with your actual username if different)
UPDATE public.profiles
SET tasks_completed = 0
WHERE username = 'Hay';

-- Option 2: If you're currently logged in, use your current auth user ID
-- (This will update the profile for the currently authenticated user)
-- UPDATE public.profiles
-- SET tasks_completed = 0
-- WHERE id = auth.uid();

-- After running this query, check the result with:
SELECT username, tasks_completed, tasks_forfeited
FROM public.profiles
WHERE username = 'Hay';  -- Replace with your username if different
