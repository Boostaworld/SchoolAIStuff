-- ============================================
-- ADAPTIVE CHALLENGE HELPER FUNCTION
-- ============================================
-- This function returns challenges filtered by user's WPM level
-- Run this after gold_master_schema.sql

CREATE OR REPLACE FUNCTION get_adaptive_challenges(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  text_content TEXT,
  difficulty TEXT,
  category TEXT,
  length_type TEXT,
  word_count INTEGER,
  char_count INTEGER,
  min_wpm INTEGER,
  max_wpm INTEGER,
  ai_difficulty_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_avg_wpm NUMERIC;
BEGIN
  -- Calculate user's average WPM from last 10 sessions
  SELECT COALESCE(AVG(wpm), 0) INTO user_avg_wpm
  FROM public.typing_sessions
  WHERE user_id = p_user_id
  ORDER BY completed_at DESC
  LIMIT 10;

  -- Return challenges that match user's WPM level
  RETURN QUERY
  SELECT
    tc.id,
    tc.title,
    tc.text_content,
    tc.difficulty,
    tc.category,
    tc.length_type,
    tc.word_count,
    tc.char_count,
    tc.min_wpm,
    tc.max_wpm,
    tc.ai_difficulty_score
  FROM public.typing_challenges tc
  WHERE
    -- Category filter (if provided)
    (p_category IS NULL OR tc.category = p_category)
    -- WPM range filter
    AND (tc.min_wpm IS NULL OR user_avg_wpm >= tc.min_wpm)
    AND (tc.max_wpm IS NULL OR user_avg_wpm <= tc.max_wpm)
  ORDER BY
    -- Prioritize challenges close to user's level
    ABS(COALESCE(tc.ai_difficulty_score, 0.5) - (user_avg_wpm / 150.0))
  LIMIT p_limit;
END;
$$;

-- Usage example:
-- SELECT * FROM get_adaptive_challenges(auth.uid(), 'Programming', 10);
