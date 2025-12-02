# 🚀 ORBIT OS - PHASE 3 DEPLOYMENT GUIDE
**Connectivity & Training Features**

---

## ✅ IMPLEMENTATION STATUS

### **COMPLETED:**
- ✅ Database schema (`phase3_migrations.sql`)
- ✅ TypeScript types for Social & Training
- ✅ Zustand store with full Social & Training slices
- ✅ ConstellationMap (deterministic hash positioning)
- ✅ CommsPanel (DM interface with typing indicators)
- ✅ MessageBubble (with reactions & file attachments)
- ✅ TypingTerminal (live WPM, accuracy, error tracking)
- ✅ KeyboardHeatmap (color-coded per-key accuracy)
- ✅ ProfileModal (with "Initialize Uplink" button)
- ✅ Realtime subscriptions for messages & reactions
- ✅ Typing indicator broadcast logic
- ✅ File upload with public URL fetching

---

## 📋 DEPLOYMENT CHECKLIST

### **STEP 1: Apply Database Migrations**

1. Open your **Supabase SQL Editor**
2. Copy and paste the **entire contents** of `phase3_migrations.sql`
3. Execute the script
4. Verify tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'dm_channels', 'messages', 'message_reactions',
     'typing_challenges', 'typing_sessions', 'typing_stats'
   );
   ```

### **STEP 2: Enable Realtime**

Go to **Supabase Dashboard → Database → Replication** and ensure these tables are enabled:
- ✅ `dm_channels`
- ✅ `messages`
- ✅ `message_reactions`

### **STEP 3: Create Storage Bucket**

1. Go to **Supabase Dashboard → Storage**
2. Verify bucket `dm_attachments` exists (should be auto-created by migration)
3. If not, create it:
   - Name: `dm_attachments`
   - Public: **No** (private bucket)
   - Policy: Users can only access their own files

### **STEP 4: Verify RLS Policies**

Run this query to check policies exist:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('dm_channels', 'messages', 'message_reactions');
```

You should see policies like:
- `Users can view own DM channels`
- `Users can send messages in their channels`
- `Users can add reactions`

### **STEP 5: Seed Typing Challenges**

The migration includes 6 typing challenges. Verify they exist:
```sql
SELECT id, title, difficulty FROM typing_challenges ORDER BY difficulty;
```

If empty, the INSERT failed. Manually run the seed section from `phase3_migrations.sql`.

---

## 🧪 TESTING PROCEDURES

### **TEST 1: Constellation Map**

1. Navigate to the **Constellation Map** tab (Map icon in sidebar)
2. **Expected Behavior:**
   - All users appear as stars
   - Online users: Cyan glow, pulsing animation
   - Offline users: Dimmed violet, 40% opacity
   - Stars maintain fixed positions (deterministic hash)
   - Hovering shows tooltip with username & status
   - Clicking opens ProfileModal

**✅ Pass Criteria:**
- Stars don't jump around on re-render
- Online status updates in real-time
- Lines connect nearby online users

---

### **TEST 2: Direct Messaging Flow**

#### **2A: Initialize Uplink**
1. Open **Constellation Map** or **Registry**
2. Click on another user
3. Click **[ INITIALIZE UPLINK ]** button
4. **Expected:** CommsPanel slides in from right, channel is created/opened

#### **2B: Send Text Message**
1. Type a message in the input field
2. Press **Send** (paper plane icon)
3. **Expected:**
   - Message appears immediately (optimistic update)
   - Message shows on right side (cyan bubble)
   - Timestamp displays correctly

#### **2C: Typing Indicators**
1. Have two users in the same DM channel
2. User A starts typing
3. **Expected on User B's screen:**
   - "Operative is transmitting..." appears above messages
   - Three animated dots (●●●)
   - Disappears when User A stops typing

#### **2D: Reactions**
1. Hover over any message
2. Click the **Smile icon** (⚪)
3. Select an emoji from the picker
4. **Expected:**
   - Emoji appears below message
   - Your reaction has cyan glow
   - Click your reaction to remove it

#### **2E: File Attachments**
1. Click **Paperclip icon** in input
2. Select an image or file
3. File preview appears above input
4. Send the message
5. **Expected:**
   - File attachment card displays in message
   - Shows file icon (image/document)
   - File name is visible
   - Click to download (opens in new tab)

**🐛 Common Issues:**
- **File uploads fail:** Check Supabase Storage policies
- **Typing indicator doesn't show:** Check broadcast channel subscription
- **Messages don't update in real-time:** Verify Realtime is enabled for `messages` table

---

### **TEST 3: Velocity Training**

#### **3A: Challenge Selector**
1. Navigate to **Training** tab (Zap icon)
2. **Expected:**
   - 6 typing challenges displayed
   - Color-coded by difficulty (Green/Amber/Red)
   - Shows title, snippet, and difficulty badge

