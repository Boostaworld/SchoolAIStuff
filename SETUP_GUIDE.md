# Complete Setup Guide - Phases 0-6 Implementation

## Overview

This guide covers all SQL migrations and setup steps required to implement features from Phases 0-6 of the School AI platform (excluding Phase 5, which is postponed).

**Timeline of Implementation:**
- Phase 0: Initial setup (already complete)
- Phase 1: ✅ Critical bug fixes (8 items)
- Phase 2: ✅ DM enhancements + VIP badges
- Phase 3: ✅ DM notification system
- Phase 4: ✅ Markdown/math formatting
- Phase 5: ⏸️ Postponed (AI Chat Sharing)
- Phase 6: ✅ Interactive Schedule System

---

## Prerequisites

Before starting, ensure you have:
- ✅ Supabase project set up
- ✅ Access to Supabase SQL Editor
- ✅ Node.js and npm installed
- ✅ Project dependencies installed (`npm install`)

---

## Step 1: Install NPM Dependencies (Phase 4)

These packages are required for markdown and math rendering:

```bash
npm install react-markdown remark-math rehype-katex remark-gfm katex --legacy-peer-deps
npm install --save-dev @types/katex
```

**Why `--legacy-peer-deps`?** The project uses React 19, and some packages may have peer dependency conflicts. This flag allows installation to proceed.

---

## Step 2: Run SQL Migrations

Execute these SQL files in your Supabase SQL Editor **in this exact order**:

### 2.1 Phase 2: Author Roles for Intel Drops

**File:** `sql/add_author_roles_to_intel_drops.sql`

**Purpose:** Adds `author_is_admin` and `author_ai_plus` columns to `intel_drops` table to support VIP badge display in the horde feed.

```sql
-- Add columns for author role information
ALTER TABLE public.intel_drops
ADD COLUMN IF NOT EXISTS author_is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS author_ai_plus BOOLEAN DEFAULT false;

-- Backfill existing drops with author role data
UPDATE intel_drops d
SET
  author_is_admin = p.is_admin,
  author_ai_plus = p.can_customize_ai
FROM profiles p
WHERE d.author_id = p.id;
```

**Expected Result:** Columns added, existing data updated with author roles.

---

### 2.2 Phase 3: DM Communication System

**File:** `sql/add_dm_comms.sql`

**Purpose:** Creates tables and storage buckets for the DM system with realtime support.

**What it creates:**
- `dm_channels` table (channels between two users)
- `messages` table (individual messages with attachments)
- `message_reactions` table (emoji reactions)
- `dm_attachments` storage bucket (for file uploads)
- RLS policies (row-level security)
- Realtime publication for instant updates

**Key Features:**
- Unique constraint ensures only one channel per user pair
- Messages support text + file attachments
- Public storage bucket for image embeds
- Automatic timestamp tracking

---

### 2.3 Phase 3: Image Embeds for Intel Drops

**File:** `sql/SETUP_IMAGE_EMBEDS.sql`

**Purpose:** Enable image uploads for intel drops (transmissions) and make storage buckets public for image embeds.

**What it does:**
- Makes `dm_attachments` bucket public (required for `<img>` tags to work)
- Creates `intel_attachments` storage bucket (public)
- Adds `attachment_url` and `attachment_type` columns to `intel_drops` (if not already exists)
- Sets up RLS policies for file uploads

**Why public buckets?** HTML `<img src={url}>` tags require publicly accessible URLs. RLS policies still control WHO can upload files.

---

### 2.4 Admin Delete Permissions

**File:** `sql/fix_admin_delete_permissions.sql`

**Purpose:** Allow admin users to delete ANY task, transmission (intel drop), or user profile.

**What it fixes:**
- Previous policies only allowed users to delete their OWN content
- Admins (`is_admin = TRUE`) now have full delete permissions
- Affects tables: `tasks`, `intel_drops`, `profiles`

**How to verify it worked:**
```sql
-- Check policies after running migration
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('tasks', 'intel_drops', 'profiles');
```

---

### 2.5 Phase 6: School Schedule System

**File:** `sql/create_school_schedule.sql`

**Purpose:** Create the master schedule table that all users see in the schedule timer.

**What it creates:**
- `school_schedule` table with columns:
  - `period_number` (1-10)
  - `period_label` (e.g., "Period 1", "Lunch")
  - `period_type` ('Class', 'Break', 'Lunch')
  - `start_time` and `end_time` (HH:MM format)
  - `is_enabled` (toggle to hide periods)
- Sample data (10-period day with lunch and break)
- RLS policies:
  - Everyone (authenticated) can **read** schedule
  - Only admins can **edit** schedule

**Sample periods included:**
- Period 1-3 (morning classes)
- Break (10 min)
- Period 4-5 (mid-day classes)
- Lunch (30 min)
- Period 6-9 (afternoon classes)

**How to verify it worked:**
```sql
-- Check that periods were created
SELECT period_number, period_label, start_time, end_time, period_type
FROM school_schedule
ORDER BY period_number;
```

