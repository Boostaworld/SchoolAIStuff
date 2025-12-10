-- Fix permissions and policies for Image Generation
-- Run this to resolve "policy already exists" errors or "relation does not exist" access issues.

-- Grant access to public (authenticated users)
GRANT ALL ON TABLE image_folders TO authenticated;
GRANT ALL ON TABLE image_folders TO service_role;
GRANT ALL ON TABLE generated_images TO authenticated;
GRANT ALL ON TABLE generated_images TO service_role;

-- Drop existing policies to allow clean recreation
DROP POLICY IF EXISTS "Users can view their own folders" ON image_folders;
DROP POLICY IF EXISTS "Users can create their own folders" ON image_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON image_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON image_folders;

DROP POLICY IF EXISTS "Users can view their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can create their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can update their own images" ON generated_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON generated_images;

-- Now enable RLS (idempotent)
ALTER TABLE image_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Recreate Policies (Folders)
CREATE POLICY "Users can view their own folders"
  ON image_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON image_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON image_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON image_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Recreate Policies (Images)
CREATE POLICY "Users can view their own images"
  ON generated_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own images"
  ON generated_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON generated_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON generated_images FOR DELETE
  USING (auth.uid() = user_id);
