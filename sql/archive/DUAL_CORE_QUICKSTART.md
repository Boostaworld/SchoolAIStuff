# DUAL-CORE TYPING ECOSYSTEM - QUICK START GUIDE

**Status:** Infrastructure Complete - Ready for UI Implementation
**Date:** 2025-11-25

---

## WHAT WAS BUILT

The foundational data infrastructure for a dual-mode typing training system:

1. **VELOCITY Mode** - High-speed racing with AI opponents
2. **ACADEMY Mode** - Personalized drills targeting weak keys

---

## FILES CREATED

### Database Layer
```
sql/
├── dual_core_training.sql    # Migration: 3 tables, 8 indexes, RLS policies
└── seed_race_bots.sql        # 10 AI bot personalities
```

### Type System
```
types/
└── training.ts               # 20+ interfaces, type guards, mappers
```

### State Management
```
store/
└── trainingSlice.ts          # Existing file (already implemented)
```

### Documentation
```
docs/
└── DUAL_CORE_INFRASTRUCTURE.md   # Complete technical reference
```

---

## DEPLOYMENT STEPS

### 1. Deploy Database Migration

```bash
# Option A: Supabase SQL Editor
# Copy contents of sql/dual_core_training.sql and run

# Option B: psql CLI
psql $DATABASE_URL -f sql/dual_core_training.sql
```

**Verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('race_bots', 'academy_drills', 'typing_stats_aggregate');
-- Should return 3 rows
```

### 2. Seed Race Bots

```bash
psql $DATABASE_URL -f sql/seed_race_bots.sql
```

**Verify:**
```sql
SELECT COUNT(*) FROM race_bots;
-- Should return: 10

SELECT name, target_wpm, personality FROM race_bots ORDER BY target_wpm DESC;
-- Should show: NitroNinja (110 WPM) to PerfectionistPaul (45 WPM)
```

### 3. No Code Changes Required

The TypeScript types are ready to import, and the Zustand store slice already exists from a previous implementation. The new types in `types/training.ts` are fully compatible.

---

## USAGE EXAMPLES

### Start a Race (VELOCITY Mode)

```typescript
import { useOrbitStore } from '@/store/useOrbitStore';

function RaceButton() {
  const { startRace, currentRace } = useOrbitStore();

  const handleStartRace = async () => {
    const challengeId = 'your-challenge-uuid';
    await startRace(challengeId, 3); // 3 bots auto-matched to user WPM

    // currentRace now contains:
    // - User participant
    // - 3 AI bots matched within ±10 WPM
    // - Status: 'countdown' -> 'racing'
  };

  return <button onClick={handleStartRace}>Start Race</button>;
}
```

### Generate a Drill (ACADEMY Mode)

```typescript
import { useOrbitStore } from '@/store/useOrbitStore';

function DrillGenerator() {
  const { generateDrill, weakKeys, currentDrill } = useOrbitStore();

  const handleGenerateDrill = async () => {
    const drill = await generateDrill();
    console.log('New drill targeting keys:', drill?.targetKeys);
    console.log('Drill text:', drill?.drillText);
  };

  return (
    <div>
      <p>Weak keys: {weakKeys.map(k => k.key).join(', ')}</p>
      <button onClick={handleGenerateDrill}>Generate Practice Drill</button>
    </div>
  );
}
```

### Track Analytics

```typescript
import { useOrbitStore } from '@/store/useOrbitStore';
import { useEffect } from 'react';

