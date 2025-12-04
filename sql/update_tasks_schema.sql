-- ================================================
-- Task System Enhancements: Schema Update
-- ================================================
-- This SQL adds support for:
-- 1. Optional due dates with time
-- 2. Resource links (Google Classroom, rubrics, etc.)
-- 3. Answer/solution storage
-- 4. Task claiming with automatic data sync
-- ================================================

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS resource_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS answer TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Add index for faster lookups of claimed tasks
CREATE INDEX IF NOT EXISTS idx_tasks_original_task_id ON tasks(original_task_id);

-- ================================================
-- Automatic Data Sync Function
-- ================================================
-- When a public task's due_date or resource_links is updated,
-- automatically update all tasks that claimed it
-- ================================================

CREATE OR REPLACE FUNCTION sync_claimed_task_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if:
  -- 1. due_date OR resource_links actually changed
  -- 2. The task is public (others can claim it)
  IF (NEW.due_date IS DISTINCT FROM OLD.due_date OR 
      NEW.resource_links IS DISTINCT FROM OLD.resource_links)
     AND NEW.is_public = true THEN
    -- Update all tasks where original_task_id points to this task
    UPDATE tasks
    SET due_date = NEW.due_date,
        resource_links = NEW.resource_links
    WHERE original_task_id = NEW.id;
    
    -- Log for debugging (optional)
    RAISE NOTICE 'Synced data for task % to % claimed copies', 
      NEW.id, 
      (SELECT COUNT(*) FROM tasks WHERE original_task_id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (for re-running this script)
DROP TRIGGER IF EXISTS sync_claimed_data_trigger ON tasks;
DROP TRIGGER IF EXISTS sync_claimed_dates_trigger ON tasks; -- Old name

-- Create the trigger
CREATE TRIGGER sync_claimed_data_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_claimed_task_data();

-- ================================================
-- Verification Queries
-- ================================================
-- Run these after executing the above to verify:

-- 1. Check new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'tasks' 
-- AND column_name IN ('due_date', 'resource_links', 'answer', 'original_task_id');

-- 2. Check trigger exists
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'sync_claimed_data_trigger';

-- 3. Check index exists
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'tasks' 
-- AND indexname = 'idx_tasks_original_task_id';
