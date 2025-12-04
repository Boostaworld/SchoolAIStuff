-- ============================================
-- School Schedule System
-- Phase 6: Interactive Schedule with Real-Time Countdown
-- ============================================

-- Create school_schedule table
CREATE TABLE IF NOT EXISTS public.school_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number INT NOT NULL, -- 1-10 for up to 10 periods
  period_label TEXT NOT NULL, -- e.g., "Period 1", "Lunch", "Study Hall"
  period_type TEXT NOT NULL CHECK (period_type IN ('Class', 'Break', 'Lunch')),
  start_time TIME NOT NULL, -- e.g., '08:00:00'
  end_time TIME NOT NULL, -- e.g., '08:45:00'
  is_enabled BOOLEAN DEFAULT true, -- Allow disabling periods (half-days, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(period_number)
);

-- Create index for fast period lookups
CREATE INDEX IF NOT EXISTS idx_schedule_period_number
ON public.school_schedule(period_number);

-- Create index for enabled periods
CREATE INDEX IF NOT EXISTS idx_schedule_enabled
ON public.school_schedule(is_enabled);

-- RLS Policies

-- Enable RLS
ALTER TABLE public.school_schedule ENABLE ROW LEVEL SECURITY;

-- Everyone can read the schedule
CREATE POLICY "Anyone can view schedule"
ON public.school_schedule
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert periods
CREATE POLICY "Admins can insert schedule"
ON public.school_schedule
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Only admins can update periods
CREATE POLICY "Admins can update schedule"
ON public.school_schedule
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Only admins can delete periods
CREATE POLICY "Admins can delete schedule"
ON public.school_schedule
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Sample default schedule (8 periods, lunch, passing periods)
-- Run this after creating the table:

/*
INSERT INTO public.school_schedule (period_number, period_label, period_type, start_time, end_time) VALUES
(1, 'Period 1', 'Class', '08:00:00', '08:45:00'),
(2, 'Period 2', 'Class', '08:50:00', '09:35:00'),
(3, 'Period 3', 'Class', '09:40:00', '10:25:00'),
(4, 'Break', 'Break', '10:25:00', '10:35:00'),
(5, 'Period 4', 'Class', '10:40:00', '11:25:00'),
(6, 'Lunch', 'Lunch', '11:30:00', '12:15:00'),
(7, 'Period 5', 'Class', '12:20:00', '13:05:00'),
(8, 'Period 6', 'Class', '13:10:00', '13:55:00'),
(9, 'Period 7', 'Class', '14:00:00', '14:45:00'),
(10, 'Period 8', 'Class', '14:50:00', '15:35:00')
ON CONFLICT (period_number) DO NOTHING;
*/

-- ✅ Schema created!
-- Next: Add schedule state to useOrbitStore
-- Next: Create ScheduleTimer component
-- Next: Create admin ScheduleEditor
