# 🚀 Deploy and Test Guide - Session 2 Fixes

**Created:** 2025-11-26
**Focus:** Article excerpts, category selector, z-index fixes

---

## 📦 STEP 1: DEPLOY SQL CHANGES

### Deploy Article Excerpt Challenges

**Option A: Supabase SQL Editor (Recommended)**
1. Log into Supabase Dashboard
2. Navigate to SQL Editor
3. Open `sql/article_excerpt_challenges.sql`
4. Copy entire file contents
5. Paste into SQL Editor
6. Click "RUN"
7. Wait for "Success" message

**Option B: Command Line**
```bash
cd C:\Users\kayla\Downloads\copy-of-orbit
psql YOUR_DATABASE_URL -f sql/article_excerpt_challenges.sql
```

**Verify Deployment:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as total_prose_challenges
FROM typing_challenges
WHERE category IN ('Science', 'Creative', 'History', 'Literature', 'Health', 'Economics', 'Technology');
```
**Expected:** Should show 15+ challenges

---

## 🧪 STEP 2: TEST ARTICLE EXCERPTS

### Test 1: Category Selector Visibility
1. Start dev server: `npm run dev`
2. Navigate to **Race Arena** view
3. **✅ PASS:** You should see a category selector with two buttons:
   - CODE (violet, code icon)
   - PROSE (cyan, book icon)
4. **✅ PASS:** PROSE should be selected by default

### Test 2: Prose Challenge Selection
1. Make sure **PROSE** is selected
2. Click **"Launch Race"**
3. **✅ PASS:** Challenge text should be an article excerpt (NOT code)
4. Check examples:
   - "The vast ocean depths remain largely unexplored..."
   - "Rising global temperatures are reshaping ecosystems..."
   - "Charles Darwin's theory of evolution..."

### Test 3: Code Challenge Selection
1. Click the **CODE** button in category selector
2. Click **"Launch Race"**
3. **✅ PASS:** Challenge text should be code (functions, SQL, etc.)
4. Check examples:
   - `function calculateSum(arr) {...}`
   - `SELECT users.name FROM...`

### Test 4: Category Persistence
1. Select **CODE**
2. Launch a race
3. Exit race (back to Race Arena)
4. **✅ PASS:** CODE should still be selected
5. **✅ PASS:** Launching another race should give code challenge

---

## 🧪 STEP 3: TEST Z-INDEX FIXES

### Test 5: Notification Panel
1. Click **bell icon** in top-right header
2. **✅ PASS:** Notification dropdown appears
3. **✅ PASS:** Dropdown is ABOVE all other UI elements
4. **✅ FAIL:** If dropdown is behind sidebar/modals → z-index not applied

### Test 6: Notification Center
1. Click **bell icon** in left sidebar
2. **✅ PASS:** Navigates to full Notification Center page
3. **✅ PASS:** All notifications listed with timestamps
4. **✅ PASS:** "MARK ALL READ" button works (if unread exist)

### Test 7: Spectator Link
1. Start a race
2. Look for **"SPECTATE"** button in race header
3. Click **SPECTATE** button
4. **✅ PASS:** Popup appears with spectator link
5. **✅ PASS:** Popup is ABOVE all race UI
6. **✅ FAIL:** If popup is behind progress bars → z-index not applied

---

## 🧪 STEP 4: TEST SIDEBAR NAVIGATION

### Test 8: Sidebar During Race
1. Navigate to Race Arena
2. Launch a race
3. On mobile/tablet: **✅ PASS:** Hamburger menu (☰) visible in top-left
4. Click hamburger menu
5. **✅ PASS:** Sidebar slides in as overlay
6. Click any navigation item (e.g., "Intel")
7. **✅ PASS:** Exits race and navigates to selected view

### Test 9: Desktop Sidebar
1. On desktop (>1024px width)
2. Launch a race
3. **✅ PASS:** Sidebar automatically hides (immersive race view)
4. **✅ PASS:** Can still navigate on mobile if testing responsive mode

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: "No prose challenges appear"
**Solution:**
- SQL file not deployed → Deploy `sql/article_excerpt_challenges.sql`
- Challenges not loading → Check browser console for errors
- Filtering not working → Verify `raceCategory` state is 'prose'

### Issue: "Category selector not visible"
**Solution:**
- Component not imported → Check `Dashboard.tsx` Line 19
- State not initialized → Check `Dashboard.tsx` Line 56
- Component placement wrong → Should be above "Start a Race" button

### Issue: "Spectator popup still hidden"
**Solution:**
- Changes not saved → Re-check `RacingTerminal.tsx` Line 323
- Browser cache → Hard refresh (Ctrl+Shift+R)
- CSS conflict → Verify `z-[9999]` in classNames

### Issue: "Sidebar doesn't show in race"
**Solution:**
- On desktop: This is EXPECTED (immersive view)
- On mobile: Hamburger should be visible
- If hamburger hidden: Check `Dashboard.tsx` Lines 400-405

---

## 📊 EXPECTED RESULTS SUMMARY

| Feature | Status | Location |
|---------|--------|----------|
| Article Excerpts | ✅ Ready | SQL deployed |
| Category Selector | ✅ Ready | Race Arena |
| Prose as Default | ✅ Ready | Dashboard state |
| Notification Z-Index | ✅ Fixed | Header bell |
| Notification Center | ✅ Complete | Sidebar bell |
| Spectator Link Z-Index | ✅ Fixed | Race header |
| Sidebar in Race | ✅ Fixed | Mobile hamburger |

---

## 🔍 DEBUGGING TIPS

### Check Console Logs
Open browser console (F12) and look for:
```
🎯 Selected prose challenge: "Climate Change Impact" (Science)
🎯 Selected code challenge: "Code Sprint" (Programming)
```

### Verify State
In React DevTools, check Dashboard component:
- `raceCategory` should be 'code' or 'prose'
- `typingChallenges` should have 20+ items
- `activeRaceChallenge` should match selected category

### Check Database
Run in Supabase:
```sql
-- Count challenges by category
SELECT category, COUNT(*) as count
FROM typing_challenges
GROUP BY category
ORDER BY count DESC;

