# AI Activity Logging - Integration Guide

## Overview

Complete logging system for tracking ALL AI interactions to monitor credit usage and detect abuse.

**Features:**
- ✅ Batched inserts (no DB flooding)
- ✅ Cost estimation for all models
- ✅ Token counting
- ✅ Comprehensive activity tracking
- ✅ Surveillance-style admin UI
- ✅ Flag suspicious activity

---

## Step 1: Apply Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- File: sql/admin_audit_and_activity.sql
```

Copy the entire contents of `C:\Users\kayla\OneDrive\Desktop\SchoolAIStuff\sql\admin_audit_and_activity.sql` and run it in Supabase.

This creates:
- `ai_activity_logs` table
- `user_ai_stats` view (cost tracking)
- `ai_activity_daily_summary` view
- RLS policies

---

## Step 2: Add Logging to AI Interactions

Import the logger where you make AI calls:

```typescript
import { logChatMessage, logImageGeneration, logResearchQuery, logAIActivity } from '@/lib/utils/activityLogger';
```

### Example 1: Chat Messages (Vision Lab, DM Assistant, etc.)

```typescript
// After receiving AI response
await logChatMessage(
  currentUser.id,
  userMessage,
  aiResponse,
  selectedModel, // 'flash', 'pro', 'gemini-3-flash', etc.
  'vision_lab', // or 'dm_assistant', 'command_deck'
  sessionId // optional
);
```

### Example 2: Image Generation (Synthesis Lab)

```typescript
// After image is generated
await logImageGeneration(
  currentUser.id,
  imagePrompt,
  generatedImageUrl,
  'imagen-3-fast', // or 'imagen-3'
  'synthesis_lab'
);
```

### Example 3: Research Queries

```typescript
// After research completes
await logResearchQuery(
  currentUser.id,
  userQuery,
  researchResponse,
  selectedModel,
  reportId // optional
);
```

### Example 4: Custom Activity

```typescript
await logAIActivity({
  userId: currentUser.id,
  activityType: 'image_edit',
  model: 'imagen-3',
  estimatedCostUsd: 0.04,
  imagePrompt: 'Enhance this image...',
  imageUrl: resultUrl,
  feature: 'image_editor',
  sessionId: editSessionId,
});
```

---

## Step 3: Integration Points

Add logging to these files:

### 1. Vision Lab Chat (`components/VisionLab/*.tsx`)

```typescript
// When sending message and receiving response
const response = await sendMessageToGemini(message, model);

// Log it immediately
await logChatMessage(
  currentUser.id,
  message,
  response,
  model,
  'vision_lab',
  currentSessionId
);
```

### 2. Research Lab (`components/ResearchLab/*.tsx`)

```typescript
// After generating research report
await logResearchQuery(
  currentUser.id,
  query,
  fullReport,
  selectedModel,
  reportId
);
```

### 3. Synthesis Lab / Image Generation (`components/ImageGen/*.tsx`)

```typescript
// After each image generation
await logImageGeneration(
  currentUser.id,
  prompt,
  imageUrl,
  imageModel,
  'synthesis_lab'
);
```

### 4. Image Editor (`lib/ai/imageEditor.ts`)

```typescript
// After image edit operation
await logAIActivity({
  userId,
  activityType: 'image_edit',
  model: 'imagen-3',
  estimatedCostUsd: 0.02,
  userInput: editPrompt,
  imageUrl: editedImageUrl,
  feature: 'image_editor',
});
```

### 5. DM AI Assistant (if exists)

```typescript
// After AI responds to DM
await logChatMessage(
  currentUser.id,
  userMessage,
  aiReply,
  'flash', // or whatever model
  'dm_assistant'
);
```

### 6. Command Deck AI (if exists)

```typescript
// After AI command execution
await logChatMessage(
  currentUser.id,
  command,
  aiResult,
  'pro',
  'command_deck'
);
```

---

## Step 4: Batch Flushing

The logger automatically batches inserts (max 10 every 5 seconds). But you can force flush:

```typescript
import { flushActivityLogs } from '@/lib/utils/activityLogger';

// Before user logs out or critical operations
await flushActivityLogs();
```

---

## Step 5: Using the Admin Panel

1. Go to **God Mode** → **User Activity** tab
2. Select a user from dropdown
3. View all their AI interactions with:
   - Full message history
   - Cost breakdown
   - Token usage
   - Model statistics
   - Filter by activity type
   - Flag suspicious activity

---

## Cost Estimation

The logger automatically estimates costs based on:

```typescript
// Gemini 2.5 Flash
input: $0.075 / 1M tokens
output: $0.30 / 1M tokens

// Gemini 2.5 Pro
input: $1.25 / 1M tokens
output: $5.00 / 1M tokens

// Imagen 3
$0.04 / image

// Imagen 3 Fast
$0.02 / image
```

Update `lib/utils/activityLogger.ts` if pricing changes.

---

## Database Schema

```sql
ai_activity_logs:
- id (UUID)
- user_id (UUID)
- activity_type (text: chat_message, image_generation, etc.)
- model (text: flash, pro, imagen-3, etc.)
- estimated_tokens (int)
- estimated_cost_usd (decimal)
- user_input (text, truncated to 10K chars)
- ai_response (text, truncated to 10K chars)
- image_prompt (text)
- image_url (text)
- feature (text: vision_lab, synthesis_lab, etc.)
- session_id (UUID, optional)
- flagged (boolean)
- flag_reason (text)
- admin_notes (text)
- created_at (timestamptz)
```

---

## Performance Notes

✅ **Batched inserts** prevent DB flooding (max 10 every 5 seconds)
✅ **Truncated content** (10K chars max) prevents bloat
✅ **Indexed queries** for fast admin panel
✅ **Auto-flush** on page unload
✅ **Silent failures** don't break user experience

---

## Security

- RLS policies ensure users only see their own logs
- Admins can view all logs
- Flagging system for abuse detection
- IP address tracking (optional)
- User agent tracking for device info

---

## Monitoring Usage

Check monthly costs per user:

```sql
SELECT
  username,
  SUM(estimated_cost_usd) as total_cost,
  COUNT(*) as interactions
FROM ai_activity_logs
JOIN profiles ON profiles.id = ai_activity_logs.user_id
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY username
ORDER BY total_cost DESC;
```

Find expensive users:

```sql
SELECT * FROM user_ai_stats
WHERE cost_month > 1.00
ORDER BY cost_month DESC;
```

---

## Next Steps

1. ✅ Apply SQL migration
2. ✅ Add logging calls to all AI interaction points
3. ✅ Test by using AI features and checking User Activity tab
4. ✅ Set up cost alerts (optional)
5. ✅ Review flagged activities regularly

---

## Troubleshooting

**"Table not found" error:**
- Run the SQL migration in Supabase

**No activity showing up:**
- Check that logging calls are being made
- Check browser console for errors
- Verify batching is working (logs flush every 5 seconds)

**Costs seem wrong:**
- Update pricing in `lib/utils/activityLogger.ts`
- Token estimation is approximate (~4 chars = 1 token)
