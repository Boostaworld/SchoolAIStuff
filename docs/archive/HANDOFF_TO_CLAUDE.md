# 🚀 ORBIT OS - GOLD MASTER IMPLEMENTATION HANDOFF
## Complete Context for Claude Code CLI

---

## 📋 PROJECT OVERVIEW

**App:** Orbit OS - Typing practice platform with economy, AI features, and social elements  
**Tech Stack:** Next.js 14, Zustand, Supabase (Auth, DB, Storage), Framer Motion  
**Current Phase:** Gold Master Implementation (Economy + AI + Racing fixes)  
**Progress:** 30% complete (3/11 major components done)  
**Dev Server:** Running on `npm run dev` at http://localhost:3000/

---

## ✅ COMPLETED WORK (This Session)

### Database Layer (100% Complete)
- ✅ All tables created in Supabase:
  - `shop_items` (6 items seeded)
  - `user_inventory`
  - `vault_files` + `vault_access`
  - `contracts`
  - `notifications`
  - `user_settings`
- ✅ `profiles` table extended with:
  - `can_customize_ai` (BOOLEAN)
  - `unlocked_models` (TEXT[])
  - `super_admin` (BOOLEAN)
  - `current_theme_id` (UUID)
  - `ai_depth_limit` (INTEGER)
  - `last_passive_claim` (TIMESTAMP)
  - `active_session_start` (TIMESTAMP)
  - `is_admin` (BOOLEAN) - from old migration

- ✅ RPC Functions Working:
  - `claim_passive_points()` - 5min cooldown, max 60 pts
  - `purchase_item(p_item_id UUID)` - Deducts points, adds to inventory
  - `equip_item(p_item_id UUID)` - Unequips old, equips new

### UI Components Completed

#### 1. BlackMarket.tsx ✅
**Location:** `components/Economy/BlackMarket.tsx`  
**Features:**
- Category tabs (All, Themes, Borders, AI Models, Cursors)
- Rarity-based styling:
  - Common: slate glow
  - Rare: blue glow
  - Epic: purple glow  
  - Legendary: yellow glow + pulse animation
- Purchase modal with point balance check
- Equip functionality (only one item per slot)
- "Owned" and "Equipped" badges
- Lock icon if insufficient points

**Fixed:**
- Replaced `import { toast } from 'sonner'` → `import { toast } from '@/lib/toast'`
- Changed all `user` references → `currentUser` (matches store)

#### 2. PassiveMiner.tsx ✅  
**Location:** `components/Economy/PassiveMiner.tsx`  
**Features:**
- Animated mining orb (Framer Motion)
- 5-minute countdown timer (updates every second)
- Anti-AFK detection (pauses if user inactive >5min)
- Particle effects (3 floating sprites)
- Points claim functionality
- Visual states: active (green), idle (gray), ready (yellow + pulse)

**Fixed:**
- Toast imports
- `currentUser` references

**⚠️ CRITICAL BUG - NOT FIXED:**
- **Issue:** PassiveMiner widget renders too high on screen, not properly centered
- **Attempted Fix:** Changed container from `p-6 max-w-2xl mx-auto` to `w-full h-full flex items-center justify-center p-6`
- **Result:** Still not working - component needs better centering solution
- **Location:** Line 125-127 in `components/Economy/PassiveMiner.tsx`

#### 3. TheVault.tsx ✅
**Location:** `components/Economy/TheVault.tsx`  
**Features:**
- Drag-drop file upload modal
- Course filtering (dynamic tabs based on uploaded files)
- Lock/unlock system (deducts points, grants access)
- File download links
- Metadata form: file name, course tag, teacher name, unlock cost
- File size formatting (B/KB/MB)
- Grid layout with FileText icons

**⚠️ TODO:**
- Need to create `vault-files` storage bucket in Supabase
- Test upload/download flow once bucket exists

### Utility Files Created

