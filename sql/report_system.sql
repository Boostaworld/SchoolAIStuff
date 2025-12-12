-- ============================================
-- Report System: Bug Reports & Suggestions
-- Run in Supabase SQL editor
-- ============================================

-- 1) Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Reporter info (SET NULL on delete to preserve report)
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Report content
  report_type TEXT NOT NULL CHECK (report_type IN ('bug', 'suggestion')),
  user_text TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  
  -- Auto-captured context (JSON blob)
  context JSONB NOT NULL DEFAULT '{}',
  
  -- Workflow status
  status TEXT NOT NULL DEFAULT 'new' 
    CHECK (status IN ('new', 'in_progress', 'need_info', 'resolved', 'closed')),
  
  -- Admin notes (not visible to reporter)
  internal_notes TEXT,
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_type_idx ON public.reports(report_type);
CREATE INDEX IF NOT EXISTS reports_created_idx ON public.reports(created_at DESC);

-- RLS Policies for reports

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Admins can view all reports
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Users can create reports (only for themselves)
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Admins can update any report (status, notes, assignment)
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 2) Report threads table (conversation messages)
CREATE TABLE IF NOT EXISTS public.report_threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.report_threads ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS report_threads_report_idx ON public.report_threads(report_id, created_at);
CREATE INDEX IF NOT EXISTS report_threads_sender_idx ON public.report_threads(sender_id);

-- RLS Policies for report_threads

-- Users can view threads on their own reports
DROP POLICY IF EXISTS "Users can view own report threads" ON public.report_threads;
CREATE POLICY "Users can view own report threads"
  ON public.report_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports 
      WHERE id = report_id AND reporter_id = auth.uid()
    )
  );

-- Admins can view all threads
DROP POLICY IF EXISTS "Admins can view all report threads" ON public.report_threads;
CREATE POLICY "Admins can view all report threads"
  ON public.report_threads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Users can add messages to their own report threads
DROP POLICY IF EXISTS "Users can add to own report threads" ON public.report_threads;
CREATE POLICY "Users can add to own report threads"
  ON public.report_threads FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_admin_reply = false
    AND EXISTS (
      SELECT 1 FROM public.reports 
      WHERE id = report_id AND reporter_id = auth.uid()
    )
  );

-- Admins can add messages to any report thread
DROP POLICY IF EXISTS "Admins can add to any report thread" ON public.report_threads;
CREATE POLICY "Admins can add to any report thread"
  ON public.report_threads FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_admin_reply = true
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3) Realtime publications (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'report_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_threads;
  END IF;
END $$;

-- 4) Updated_at trigger for reports
CREATE OR REPLACE FUNCTION public.update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_updated_at ON public.reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reports_updated_at();

-- Done!
-- To verify: SELECT * FROM public.reports; SELECT * FROM public.report_threads;
