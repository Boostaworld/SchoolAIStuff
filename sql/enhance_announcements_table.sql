-- Enhancement migration for announcements table
-- Adds hero images, pinned announcements, and banner control

-- Add new columns
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banner_enabled BOOLEAN DEFAULT true;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_active_pinned
  ON public.announcements(active, is_pinned DESC, created_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_announcements_category
  ON public.announcements(category, created_at DESC);

-- Function to enforce max 3 pinned announcements
CREATE OR REPLACE FUNCTION check_pinned_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_pinned = true THEN
    IF (SELECT COUNT(*)
        FROM announcements
        WHERE is_pinned = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
       ) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 pinned announcements allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce pinned limit
DROP TRIGGER IF EXISTS enforce_pinned_limit ON public.announcements;
CREATE TRIGGER enforce_pinned_limit
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION check_pinned_limit();

-- Insert sample announcements for testing
INSERT INTO public.announcements (title, summary, content, version, category, active, hero_image_url, is_pinned, banner_enabled)
VALUES
  (
    'Welcome to Orbit Intelligence',
    'New announcement system with changelog and admin controls',
    E'# Welcome to the New Announcement System\n\nWe''ve just launched a comprehensive announcement and changelog system with:\n\n- **Dismissible Banners** - Stay informed about important updates\n- **Interactive Changelog** - Browse updates by category and version\n- **Rich Content** - Full markdown support with code blocks\n\n```typescript\nconst example = "Syntax highlighting works!";\nconsole.log(example);\n```\n\nEnjoy the new features!',
    '2.4.0',
    'feature',
    true,
    null,
    true,
    true
  ),
  (
    'Performance Improvements',
    'Faster load times and smoother animations',
    E'## What''s New\n\nWe''ve optimized the platform for better performance:\n\n- Reduced initial load time by 40%\n- Improved animation frame rates\n- Better caching strategies\n- Optimized database queries\n\nYou should notice a snappier experience across the board!',
    '2.3.8',
    'update',
    true,
    null,
    false,
    false
  ),
  (
    'Security Update',
    'Important security patches applied',
    E'# Security Update\n\nWe''ve applied several important security patches:\n\n- Fixed XSS vulnerability in markdown rendering\n- Updated authentication flow\n- Enhanced input sanitization\n- Improved rate limiting\n\n**Action Required**: None - all updates are automatic.\n\nYour data remains safe and secure.',
    '2.3.5',
    'system',
    true,
    null,
    false,
    false
  )
ON CONFLICT DO NOTHING;