Expected: 10 rows with periods 1-9 and a break/lunch.

---

## Step 3: Verify Database Setup

After running all migrations, run these verification queries:

### Check tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('dm_channels', 'messages', 'message_reactions', 'intel_drops', 'school_schedule');
```

Expected: All 5 tables listed.

### Check storage buckets:
```sql
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('dm_attachments', 'intel_attachments');
```

Expected: Both buckets exist, both marked as `public = true`.

### Check RLS policies:
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('dm_channels', 'messages', 'tasks', 'intel_drops', 'school_schedule')
GROUP BY tablename;
```

Expected: Each table has at least 1 policy.

---

## Step 4: Environment Variables

Ensure your `.env.local` or environment has:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

**Note:** Gemini API key should have access to Gemini 3.0 preview models if you want to use those features (from earlier phases).

---

## Step 5: Build & Test

### Build the project:
```bash
npm run build
```

**Expected:** 0 TypeScript errors, build completes successfully.

### Start development server:
```bash
npm run dev
```

**Expected:** Server starts on `http://localhost:3000`

---

## Step 6: Feature Testing Checklist

Test each feature to ensure everything works:

### Phase 1: Bug Fixes ✅
- [ ] Horde feed images display correctly (feed + modal)
- [ ] Image modals close with ESC key, backdrop click, or X button
- [ ] Last seen timestamps show "5m ago" format (not ISO)
- [ ] User presence updates (last_active refreshes every 30 seconds)
- [ ] No memory leaks from typing indicators (check DevTools)
- [ ] Opening DM scrolls to bottom automatically
- [ ] Notification badge only shows when `unreadCount > 0`
- [ ] Online status consistent (same in search and DMs)

### Phase 2: DM Enhancements ✅
- [ ] Messages grouped by day ("Today", "Yesterday", "Dec 1")
- [ ] VIP badges show for admin (gold crown) and AI+ (cyan sparkles)
- [ ] Badges appear in: DMs, horde feed, profiles, search
- [ ] Real avatars display everywhere (no "OP" placeholders)

### Phase 3: DM Notifications ✅
- [ ] Favicon updates with red badge + unread count
- [ ] Channel list shows red indicators on unread DMs
- [ ] Browser notifications appear for new messages
- [ ] Persistent alert banner shows when `totalUnreadDMs > 0`
- [ ] Clicking banner opens DM panel to correct channel
- [ ] Marking DM as read clears all indicators

### Phase 4: Message Formatting ✅
- [ ] LaTeX math renders: `$\\sigma = \\sqrt{x}$`
- [ ] Code blocks format: ` ```javascript console.log('test') ``` `
- [ ] Markdown bold, italic, headers work
- [ ] Long messages (10+ lines) show "Expand full message" button
- [ ] Clicking "Expand" opens full modal with formatted content

### Phase 6: Schedule System ✅
- [ ] Schedule timer appears at top of screen during school hours
- [ ] Countdown timer updates every second
- [ ] Progress bar animates smoothly
- [ ] Hexagonal progress ring shows percentage
- [ ] Clicking "View Schedule" expands schedule preview
- [ ] Schedule tab in sidebar opens full schedule view
- [ ] Admin can access Schedule Editor in God Mode panel
- [ ] Admin can add/edit/delete periods
- [ ] Time validation prevents overlapping periods
- [ ] Period types (Class/Break/Lunch) display with correct colors

---

## Step 7: Admin Setup (First Time Only)

### Make yourself admin:
```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

### Set up initial schedule (if you want to customize):
```sql
-- Clear sample data
DELETE FROM school_schedule;

-- Insert your school's actual schedule
INSERT INTO school_schedule (period_number, period_label, period_type, start_time, end_time, is_enabled) VALUES
(1, 'Homeroom', 'Class', '07:30', '07:45', true),
(2, 'Period 1', 'Class', '07:50', '08:40', true),
(3, 'Period 2', 'Class', '08:45', '09:35', true),
-- ... add your periods ...
(10, 'Period 8', 'Class', '15:15', '16:05', true);
```

---

## Step 8: Common Issues & Troubleshooting

### Issue: "Table does not exist" errors

**Cause:** SQL migrations not run yet.

**Fix:** Run all SQL files in order (Step 2).

---

### Issue: Images don't load in DMs or feed

**Cause:** Storage buckets not set to public.

**Fix:** Run `sql/SETUP_IMAGE_EMBEDS.sql` again, or manually set buckets to public:
```sql
UPDATE storage.buckets
SET public = true
WHERE id IN ('dm_attachments', 'intel_attachments');
```

---

### Issue: Admin can't delete content

**Cause:** RLS policies not updated.

**Fix:** Run `sql/fix_admin_delete_permissions.sql`.

**Verify:** Try deleting a task/transmission as admin. Check browser console for error logs.

---

### Issue: Schedule timer doesn't show

**Possible causes:**
1. No periods configured → Add periods in God Mode > Schedule Editor
2. Current time is outside school hours → Schedule only shows during configured periods
3. All periods disabled → Enable periods in editor

**Debug:** Check console for log: `✅ Schedule loaded: X periods`

---

### Issue: Markdown/math not rendering

**Cause:** Dependencies not installed.

**Fix:** Run:
```bash
npm install react-markdown remark-math rehype-katex remark-gfm katex --legacy-peer-deps
```

Then rebuild:
```bash
npm run build
```

---

### Issue: "npm install" fails with peer dependency errors

**Fix:** Use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

This is normal with React 19 projects.

---

## Step 9: Performance Tips

### Enable Supabase Realtime:

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for these tables:
   - `dm_channels`
   - `messages`
   - `message_reactions`
   - `school_schedule`

### Add Database Indexes (Optional, for better performance):

```sql
-- Speed up message queries
CREATE INDEX IF NOT EXISTS idx_messages_channel_created
ON messages(channel_id, created_at DESC);

