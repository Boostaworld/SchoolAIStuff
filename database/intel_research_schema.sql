-- ====================================
-- INTEL RESEARCH - Research Reports Storage
-- ====================================

-- Table: research_reports
-- Stores structured research results with citations
CREATE TABLE IF NOT EXISTS research_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Query Info
  title TEXT NOT NULL, -- User's research topic/question
  query TEXT NOT NULL, -- Original prompt sent to AI
  
  -- Research Settings
  model TEXT NOT NULL, -- Model used for generation
  depth TEXT NOT NULL DEFAULT 'standard', -- 'light', 'standard', 'deep'
  essay_enabled BOOLEAN DEFAULT FALSE,
  essay_complexity TEXT, -- 'simple', 'academic', 'graduate'
  web_search_used BOOLEAN DEFAULT FALSE,
  thinking_enabled BOOLEAN DEFAULT FALSE,
  
  -- Results
  bullets JSONB NOT NULL, -- Array of { text, sourceIndex }
  sources JSONB NOT NULL, -- Array of { title, url, snippet }
  related_concepts TEXT[] DEFAULT '{}',
  essay TEXT, -- Generated essay (if enabled)
  thinking_process TEXT, -- AI reasoning (if enabled)
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_research_reports_user_id ON research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_reports_is_favorite ON research_reports(is_favorite);
CREATE INDEX IF NOT EXISTS idx_research_reports_model ON research_reports(model);

-- Enable Row Level Security
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reports"
  ON research_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON research_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON research_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON research_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: Auto-update updated_at
CREATE TRIGGER trigger_update_research_report_timestamp
  BEFORE UPDATE ON research_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