#### lib/toast.ts ✅
**Why:** `sonner` package failed to install (dependency conflict)  
**Solution:** Created sonner-compatible API using browser alerts  
**Usage:** `toast.success()`, `toast.error()`, `toast.info()`  
**Future:** Replace alerts with custom toast UI component

---

## 🚧 IN PROGRESS / BLOCKED

### PassiveMiner Centering Bug 🐛
**Status:** URGENT - User reports still not centered  
**Symptom:** Widget appears too high on screen  
**Expected:** Should be vertically and horizontally centered in viewport  
**Current Code (line 125):**
```typescript
return (
  <div className="w-full h-full flex items-center justify-center p-6">
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden max-w-2xl w-full">
```

**Possible Issue:** Parent container may not have proper height  
**Fix Needed:** Check where PassiveMiner is rendered and ensure parent has `h-screen` or similar

---

## ❌ NOT STARTED (Per MASTER_ROADMAP.md)

### Next Components to Build (In Order):

1. **IntelCommandDeck.tsx** (Lines 160-181 in MASTER_ROADMAP.md)
   - Model selector dropdown (Flash/Pro/Orbit-X with lock icons)
   - Depth slider (1-9 with cyberpunk styling)
   - Research mode toggle (JSON vs conversational)
   - Override Protocols textarea (custom system instructions)
   - Conversation history panel (show previous messages)
   - "Deep Dive" and "New Session" buttons
   - **Backend:** `lib/ai/IntelService.ts` with security checks

2. **GodModePanel.tsx** (Lines 182-197 in MASTER_ROADMAP.md)
   - Hidden tab (only if `user.is_admin = true`)
   - User table with inline editing
   - Permission toggles (is_admin, can_customize_ai)
   - Model whitelist checkboxes (updates `unlocked_models[]`)
   - Edit points, ban, delete actions
   - **Backend:** Admin slice in `useOrbitStore.ts`

3. **NotificationTray.tsx** (Lines 406-407 in MASTER_ROADMAP.md)
   - Bell icon in navbar with red dot (unread count)
   - Dropdown panel with notification cards
   - Mark as read / mark all read
   - Deep links to source
   - Real-time Supabase subscription
   - Race mode queuing (deliver notifications after race)

4. **ContractsPanel.tsx** (Lines 118-133 in MASTER_ROADMAP.md)
   - Contract list with filters
   - Create modal (escrow points)
   - Claim/submit proof/approve flow
   - Auto-resolution logic (7 days)
   - **Backend:** RPCs for create_contract, claim_contract, complete_contract

5. **Racing Fixes** (Lines 409-438 in MASTER_ROADMAP.md)
   - `hooks/useRaceInterpolation.ts` - Time-based bot progress
   - Update `RacingTerminal.tsx` to use interpolation
   - `hooks/useTypingEngine.ts` - Dual modes (practice vs race)

---

## 🎯 IMMEDIATE NEXT STEPS

### Step 1: Fix PassiveMiner Centering (URGENT)
1. Find where `<PassiveMiner />` is rendered (likely in Dashboard or main layout)
2. Ensure parent container has proper height: `h-screen` or `min-h-screen`
3. Test centering works on different screen sizes
4. **Update MASTER_ROADMAP.md line 92** with fix details

### Step 2: Build IntelCommandDeck.tsx
- Reference lines 160-268 in MASTER_ROADMAP.md for complete specs
- Create `lib/ai/IntelService.ts` first (backend logic)
- Add Intel slice to `store/useOrbitStore.ts`
- Build UI component with all controls
- **Update MASTER_ROADMAP.md line 160** to mark [x] when complete

### Step 3: Build GodModePanel.tsx
- Reference lines 182-373 in MASTER_ROADMAP.md
- Add Admin slice to store
- Build user management table
- Test permission updates
- **Update MASTER_ROADMAP.md line 182** when done

---

## 📝 CRITICAL REQUIREMENTS

