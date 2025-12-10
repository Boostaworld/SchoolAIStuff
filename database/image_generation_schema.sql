-- ====================================
-- SYNTHESIS LAB - Image Generation Storage
-- ====================================

-- Table: image_folders
-- Organizes generated images into collections/folders
CREATE TABLE IF NOT EXISTS image_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#06B6D4', -- Cyan theme color
  icon TEXT DEFAULT '📁',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_count INTEGER DEFAULT 0,

  CONSTRAINT unique_folder_per_user UNIQUE(user_id, name)
);

-- Table: generated_images
-- Stores all AI-generated images with metadata
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES image_folders(id) ON DELETE SET NULL,

  -- Image Data
  image_url TEXT NOT NULL, -- Base64 data URL or storage URL
  thumbnail_url TEXT, -- Optional smaller preview

  -- Generation Parameters
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model TEXT NOT NULL, -- 'gemini-3-image' or 'gemini-2.5-flash-image'
  aspect_ratio TEXT NOT NULL, -- '1:1', '16:9', etc.
  style TEXT NOT NULL, -- 'photorealistic', 'anime', etc.
  resolution TEXT NOT NULL, -- '1K', '2K', '4K'

  -- Advanced Features
  web_search_used BOOLEAN DEFAULT FALSE,
  thinking_enabled BOOLEAN DEFAULT FALSE,
  thinking_process TEXT, -- AI's reasoning text
  thought_images JSONB, -- Array of thought image URLs

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Stats
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_folder_id ON generated_images(folder_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_is_favorite ON generated_images(is_favorite);
CREATE INDEX IF NOT EXISTS idx_generated_images_model ON generated_images(model);
CREATE INDEX IF NOT EXISTS idx_image_folders_user_id ON image_folders(user_id);

-- Enable Row Level Security
ALTER TABLE image_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_folders
CREATE POLICY "Users can view their own folders"
  ON image_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
  ON image_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON image_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON image_folders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for generated_images
CREATE POLICY "Users can view their own images"
  ON generated_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON generated_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON generated_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON generated_images FOR DELETE
  USING (auth.uid() = user_id);

-- Function: Update folder image count
CREATE OR REPLACE FUNCTION update_folder_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE image_folders
    SET image_count = image_count + 1,
        updated_at = NOW()
    WHERE id = NEW.folder_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE image_folders
    SET image_count = GREATEST(0, image_count - 1),
        updated_at = NOW()
    WHERE id = OLD.folder_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
    -- Moving image between folders
    UPDATE image_folders
    SET image_count = GREATEST(0, image_count - 1),
        updated_at = NOW()
    WHERE id = OLD.folder_id;

    UPDATE image_folders
    SET image_count = image_count + 1,
        updated_at = NOW()
    WHERE id = NEW.folder_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update folder counts when images change
DROP TRIGGER IF EXISTS trigger_update_folder_image_count ON generated_images;
CREATE TRIGGER trigger_update_folder_image_count
  AFTER INSERT OR UPDATE OR DELETE ON generated_images
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_image_count();

-- Function: Update folder timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on folder changes
DROP TRIGGER IF EXISTS trigger_update_folder_timestamp ON image_folders;
CREATE TRIGGER trigger_update_folder_timestamp
  BEFORE UPDATE ON image_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create default "Uncategorized" folder for each user (optional)
-- You can run this after users exist, or let the app create it on first use
