# 🎯 DUAL-CORE TYPING ECOSYSTEM - IMPLEMENTATION PLAN

**Status:** Implementation Phase
**Date:** 2025-11-25
**Architecture:** Two-Mode Training Platform (VELOCITY + ACADEMY)

---

## 🏗️ ARCHITECTURE OVERVIEW

### Mode 1: VELOCITY (The Arena)
**Focus:** Speed, Competition, Flow State
**Input Logic:** Cursor Lock (no backspace, stop on error)
**Content:** Plain English only (no code blocks)
**Matchmaking:** Auto-match to bots within ±10 WPM

### Mode 2: THE ACADEMY (The Coach)
**Focus:** Technique, Analysis, Personalized Correction
**Input Logic:** Standard (backspace allowed)
**Content:** AI-generated surgical drills targeting weak keys
**Feedback:** Real-time latency tracking, rhythm analysis

---

## 📋 AGENT TASK BREAKDOWN

### AGENT 1: `skeleton-builder` - Infrastructure Layer

**Database Schema:**
```sql
-- Add mode field to typing_challenges
ALTER TABLE typing_challenges ADD COLUMN mode VARCHAR(20) DEFAULT 'velocity';
ALTER TABLE typing_challenges ADD CONSTRAINT check_mode CHECK (mode IN ('velocity', 'academy'));

-- Extend typing_history with performance metrics
ALTER TABLE typing_history ADD COLUMN latency_avg INTEGER; -- ms between keystrokes
ALTER TABLE typing_history ADD COLUMN rhythm_score INTEGER; -- 0-100, consistency rating
ALTER TABLE typing_history ADD COLUMN mode VARCHAR(20) DEFAULT 'velocity';

-- New table: race_bots
CREATE TABLE race_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  target_wpm INTEGER NOT NULL,
  error_rate DECIMAL(3,2) DEFAULT 0.02, -- 2% error rate
  personality VARCHAR(50), -- 'aggressive', 'steady', 'cautious'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New table: academy_drills (AI-generated personalized content)
CREATE TABLE academy_drills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_keys VARCHAR(50), -- 'P,Q,X' - weak keys
  drill_text TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1, -- 1-5
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  final_accuracy DECIMAL(5,2)
);

-- New table: typing_stats_aggregate (weekly rollup)
CREATE TABLE typing_stats_aggregate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  key_char CHAR(1) NOT NULL,
  total_presses INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_presses > 0
    THEN ((total_presses - total_errors)::DECIMAL / total_presses) * 100
    ELSE 0 END
  ) STORED,
  UNIQUE(user_id, week_start, key_char)
);
```

**TypeScript Types:**
```typescript
// types/training.ts
export type TrainingMode = 'velocity' | 'academy';

export interface RaceBot {
  id: string;
  name: string;
  targetWpm: number;
  errorRate: number;
  personality: 'aggressive' | 'steady' | 'cautious';
  avatarUrl?: string;
}

export interface AcademyDrill {
  id: string;
  userId: string;
  targetKeys: string[];
  drillText: string;
  difficulty: number;
  generatedAt: string;
  completed: boolean;
  finalAccuracy?: number;
}

export interface TypingSession {
  id: string;
  userId: string;
  mode: TrainingMode;
  wpm: number;
  accuracy: number;
  latencyAvg: number; // ms between keystrokes
  rhythmScore: number; // 0-100
  challengeId?: string;
  createdAt: string;
}

export interface KeyStat {
  key: string;
  presses: number;
  errors: number;
  accuracy: number;
}
```

**Zustand Store Slice:**
```typescript
// store/trainingSlice.ts
interface TrainingState {
  // Mode Management
  currentMode: TrainingMode;
  setMode: (mode: TrainingMode) => void;

  // VELOCITY State
  currentRace: Race | null;
  raceBots: RaceBot[];
  raceInProgress: boolean;
  startRace: (challengeId: string) => Promise<void>;
  finishRace: (results: RaceResults) => Promise<void>;

  // ACADEMY State
  currentDrill: AcademyDrill | null;
  drillHistory: AcademyDrill[];
  weakKeys: KeyStat[];
  generateDrill: () => Promise<AcademyDrill>;
  completeDrill: (accuracy: number) => Promise<void>;

  // Shared Analytics
  typingStats: KeyStat[];
  latencyHistory: number[];
  rhythmScore: number;
  fetchTypingStats: () => Promise<void>;
}
```

