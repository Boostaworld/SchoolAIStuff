
-- Create announcements table with extended capabilities
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT, -- Short description for the banner or list view
    content TEXT NOT NULL, -- Full content (Markdown)
    version TEXT, -- e.g., "1.0.0"
    category TEXT DEFAULT 'update', -- 'feature', 'fix', 'system', 'event'
    active BOOLEAN DEFAULT false, -- If true, triggers the banner for users who haven't seen it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public announcements are viewable by everyone" 
ON public.announcements FOR SELECT 
USING (true);

-- Admins only for modifications
CREATE POLICY "Admins can insert announcements" 
ON public.announcements FOR INSERT 
WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
);

CREATE POLICY "Admins can update announcements" 
ON public.announcements FOR UPDATE 
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
);

CREATE POLICY "Admins can delete announcements" 
ON public.announcements FOR DELETE 
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
);

-- Triggers for updated_at
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
DROP TRIGGER IF EXISTS handle_updated_at ON public.announcements;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE PROCEDURE update_announcements_modtime();