### Always Update Progress in MASTER_ROADMAP.md
- **Location:** `c:\Users\kayla\Downloads\copy-of-orbit\MASTER_ROADMAP.md`
- **Format:** Change `[ ]` to `[x]` for completed items
- **Add Notes:** Include timestamps like "(11/25 11:20am)" for fixes
- **Document Issues:** Use `⚠️ **TODO**:` or `🐛 **BUG**:` for blockers
- **Why:** If you shut down mid-session, next agent knows exactly where to resume

### Store Structure (useOrbitStore.ts)
- Uses `currentUser` NOT `user`
- Pattern: `const { currentUser } = useOrbitStore();`
- Check `currentUser?.id` before queries
- Located at: `c:\Users\kayla\Downloads\copy-of-orbit\store\useOrbitStore.ts`

### Toast System
- Import: `import { toast } from '@/lib/toast';`
- Usage: `toast.success('message')`, `toast.error('message')`, `toast.info('message')`
- DO NOT use `sonner` package (not installed)

### Supabase Storage Buckets Needed
- `vault-files` - For TheVault file uploads (NOT CREATED YET)
- `avatars` - Already exists

---

## 🗂️ PROJECT STRUCTURE

```
c:\Users\kayla\Downloads\copy-of-orbit\
├── components/
│   ├── Economy/
│   │   ├── BlackMarket.tsx ✅
│   │   ├── PassiveMiner.tsx ✅ (BUG: centering)
│   │   └── TheVault.tsx ✅
│   ├── Intel/
│   │   └── IntelCommandDeck.tsx ❌ (NEXT)
│   ├── Admin/
│   │   └── GodModePanel.tsx ❌
│   └── Notifications/
│       └── NotificationTray.tsx ❌
├── lib/
│   ├── supabase.ts
│   ├── toast.ts ✅ (created)
│   └── ai/
│       └── IntelService.ts ❌ (NEXT)
├── store/
│   └── useOrbitStore.ts (needs Intel + Admin slices)
├── MASTER_ROADMAP.md ⭐ (PRIMARY REFERENCE)
└── sql/
    ├── gold_master_schema.sql ✅ (executed)
    └── verify_setup.sql ✅

```

---

## 🔑 KEY DOCUMENTS

1. **MASTER_ROADMAP.md** - Complete implementation guide
   - Lines 60-96: Week 1 (Database + Economy) - MOSTLY DONE
   - Lines 118-153: Week 2 (Contracts + Notifications) - NOT STARTED
   - Lines 154-407: Intel + God Mode specs - NEXT TO BUILD
   - Lines 598-672: Conflict resolutions (user-approved)

2. **task.md** - Progress tracking
   - Location: `C:\Users\kayla\.gemini\antigravity\brain\a633ef25-2b83-43ce-94bf-b64af0a5fc5e\task.md`
   - Keep in sync with roadmap

3. **Supabase Dashboard**
   - Tables: All created ✅
   - RLS Policies: Configured ✅
   - Storage: Need `vault-files` bucket ⚠️
   - Realtime: Enable for notifications, contracts, vault_files

---

## 🚨 BLOCKERS & WARNINGS

1. **PassiveMiner centering** - Highest priority fix
2. **Vault storage bucket** - Must create before testing uploads
3. **Sonner removed** - Use `lib/toast.ts` only
4. **Store uses currentUser** - NOT `user`
5. **No browser subagent** - Test manually in browser

---

## 🎬 START HERE

```bash
# 1. Verify app is running
# Should see at http://localhost:3000/

# 2. Fix PassiveMiner centering FIRST
# - Find parent component rendering <PassiveMiner />
# - Add proper height to parent container
# - Test vertical centering

# 3. Update MASTER_ROADMAP.md with fix
# - Line 92: Add timestamp + "Fixed centering"

# 4. Build IntelCommandDeck.tsx
# - Reference MASTER_ROADMAP.md lines 160-268
# - Start with lib/ai/IntelService.ts backend
# - Then build UI component
# - Update roadmap as you go

# 5. Test everything before moving on
```

---

**Good luck! Update MASTER_ROADMAP.md religiously. Future you will thank you.** 🚀