---

### AGENT 2: `vibe-builder` - Visual Layer

**Component Specifications:**

#### 1. `VelocityTerminal` - Racing Arena
**Style Guide:**
- Neon cyan/violet gradients
- Racing lane visualization
- Real-time position markers for user + 3 bots
- "NITRO" flash effects on correct streaks
- Red screen flash + "BONK" sound on error

**Key Features:**
- Live WPM counter (large, neon)
- Progress bars for each racer
- Finish line celebration animation
- "Key-to-Coin" reward sequence

#### 2. `AcademyDashboard` - Training Hub
**Style Guide:**
- Calm, professional color palette (slate/blue)
- Chart-focused layout (Recharts)
- Zen minimalism (no distracting animations)

**Key Features:**
- Accuracy improvement graph (weekly trend)
- Heatmap of weak keys (red = high error rate)
- "Next Drill" suggestion card
- Progress tracking (drills completed, avg improvement)

#### 3. `RewardAnimation` - Key-to-Coin Sequence
**Animation Specs (Framer Motion):**
```jsx
// Sequence:
// 1. Key icon spawns at bottom-center
// 2. Glows with cyan light
// 3. Arcs upward (bezier curve)
// 4. Lands in "Balance" counter (top-right)
// 5. Particle burst on impact
// 6. Balance counter increments with spring animation

const keyToCoinVariants = {
  initial: {
    y: 0,
    x: 0,
    opacity: 0,
    scale: 0.5
  },
  lift: {
    y: -50,
    opacity: 1,
    scale: 1.2,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  arc: {
    y: [-50, -200, -100],
    x: [0, 200, 400],
    transition: { duration: 1.2, ease: 'easeInOut' }
  },
  land: {
    scale: 0.3,
    opacity: 0,
    transition: { duration: 0.2 }
  }
};
```

#### 4. `DualModeSelector` - Mode Switcher
**Design:**
- Toggle between VELOCITY / ACADEMY
- Visual distinction: Neon vs. Calm
- Shows current mode stats (velocity: win rate, academy: drill streak)

---

### AGENT 3: `game-logic-orchestrator` - Game Systems

**Core Hooks:**

#### 1. `useTypingEngine` - Dual-Mode Input Handler
```typescript
export const useTypingEngine = (mode: TrainingMode) => {
  if (mode === 'velocity') {
    return useCursorLockEngine();
  } else {
    return useStandardEngine();
  }
};

// Velocity Engine - No Backspace, Stop on Error
const useCursorLockEngine = () => {
  const handleKeyPress = (key: string) => {
    if (key === expectedChar) {
      advanceCursor();
      playSuccessSound();
    } else {
      flashRed();
      playBonkSound();
      // DO NOT advance cursor
    }
  };

  // Disable backspace
  useEffect(() => {
    const preventBackspace = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') e.preventDefault();
    };
    window.addEventListener('keydown', preventBackspace);
    return () => window.removeEventListener('keydown', preventBackspace);
  }, []);

  return { handleKeyPress, currentPosition, isComplete };
};

// Academy Engine - Standard Input with Analytics
const useStandardEngine = () => {
  const [latencies, setLatencies] = useState<number[]>([]);
  const [lastKeyTime, setLastKeyTime] = useState<number>(Date.now());

  const handleKeyPress = (key: string) => {
    const now = Date.now();
    const latency = now - lastKeyTime;
    setLatencies(prev => [...prev, latency]);
    setLastKeyTime(now);

    if (key === expectedChar) {
      advanceCursor();
    } else {
      // Allow backspace to correct
    }
  };

  return {
    handleKeyPress,
    currentPosition,
    isComplete,
    averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    rhythmScore: calculateRhythmScore(latencies)
  };
};
```