#### **3B: Typing Terminal**
1. Click **START** on any challenge
2. Begin typing the displayed text
3. **Expected Live Feedback:**
   - **Correct chars:** Turn green
   - **Incorrect chars:** Turn red, screen shakes after 3 errors
   - **WPM:** Updates in real-time (top stat)
   - **Accuracy:** Updates as percentage
   - **Error Count:** Increments on mistakes
   - **Progress Bar:** Fills from left to right

#### **3C: Completion Flow**
1. Complete a challenge by typing all characters correctly
2. **Expected:**
   - Success overlay with trophy icon
   - Final stats display (WPM, Accuracy, Score)
   - Session syncs to database
   - Returns to challenge selector after 3 seconds

#### **3D: Keyboard Heatmap**
1. After completing challenges, scroll to **Performance Heatmap**
2. **Expected:**
   - Full keyboard layout rendered
   - Keys color-coded by accuracy:
     - 🟢 Green: 90-100% accuracy
     - 🟡 Yellow: 75-90%
     - 🟠 Orange: 50-75%
     - 🔴 Red: <50%
     - ⚪ Gray: No data
   - Hover over key shows tooltip with:
     - Key character
     - Accuracy percentage
     - Total presses
     - Error count
   - Low accuracy keys pulse with red glow

**✅ Pass Criteria:**
- WPM calculation is accurate: `(correctChars / 5) / minutes`
- Heatmap updates after each session
- Max WPM saves to profile

---

## 🔍 DEBUGGING TOOLS

### **Check Realtime Connection**
```javascript
// In browser console
const channel = supabase.channel('test');
channel.subscribe((status) => {
  console.log('Realtime status:', status);
});
```

### **Inspect Zustand State**
```javascript
// In browser console
const state = useOrbitStore.getState();
console.log('Online Users:', state.onlineUsers);
console.log('DM Channels:', state.dmChannels);
console.log('Messages:', state.messages);
console.log('Typing Heatmap:', state.typingHeatmap);
```

### **Test Presence Tracking**
```sql
-- Run in Supabase SQL Editor to see online users
SELECT * FROM supabase_realtime.presence;
```

### **View Message History**
```sql
-- Check messages in a specific channel
SELECT
  m.id,
  m.content,
  m.attachment_url,
  p.username as sender,
  m.created_at
FROM messages m
JOIN profiles p ON m.sender_id = p.id
WHERE m.channel_id = 'YOUR_CHANNEL_ID'
ORDER BY m.created_at DESC;
```

---

## 🚨 TROUBLESHOOTING

### **Issue: "Users can't see each other online"**
**Cause:** Presence tracking not initialized
**Fix:**
1. Check `initialize()` function in `useOrbitStore.ts` line 167
2. Ensure `presenceChannel.track()` is called
3. Verify user is authenticated

### **Issue: "DM channels show 'Unknown' username"**
**Cause:** `otherUser` field not populated
**Fix:** Already fixed in this update! `fetchDMChannels()` now joins profiles.

### **Issue: "Typing indicator never disappears"**
**Cause:** Broadcast channel not cleaning up
**Fix:** Already fixed! `setTyping()` now sends `typing: false` event.

### **Issue: "File attachments show broken image"**
**Cause:** Using storage path instead of public URL
**Fix:** Already fixed! `sendMessage()` now calls `getPublicUrl()`.

### **Issue: "Heatmap keys all gray"**
**Cause:** `syncTypingStats()` not called
**Fix:** Ensure `submitSession()` calls `syncTypingStats(keyStats)` after challenge completion.

---

## 🎯 POST-DEPLOYMENT VERIFICATION

Run this complete test flow:

1. **User A** logs in → Creates task → Completes typing challenge
2. **User B** logs in from different browser/device
3. **Verify presence:** User B should see User A online in Constellation Map
4. **User B** clicks User A → Clicks **Initialize Uplink**
5. **User B** sends message: "Test message"
6. **Verify realtime:** User A should receive message instantly (no refresh)
7. **User A** types response → User B sees typing indicator
8. **User A** sends message with file attachment
9. **User B** clicks file → Downloads successfully
10. **User B** adds 👍 reaction → User A sees it appear
11. **Both users** complete typing challenges
12. **Verify heatmap:** Keys turn green/yellow/red based on accuracy

**✅ All tests pass?** Phase 3 is fully operational!

---

## 📊 PERFORMANCE METRICS

Monitor these for production health:

- **Presence Channel:** <100ms sync latency
- **Message Delivery:** <200ms optimistic → real reconciliation
- **Typing Terminal:** 60fps rendering (check with browser DevTools)
- **Heatmap Render:** <500ms for full keyboard visualization

---

## 🎉 PHASE 3 COMPLETE!

You now have:
- Real-time DM messaging with file attachments
- Typing indicator broadcasts
- Emoji reactions
- Live presence tracking (Constellation Map)
- Typing training with per-key accuracy heatmaps
- Profile integration with velocity stats

**Next Steps:**
- Add notifications for new messages
- Implement message search
- Add group channels (3+ users)
- Challenge leaderboards
- Custom keyboard themes for heatmap

---

**Generated by Claude Code // Orbit OS Engineering Team**
