# Admin Panel: Audit Log & User Activity Setup

## Overview

Two new tabs have been added to your God Mode Admin Panel:

1. **Audit Log** - Discord-style audit trail showing all admin actions
2. **User Activity** - Monitor user AI interactions with chat history and model usage stats

## Features

### Audit Log Tab
- ✅ Real-time feed of all admin actions
- ✅ Color-coded action types (update, delete, grant permissions, etc.)
- ✅ Expandable details showing before/after values
- ✅ Search and filter by action type
- ✅ Timeline visualization
- ✅ Activity statistics

### User Activity Tab
- ✅ Dropdown list of all users
- ✅ Vision Lab session history with full chat transcripts
- ✅ Research Lab reports with bullets and essays
- ✅ Model usage statistics per day
- ✅ Last activity timestamps
- ✅ Session message count and previews

## Setup Instructions

### Step 1: Apply Database Migration

Run the SQL migration to create the necessary tables and policies:

\`\`\`bash
# Copy the SQL file path
C:\Users\kayla\OneDrive\Desktop\SchoolAIStuff\sql\admin_audit_and_activity.sql
\`\`\`

**Apply to Supabase:**

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Paste the contents of `admin_audit_and_activity.sql`
4. Click "Run" to execute the migration

### Step 2: Verify Database Setup

The migration creates:

#### Tables
- `admin_audit_logs` - Stores all admin actions with details
- `admin_user_activity_summary` (VIEW) - Aggregated user activity metrics

#### Indexes (Optimized for Free Tier)
- `idx_audit_logs_created_at` - Fast time-based queries
- `idx_audit_logs_admin_id` - Filter by admin
- `idx_audit_logs_target_user` - Filter by affected user
- `idx_audit_logs_action` - Filter by action type

#### RLS Policies
- Admins can view all vision sessions
- Admins can view all research reports
- Only admins can insert/view audit logs

#### Helper Function
- `get_user_ai_interactions(user_id, limit, offset)` - Paginated AI interaction retrieval

### Step 3: Test the Features

1. **Access Admin Panel**
   - Navigate to God Mode (requires admin permissions)
   - Click on the "Audit Log" tab (amber/shield icon)
   - Click on the "User Activity" tab (cyan/bell icon)

2. **Test Audit Logging**
   - Go to "User Management" tab
   - Edit any user's permissions or points
   - Switch to "Audit Log" tab
   - You should see your action logged in real-time

3. **Test User Activity Monitoring**
   - Go to "User Activity" tab
   - Click on any user to expand their activity
   - View their AI chat sessions and research reports
   - Check model usage statistics

## Query Optimization

All queries are optimized for Supabase free tier:

### Efficient Indexes
- Only essential indexes created
- Partial indexes for conditional data
- Composite indexes avoided unless necessary

### Query Patterns
- Paginated results (limit 50-100)
- Indexed WHERE clauses
- Aggregated view for summary stats
- Server-side function for complex joins

### Performance Tips
- Audit log limited to last 100 entries
- User interactions limited to 50 per user
- Materialized view refreshed on-demand
- Real-time subscriptions for live updates

## File Structure

\`\`\`
components/Admin/
├── GodModePanel.tsx          # Main admin panel (updated)
├── AuditLogPanel.tsx         # NEW: Audit log tab
└── UserActivityPanel.tsx     # NEW: User activity tab

sql/
└── admin_audit_and_activity.sql  # Database migration
\`\`\`

## Troubleshooting

### Issue: "Table does not exist" error
**Solution:** Run the SQL migration in Supabase SQL Editor

### Issue: Audit log not showing entries
**Solution:**
1. Check RLS policies are enabled
2. Verify your user has `is_admin = true` in profiles table
3. Perform an admin action (edit user) to create first entry

### Issue: User activity shows empty
**Solution:**
1. Ensure users have created Vision sessions or Research reports
2. Check RLS policies allow admin to view all sessions
3. Verify `admin_user_activity_summary` view exists

### Issue: Performance slow on free tier
**Solution:**
1. Run `ANALYZE` on tables (included in migration)
2. Reduce `limit` parameters in queries
3. Add more specific WHERE clauses to filters

## Security Notes

- ✅ All queries use RLS (Row Level Security)
- ✅ Only admins can view audit logs
- ✅ Only admins can view all user activity
- ✅ Audit logging is automatic and cannot be disabled
- ✅ Previous values are stored for accountability
- ✅ User privacy protected by admin-only access

## Future Enhancements

Potential additions (not yet implemented):

- Export audit logs to CSV
- Email notifications for critical actions
- Retention policies for old logs
- More granular action types
- User activity charts and graphs
- Bulk user operations with audit trails

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify Supabase connection
3. Ensure migration ran successfully
4. Check admin permissions in profiles table
5. Review RLS policies in Supabase dashboard