#### 2. `useBotRacing` - Time-Based Interpolation
```typescript
export const useBotRacing = (bots: RaceBot[], raceStartTime: number) => {
  const [botPositions, setBotPositions] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - raceStartTime) / 1000; // seconds

      const newPositions = bots.reduce((acc, bot) => {
        // Deterministic formula
        const baseProgress = (bot.targetWpm / 60) * elapsed; // chars per second

        // Add humanization
        const reactionDelay = elapsed < 0.1 ? 0 : 1; // 100ms delay
        const fatigue = elapsed > 30 ? 0.7 : 1; // slow down at 70% after 30s

        const progress = baseProgress * reactionDelay * fatigue;
        const percentage = Math.min((progress / totalChars) * 100, 100);

        acc[bot.id] = percentage;
        return acc;
      }, {} as Record<string, number>);

      setBotPositions(newPositions);
    }, 50); // 20fps update

    return () => clearInterval(interval);
  }, [bots, raceStartTime]);

  return botPositions;
};
```

#### 3. `CoachService` - AI Drill Generator
```typescript
// lib/ai/CoachService.ts
export class CoachService {
  static async generateDrill(weakKeys: KeyStat[]): Promise<string> {
    // Find keys with < 70% accuracy
    const problemKeys = weakKeys
      .filter(k => k.accuracy < 70)
      .map(k => k.key)
      .slice(0, 3); // Focus on top 3 worst

    if (problemKeys.length === 0) {
      return generateSpeedDrill(); // User is proficient, focus on speed
    }

    const prompt = `
Generate a 50-word typing drill (plain English, no code) that focuses on improving accuracy for the keys: ${problemKeys.join(', ')}.

Rules:
- Use common words containing these letters frequently
- Natural sentence structure (not just random words)
- Intermediate difficulty vocabulary
- Example for 'P', 'Q': "The equipment quality depends on proper preparation. Unique techniques require practice."

Return only the drill text, no extra explanation.
    `.trim();

    const ai = new GoogleGenAI({ apiKey: getGeminiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are a typing coach. Generate focused drills.',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 200 }
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || 'The quick brown fox jumps over the lazy dog.';
  }

  static async analyzePerformance(session: TypingSession): Promise<string> {
    if (session.accuracy > 95) {
      return 'SPEED_DRILL'; // Suggest sprint mode
    }
    if (session.accuracy < 80) {
      return 'PRECISION_DRILL'; // Suggest slow, complex words
    }
    if (session.rhythmScore < 60) {
      return 'METRONOME_MODE'; // Suggest typing to a beat
    }
    return 'BALANCED_DRILL';
  }
}
```

---

## 🎮 INTEGRATION CHECKLIST

### Phase 1: Infrastructure (Week 1)
- [ ] Deploy database migrations (skeleton-builder)
- [ ] Create TypeScript types
- [ ] Build Zustand training slice
- [ ] Seed race_bots table with 10 personalities

### Phase 2: Velocity Mode (Week 2)
- [ ] Build VelocityTerminal UI (vibe-builder)
- [ ] Implement useCursorLockEngine (game-logic-orchestrator)
- [ ] Implement useBotRacing with interpolation
- [ ] Add "Key-to-Coin" animation
- [ ] Wire to Economy (award Orbit Points)

### Phase 3: Academy Mode (Week 3)
- [ ] Build AcademyDashboard UI (vibe-builder)
- [ ] Implement CoachService (game-logic-orchestrator)
- [ ] Create weak key heatmap visualization
- [ ] Implement drill generation system
- [ ] Add rhythm/latency tracking

### Phase 4: Polish & Testing (Week 4)
- [ ] Add sound effects (bonk, success, coin)
- [ ] Implement DualModeSelector
- [ ] Add tutorial/onboarding for each mode
- [ ] Performance testing (bot interpolation accuracy)
- [ ] User testing & feedback loop

---

## 🚀 SUCCESS METRICS

**VELOCITY Mode:**
- Bot positions stay synchronized (no drift > 5%)
- Cursor lock feels "snappy" (no perceived delay)
- Matchmaking stays within ±10 WPM variance
- Win rate: 40-60% (balanced difficulty)

**ACADEMY Mode:**
- Drill relevance: 80%+ of users report drills target actual weak keys
- Accuracy improvement: +5% average over 10 drills
- Rhythm score correlation with performance: r > 0.7
- Engagement: 3+ drills per session average

**Economy Integration:**
- VELOCITY: 50-100 points per race (scaled by placement)
- ACADEMY: 25-50 points per drill (scaled by accuracy improvement)
- Passive Mining: Still active during typing sessions (bonus)

---

**Next Steps:** Launch the three agents in parallel to begin implementation.
