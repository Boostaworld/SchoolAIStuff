# Fix Task Persistence Bug

Tasks created through the "Deploy System" modal disappear after page reload, while transmissions persist correctly. This is causing data loss and a broken user experience.

## User Review Required

> [!WARNING]
> **Critical Bug:** Tasks are not being saved properly to the database. Users are losing their created tasks on page reload.

## Root Cause Analysis

After investigating the code, I've identified the issue in [useOrbitStore.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/store/useOrbitStore.ts):

### The Problem

The [addTask](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/store/useOrbitStore.ts#475-517) function (lines 476-516) has a critical flaw:

1. **Missing error handling**: When database INSERT fails, the error is silently ignored
2. **No query format match**: The INSERT uses `.select().single()` but initialization uses `.select('*, profiles!tasks_user_id_fkey(...)')`
3. **Silent failures**: If `error` exists, the optimistic task remains but the real task is never created

### Evidence

```typescript
// Line 501-508: Current broken implementation
const { data, error } = await supabase.from('tasks').insert({
  user_id: currentUser.id,
  title: optimisticTask.title,
  category: optimisticTask.category,
  difficulty: difficulty,
  completed: false,
  is_public: task.is_public || false
}).select().single();

// Line 511-515: Only updates if data exists, but doesn't handle errors!
if (data && !error) {
  set((state) => ({
    tasks: state.tasks.map(t => t.id === tempId ? data as Task : t)
  }));
}
// ❌ If error occurs, the optimistic task stays but no real task exists in DB
```

### Working Example

The [publishManualDrop](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/store/useOrbitStore.ts#902-925) function (lines 902-924) works correctly because:

```typescript
const { data, error } = await supabase
  .from('intel_drops')
  .insert({...})
  .select()
  .single();

if (error) throw error; // ✅ Throws error if insert fails

// Refresh the feed
await get().fetchIntelDrops(); // ✅ Refreshes from database
```

---

## Proposed Changes

### [MODIFY] [useOrbitStore.ts](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/store/useOrbitStore.ts#L476-L516)

**Fix the [addTask](file:///c:/Users/kayla/OneDrive/Desktop/SchoolAIStuff/store/useOrbitStore.ts#475-517) function to properly handle errors and match the query format:**

1. Add proper error handling - throw error if insert fails
2. Match the SELECT query format used in initialization (include profile join)
3. Remove the optimistic task if database insertion fails
4. Add console logging for debugging

**Changes:**
- Line 501-508: Update `.select()` to include profile join matching initialization
- Line 510-515: Add error handling - throw error and remove optimistic task on failure
- Add try/catch block around the DB operation
- Add console error logging for diagnostics

---

## Verification Plan

### Automated Tests

No existing automated tests found for this functionality. Proposing manual testing due to the nature of the bug (UI + database integration).

### Manual Verification

**Test Steps:**

1. **Start the development server** (already running at `http://localhost:3000`)

2. **Create a task and verify persistence:**
   - Login as `TestUser` (already logged in)
   - Click sidebar → "DEPLOY SYSTEM"
   - Switch to "TASK / DIRECTIVE" tab
   - Fill in:
     - Mission Objective: "Test Task Persistence Fix"
     - Vector/Course: "BUG FIX 101"
     - Deadline: Any future date
     - Threat Level: Select any
     - Privacy: Leave as default
   - Click "INITIALIZE"
   - **Verify:** Task appears immediately in the UI

3. **Test persistence after reload:**
   - Press F5 to reload the page
   - Wait for page to fully load
   - **Expected:** "Test Task Persistence Fix" task is still visible
   - **Current Bug:** Task disappears after reload ❌

4. **Verify database entry:**
   - Open Supabase dashboard
   - Check `tasks` table
   - **Expected:** Row exists with `title = "Test Task Persistence Fix"`
   - **Current Bug:** No row exists ❌

5. **Test transmission for comparison (working feature):**
   - Click "DEPLOY SYSTEM" → "TRANSMISSION" tab
   - Fill in test data
   - Click "BROADCAST"
   - Reload page (F5)
   - **Verify:** Transmission persists ✅ (This currently works)

6. **Verify error handling:**
   - Open browser console (F12)
   - Create another task
   - Check console for any errors
   - **Expected:** No errors in console after fix

---

## Success Criteria

- ✅ Tasks created via Deploy System persist after page reload
- ✅ Tasks appear in database immediately after creation
- ✅ Proper error messages in console if database operations fail
- ✅ Optimistic UI updates correctly reconcile with database state
- ✅ No silent failures - all errors are logged and handled