function AnalyticsDashboard() {
  const { fetchTypingStats, typingStats, weakKeys } = useOrbitStore();

  useEffect(() => {
    fetchTypingStats(); // Auto-identifies weak keys (< 70% accuracy)
  }, []);

  return (
    <div>
      <h2>Your Typing Stats</h2>
      {typingStats.map(stat => (
        <div key={stat.key}>
          {stat.key}: {stat.accuracy.toFixed(1)}% accuracy
          ({stat.presses} presses, {stat.errors} errors)
        </div>
      ))}

      <h3>Focus on These Keys:</h3>
      {weakKeys.map(k => (
        <span key={k.key} className="weak-key">{k.key} </span>
      ))}
    </div>
  );
}
```

---

## KEY FEATURES

### VELOCITY Mode (Racing)

**Bot Matchmaking:**
- Auto-matches 3 bots within ±10 WPM of user's skill level
- Ensures personality diversity (aggressive/steady/cautious)
- Deterministic bot progress with humanization (reaction delay, fatigue)

**Race Flow:**
1. `startRace()` - Initializes race with countdown
2. `updateRaceProgress()` - Real-time position updates
3. `finishRace()` - Submits results, awards points

**Points Formula:**
```
pointsEarned = (WPM * Accuracy) / 10
```

### ACADEMY Mode (Practice)

**Drill Generation:**
- Analyzes typing stats to find weak keys (< 70% accuracy)
- Generates targeted practice text (AI integration pending)
- Tracks rhythm and latency for consistency analysis

**Drill Flow:**
1. `generateDrill()` - Creates personalized practice
2. `startDrill()` - Begins typing session with latency tracking
3. `completeDrill()` - Submits results, awards points

**Points Formula:**
```
pointsEarned = (WPM * Accuracy) / 20  // Half of race rewards
```

### Shared Analytics

**Typing Stats:**
- Per-key accuracy tracking
- Weekly aggregation for trend analysis
- Automatic weak key identification

**Rhythm Analysis:**
- Latency tracking (ms between keystrokes)
- Consistency score (0-100)
- Formula: `100 - (coefficientOfVariation * 2)`

---

## DATABASE SCHEMA SUMMARY

### `race_bots` (10 seeded)
- **Purpose:** AI racing opponents
- **Personalities:** Aggressive (fast), Steady (consistent), Cautious (accurate)
- **WPM Range:** 45-110 WPM
- **Access:** Public read, admin write

### `academy_drills`
- **Purpose:** Personalized practice sessions
- **Fields:** target_keys, drill_text, difficulty, accuracy
- **Access:** User can only see their own drills

### `typing_stats_aggregate`
- **Purpose:** Weekly per-key performance rollup
- **Fields:** week_start, key_char, total_presses, total_errors, accuracy
- **Access:** User can only see their own stats

### Extended: `typing_sessions`
- **New Fields:**
  - `mode` - 'velocity' | 'academy'
  - `latency_avg` - Average ms between keystrokes
  - `rhythm_score` - 0-100 consistency rating

---

## TYPESCRIPT TYPE HIGHLIGHTS

### Import Types
```typescript
import {
  TrainingMode,           // 'velocity' | 'academy'
  RaceBot,                // AI opponent
  RaceParticipant,        // Live race entity
  Race,                   // Complete race state
  RaceResults,            // Finish line data
  AcademyDrill,           // Practice session
  KeyStat,                // Per-key analytics
  WeeklyKeyStat,          // Time-series data
  RhythmAnalysis,         // Consistency metrics
  mapRaceBotFromDB,       // DB mapper
  mapAcademyDrillFromDB   // DB mapper
} from '@/types/training';
```

### Type Guards
```typescript
import { isVelocitySession, isAcademySession } from '@/types/training';