-- Speed up DM channel lookups
CREATE INDEX IF NOT EXISTS idx_dm_channels_users
ON dm_channels(user1_id, user2_id);

-- Speed up schedule queries
CREATE INDEX IF NOT EXISTS idx_schedule_period_number
ON school_schedule(period_number) WHERE is_enabled = true;
```

---

## Step 10: Future Enhancements (Not Yet Implemented)

### Phase 5: AI Chat Sharing (Postponed)
- User can select messages from Intel conversations
- Share to Horde Feed or DMs
- Formatted as "AI Chat about {subject}"

**Status:** Planned, not implemented yet.

---

### Phase 7: Custom Class Names (Planned)
- Admin sets period TIMES (Period 1: 8:00-8:50)
- Users customize what CLASS they have (Period 1: "AP Biology")
- Requires new table: `user_schedule_customization`

**Status:** Planned, not implemented yet.

---

## Workflow Documentation

### How Schedule Editing Works:

**For Admins:**
1. Go to Dashboard sidebar → click "God Mode" (Shield icon)
2. Switch to "Schedule Editor" tab
3. Click "Add Period" to create new period
4. Click "Edit" (pencil icon) on existing period to modify
5. Set:
   - Period number (1-10)
   - Label (e.g., "Period 1", "Lunch")
   - Type (Class/Break/Lunch) → affects color scheme
   - Start/End times (HH:MM format, 24-hour)
   - Enabled toggle (show/hide from schedule)
6. Click "Save" → changes apply instantly
7. Click "Delete" (trash icon) to remove period

**Validation:**
- Start time must be before end time
- Time format must be HH:MM (24-hour)
- System prevents invalid times

**For Users:**
1. Schedule timer shows at top of screen (fixed position)
2. Displays:
   - Current period name + type badge
   - Time remaining (countdown)
   - Hexagonal progress indicator (0-100%)
   - Next period info
3. Click "View Schedule" button to expand preview
4. Click "Schedule" in sidebar for full-page view
5. Current period highlights with colored glow
6. Progress bars show how far through each period

**Color Coding:**
- **Cyan:** Class periods
- **Purple:** Break periods
- **Orange:** Lunch periods

**Timer Updates:**
- Real-time countdown (updates every second)
- Progress bar animates smoothly
- Auto-advance notification when period ends (console log)
- Disappears when no period is active (outside school hours)

**Period Workflow:**
1. Admin creates periods with times
2. System fetches schedule on app load
3. Timer checks current time every second
4. Finds which period user is in (if any)
5. Calculates time remaining + progress percentage
6. Updates UI with smooth animations
7. When period ends, shows next period info

---

## Summary Checklist

Before deploying to production:

- [ ] All SQL migrations run successfully
- [ ] NPM dependencies installed (with `--legacy-peer-deps`)
- [ ] Build completes with 0 errors
- [ ] Dev server starts without issues
- [ ] At least one admin user created
- [ ] Schedule periods configured (or sample data accepted)
- [ ] Storage buckets are public
- [ ] RLS policies verified
- [ ] All features tested (see Step 6 checklist)
- [ ] Realtime replication enabled for key tables
- [ ] Environment variables set correctly

---

## Support & Next Steps

**If you encounter issues:**
1. Check browser console for error logs
2. Check Supabase logs (Dashboard → Logs)
3. Verify SQL migrations ran correctly (use verification queries from Step 3)
4. Review this guide's "Common Issues" section (Step 8)

**Ready for Phase 5 (AI Chat Sharing)?**
- Refer to `C:\\Users\\kayla\\.claude\\plans\\curious-cooking-sutherland.md`
- Lines 792-931 contain full implementation plan

**Ready for Phase 7 (Custom Classes)?**
- User-specific class names per period
- Will require new database table
- Implementation not started yet

---

**Setup Complete! 🎉**

All phases 0-6 (excluding 5) are now fully implemented and ready to use.
