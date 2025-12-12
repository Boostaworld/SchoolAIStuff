-- Add theme support to announcements table

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS custom_theme JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.announcements.theme_id IS 'Preset theme ID (default, christmas, celebration, alert, success, cosmic, valentine, elegant, retro)';
COMMENT ON COLUMN public.announcements.custom_theme IS 'Custom theme override - full AnnouncementTheme JSON object';

-- Add index for theme filtering
CREATE INDEX IF NOT EXISTS idx_announcements_theme
  ON public.announcements(theme_id);

-- Example: Update existing announcements with themed examples
UPDATE public.announcements
SET theme_id = 'celebration'
WHERE category = 'feature' AND title LIKE '%New%';

UPDATE public.announcements
SET theme_id = 'alert'
WHERE category = 'system';

UPDATE public.announcements
SET theme_id = 'success'
WHERE category = 'fix';
