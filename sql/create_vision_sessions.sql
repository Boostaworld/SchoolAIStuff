-- Vision Sessions Table
-- Stores Vision Lab chat sessions with image context

CREATE TABLE IF NOT EXISTS vision_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Analysis',
  image_data TEXT, -- Base64 encoded image data
  messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { role, text, timestamp }
  model_used TEXT DEFAULT 'gemini-3-pro-preview',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_vision_sessions_user_id ON vision_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_vision_sessions_updated_at ON vision_sessions(updated_at DESC);

-- Enable RLS
ALTER TABLE vision_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own vision sessions"
  ON vision_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vision sessions"
  ON vision_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vision sessions"
  ON vision_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vision sessions"
  ON vision_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_vision_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS vision_sessions_updated_at ON vision_sessions;
CREATE TRIGGER vision_sessions_updated_at
  BEFORE UPDATE ON vision_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_vision_session_timestamp();
