# Implementation Plan - Critical Fixes

## Goal Description
Address the critical issues identified in `SESSION_LOG_2025-11-25.md` and `MASTER_ROADMAP.md`, specifically focusing on the "Intel Messages Disappearing" bug, missing database schema, and incomplete Race Arena stats.

## User Review Required
> [!IMPORTANT]
> The "Intel Messages Disappearing" issue is likely due to the missing backend integration noted in `ROADMAP_UPDATE_11_25.md`. The plan involves implementing the missing `IntelService.ts` and connecting it.

## Proposed Changes

### Intel System (Fix Issue #11)
#### [NEW] [IntelService.ts](file:///c:/Users/kayla/Downloads/copy-of-orbit/lib/ai/IntelService.ts) ✅
- Implemented Gemini calls with persistence to `intel_sessions`.
- Wired message history loading/saving via store.

#### [MODIFY] [IntelCommandDeck.tsx](file:///c:/Users/kayla/Downloads/copy-of-orbit/components/Intel/IntelCommandDeck.tsx) ✅
- Send uses store/IntelService; history hydrates on load.

#### [MODIFY] [useOrbitStore.ts](file:///c:/Users/kayla/Downloads/copy-of-orbit/store/useOrbitStore.ts) ✅
- Added intel slice + oracle persistence; profile auto-create if missing.

### Database Schema (Issue #12)
#### [NEW] [MASTER_SCHEMA.sql](file:///c:/Users/kayla/Downloads/copy-of-orbit/sql/MASTER_SCHEMA.sql)
- Consolidate all table definitions found in `sql/` and codebase references.

### Race Arena (Fix #10)
#### [MODIFY] [Dashboard.tsx](file:///c:/Users/kayla/Downloads/copy-of-orbit/components/Dashboard/Dashboard.tsx) ✅
- Race Stats panel added (Avg WPM/Accuracy, Top WPM, Race Count) using `typing_sessions`.
- Race completions now persist sessions; betting reads/writes `orbit_points`.
- Stats query now orders by `completed_at` (added `created_at` in SQL patch for compatibility).

### UX TODOs
- Add clear/new chat controls for Intel/Oracle sessions (persistence is in place).

### Economy: Passive Miner
#### [MODIFY] Passive Miner + Store ✅
- Miner now calls `claim_passive_points` via store; store updates `orbit_points`/`points` and top-bar balance.
- Requires `sql/economy_race_patch.sql` (adds RPC + racing tables/RLS).

## Verification Plan
### Automated Tests
- None currently available.

### Manual Verification
1. **Intel Messages**: Open Intel Command Deck, send a message. Verify it appears in the chat history and persists after reload (if DB connected).
2. **Schema**: Run `sql/economy_race_patch.sql` (adds miner RPC + racing tables/RLS). Run `sql/intel_persistence_patch.sql` if not already.
3. **Race Stats**: Finish a race, return to Race lobby; verify stat cards populate from `typing_sessions`.
4. **Passive Miner**: Claim once; header Orbit points should increase.
5. **Racing column fix**: Ensure `sql/economy_race_patch.sql` applied so `typing_sessions` has `created_at`; stats query now uses `completed_at`.