-- Expected output:
-- Programming: 6-8 challenges
-- Science: 3-4 challenges
-- Creative: 2-3 challenges
-- History: 2-3 challenges
-- Literature: 1-2 challenges
-- etc.
```

---

## ⚡ PERFORMANCE CHECK

### Page Load Speed
- Race Arena should load in < 2 seconds
- Category selector should be instant (no lag)
- Challenge filtering should be imperceptible

### Animation Smoothness
- Category selector button transitions: smooth 60fps
- Sidebar slide animation: smooth (300ms duration)
- No jank or stuttering

### Memory Usage
- No memory leaks after 10+ race launches
- Browser memory should stay stable

---

## 📸 VISUAL VERIFICATION

### Category Selector Appearance
- CODE button: Violet gradient, purple glow, code icon
- PROSE button: Cyan gradient, blue glow, book icon
- Selected state: Pulsing corner dot, animated background
- Hover state: Scale 1.02, smooth transition

### Spectator Link Popup
- Background: slate-900
- Border: purple-500/30
- Shadow: Purple glow (2xl)
- Position: Top-right corner
- Z-index: Above everything

### Notification Center
- Header: "NOTIFICATION CENTER" in cyan
- Layout: Max-width 3xl, centered
- Cards: Slate-900/50 background
- Unread: Pulsing cyan dot indicator
- Empty state: Bell icon + encouraging message

---

## ✅ FINAL CHECKLIST

Before marking this session complete:

- [ ] SQL file deployed to Supabase
- [ ] 15+ prose challenges exist in database
- [ ] Category selector visible in Race Arena
- [ ] PROSE selected by default
- [ ] Prose challenges actually load (not code)
- [ ] Code challenges load when CODE selected
- [ ] Notification panel appears above UI
- [ ] Notification Center page works
- [ ] Spectator link popup appears above UI
- [ ] Sidebar accessible during race (mobile)
- [ ] No console errors
- [ ] No visual bugs

---

## 🚀 WHAT'S NEXT?

After verifying all tests pass, continue with remaining tasks:

1. **Coin Animation System** (see `SESSION_SUMMARY.md`)
2. **Racing UI Style Update** (CRT effects, glows)
3. **Economy Rebalance** (harder coins, higher prices)
4. **Plan File Updates** (keyboard shortcuts, error boundaries)

**Estimated Time:** 3-4 hours to complete all remaining features

---

**Need Help?** Check these files:
- `SESSION_SUMMARY.md` - Complete session overview
- `handoff.md` - Full development log
- `UI_INTEGRATION_GUIDE.md` - Technical details
- `UI_BUGFIXES_QUICKSTART.md` - Previous session fixes

---

**Status:** ✅ All tests documented and ready for execution
**Last Updated:** 2025-11-26