if (isVelocitySession(session)) {
  console.log('This was a race!');
}
```

---

## INTEGRATION WITH EXISTING SYSTEMS

### Economy (Orbit Points)
- **Race:** Awards points based on WPM × Accuracy / 10
- **Drill:** Awards points based on WPM × Accuracy / 20
- Auto-updates user's `orbit_points` in profiles table

### User Profile
- Tracks `max_wpm` (updated on new records)
- Uses `max_wpm` for bot matchmaking

### Typing Stats (Existing)
- Feeds into weak key detection
- Academy drills target keys with < 70% accuracy
- Weekly aggregation for long-term trends

---

## NEXT STEPS FOR UI TEAM (vibe-builder)

### 1. VelocityTerminal Component
**Purpose:** Racing arena with real-time bot visualization

**Required Imports:**
```typescript
import { useOrbitStore } from '@/store/useOrbitStore';
import { Race, RaceParticipant } from '@/types/training';
```

**Key Features:**
- Countdown timer (3 seconds)
- Progress bars for user + 3 bots
- Live WPM display
- Position indicators
- Finish line celebration

**Design:**
- Neon cyan/violet gradients
- "NITRO" flash on correct streaks
- Red screen + "BONK" sound on errors

### 2. AcademyDashboard Component
**Purpose:** Analytics hub with drill generation

**Required Imports:**
```typescript
import { useOrbitStore } from '@/store/useOrbitStore';
import { AcademyDrill, KeyStat, WeeklyKeyStat } from '@/types/training';
```

**Key Features:**
- Weak key heatmap (red = high error rate)
- Accuracy trend graph (Recharts)
- "Next Drill" suggestion card
- Drill history timeline

**Design:**
- Calm slate/blue palette
- Chart-focused layout
- Minimalist Zen aesthetic

### 3. DualModeSelector Component
**Purpose:** Toggle between VELOCITY/ACADEMY

**Required Imports:**
```typescript
import { useOrbitStore } from '@/store/useOrbitStore';
import { TrainingMode } from '@/types/training';
```

**Key Features:**
- Visual mode distinction (neon vs calm)
- Mode-specific stats preview
- Smooth transition animations

---

## NEXT STEPS FOR GAME LOGIC TEAM (game-logic-orchestrator)

### 1. useTypingEngine Hook
**Purpose:** Dual-mode input handling

**Velocity Mode (Cursor Lock):**
- Disable backspace completely
- Stop on error (no cursor advance)
- Flash red + play "bonk" sound on mistakes

**Academy Mode (Standard):**
- Allow backspace corrections
- Track latency between keystrokes
- Calculate rhythm score

### 2. useBotRacing Hook
**Purpose:** Real-time bot progress simulation

**Formula:**
```typescript
const baseProgress = (bot.targetWpm / 60) * elapsed * 5; // chars
const personalityMod = getPersonalityModifier(bot, elapsed);
const progress = baseProgress * personalityMod;
```

**Personality Modifiers:**
- Aggressive: 1.15 early, 0.95 late
- Steady: 1.0 always
- Cautious: 0.85 early, 1.1 late

### 3. CoachService Integration
**Purpose:** AI-powered drill generation

**API:** Gemini 2.5 Flash
**Prompt Template:**
```
Generate a 50-word typing drill focusing on keys: {targetKeys}.
Use common words containing these letters frequently.
Natural sentence structure (not random words).
```

**Example Output:**
```
"The equipment quality depends on proper preparation.
Unique techniques require practice and patience."
```

---

## TESTING CHECKLIST

### Database
- [ ] Migration runs without errors
- [ ] 10 bots seeded successfully
- [ ] RLS policies prevent unauthorized access
- [ ] Computed accuracy column updates correctly

### Store Integration
- [ ] `loadRaceBots()` returns 10 bots
- [ ] `startRace()` matches bots within ±10 WPM
- [ ] `generateDrill()` creates drill in database
- [ ] Points awarded correctly on race/drill completion

### Type Safety
- [ ] No TypeScript compilation errors
- [ ] Mappers convert DB types to app types
- [ ] Type guards work at runtime

---

## SUPPORT

### Common Issues

**"race_bots table does not exist"**
Run `sql/dual_core_training.sql` migration first

**"No bots found for matchmaking"**
Run `sql/seed_race_bots.sql` to populate data

**"Type error on RaceBot"**
Import from `@/types/training`, not `@/types`

### Documentation
- Full reference: `docs/DUAL_CORE_INFRASTRUCTURE.md`
- Implementation spec: `DUAL_CORE_IMPLEMENTATION.md`

---

## SUMMARY

**Infrastructure Status:** ✅ COMPLETE

- Database: 3 tables, 8 indexes, 12 RLS policies
- Types: 20+ interfaces, full type safety
- State: Complete Zustand slice with 15+ actions
- Seed Data: 10 diverse bot personalities

**Next Phase:** UI implementation by vibe-builder and game-logic-orchestrator

**Estimated UI Work:** 3-5 days for complete dual-mode experience

---

**The skeleton is solid. Build with confidence.**
