-- ================================================
-- Fix Task Deletion Logic
-- ================================================
-- This script fixes the issue where deleting a public task
-- also deletes all user copies of that task.
-- It changes the foreign key constraint from CASCADE to SET NULL.
-- ================================================

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- 1. Find the name of the foreign key constraint on original_task_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'tasks'::regclass
    AND confrelid = 'tasks'::regclass
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'original_task_id');

    -- 2. Drop the existing constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || quote_ident(constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;

    -- 3. Add the correct constraint with ON DELETE SET NULL
    ALTER TABLE tasks 
    ADD CONSTRAINT tasks_original_task_id_fkey 
    FOREIGN KEY (original_task_id) 
    REFERENCES tasks(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added new constraint tasks_original_task_id_fkey with ON DELETE SET NULL';

END $$;
