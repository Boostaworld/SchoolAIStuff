# Orbit App - Database Migration Guide

## Overview
This guide will help you migrate your Supabase database to support the new Intel features. The migration adds support for:
- Intel research engine with AI-powered dossiers
- Intel Drops (shareable research) in the Horde Feed
- User profiles with bio and custom Intel AI instructions
- Avatar uploads via Supabase Storage

## Prerequisites
- Access to your Supabase project dashboard
- The database migrations SQL file (`database_migrations.sql`)

## Migration Steps

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** tab in the left sidebar
3. Create a new query

### Step 2: Run the Migration
1. Open the `database_migrations.sql` file in this project
2. Copy the entire contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** to execute the migration

The migration will:
- ✅ Remove the `squad_id` column from profiles (no longer needed)
- ✅ Add `bio` field to profiles (200 character limit)
- ✅ Add `intel_instructions` field to profiles (custom AI instructions)
- ✅ Create the `intel_drops` table for shareable research
- ✅ Set up Row Level Security (RLS) policies for intel_drops
- ✅ Create the `avatars` storage bucket for profile pictures
- ✅ Set up storage policies for avatar uploads

### Step 3: Verify Migration Success
After running the migration, verify everything worked:

1. Check the profiles table has new columns:
   ```sql
   SELECT * FROM profiles LIMIT 1;
   ```
   You should see: `bio` and `intel_instructions` columns

2. Check the intel_drops table exists:
   ```sql
   SELECT * FROM intel_drops LIMIT 1;
   ```

3. Check the avatars storage bucket:
   - Go to **Storage** in Supabase dashboard
   - You should see an `avatars` bucket

### Step 4: Test the Features
Once migration is complete, test the new features in the app:

1. **Intel Research**
   - Click the Database icon in the sidebar
   - Run a research query (e.g., "quantum computing applications")
   - Save the intel drop (public or private)

2. **Horde Feed**
   - Check that your saved intel drop appears in the Horde Feed
   - Verify public drops are visible

3. **Edit Profile**
   - Click your avatar in the bottom left
   - Upload a new avatar image
   - Add a bio
   - Customize Intel AI instructions

4. **Operative Database**
   - Click the Users icon in the sidebar
   - Search for other users by username
   - View their profiles

## Troubleshooting

### Migration Failed
If the migration fails:
1. Check if you already have an `intel_drops` table
2. Try running the migration in smaller chunks:
   - First: ALTER TABLE statements
   - Second: CREATE TABLE statement
   - Third: RLS policies
   - Fourth: Storage bucket creation

### Storage Bucket Issues
If avatar uploads don't work:
1. Go to Supabase Storage settings
2. Manually create an `avatars` bucket
3. Set it to **Public**
4. Add the storage policies from `database_migrations.sql`

### RLS Policy Errors
If you get permission errors:
1. Verify RLS is enabled on the `intel_drops` table
2. Check that the policies were created correctly
3. Run this query to verify:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'intel_drops';
   ```

## Rollback (If Needed)
If you need to rollback the migration:

```sql
-- Remove intel_drops table
DROP TABLE IF EXISTS intel_drops CASCADE;

-- Remove avatars storage bucket (via Supabase dashboard)

-- Restore squad_id (if you need it)
ALTER TABLE profiles ADD COLUMN squad_id TEXT;
```

## New Database Schema

### profiles table
```sql
- id (uuid, primary key)
- username (text)
- avatar_url (text)
- tasks_completed (integer)
- tasks_forfeited (integer)
- status (text)
- bio (text) -- NEW
- intel_instructions (text) -- NEW
- last_active (timestamp)
- created_at (timestamp)
```

### intel_drops table (NEW)
```sql
- id (uuid, primary key)
- author_id (uuid, foreign key -> profiles)
- query (text)
- summary_bullets (text[])
- sources (jsonb)
- related_concepts (text[])
- is_private (boolean)
- created_at (timestamp)
```

## Support
If you encounter any issues, please check:
1. Supabase logs in the dashboard
2. Browser console for client-side errors
3. Network tab for API errors

The app should now be fully functional with all new Intel features!
