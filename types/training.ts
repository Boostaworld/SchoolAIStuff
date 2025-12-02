/**
 * DUAL-CORE TYPING ECOSYSTEM - TYPE DEFINITIONS
 *
 * Type-safe interfaces for VELOCITY and ACADEMY training modes
 * Date: 2025-11-25
 * Author: skeleton-builder agent
 */

// ============================================
// CORE TRAINING TYPES
// ============================================

/**
 * Training mode discriminator
 * - velocity: High-speed racing with cursor lock (no backspace)
 * - academy: Technical practice with rhythm/latency analysis
 */
export type TrainingMode = 'velocity' | 'academy';

/**
 * Bot personality types affecting race behavior
 * - aggressive: Fast start, higher variance, may tire late-game
 * - steady: Consistent pace throughout, predictable
 * - cautious: Slow start but improves over time, high accuracy
 */
export type BotPersonality = 'aggressive' | 'steady' | 'cautious';

// ============================================
// RACE BOT INTERFACES
// ============================================

/**
 * AI-controlled racing opponent
 * Used in VELOCITY mode for competitive typing races
 */
export interface RaceBot {
  id: string;
  name: string;
  targetWpm: number;           // Base typing speed (40-120 WPM)
  errorRate: number;           // Error probability (0.0 - 1.0, typically 0.01 - 0.05)
  personality: BotPersonality;
  avatarUrl?: string;          // Optional bot avatar image
  tagline?: string;            // Flavor text (e.g., "Speed is my religion")
  active: boolean;             // Whether bot is available for matchmaking
  createdAt: string;
}

/**
 * Database representation of race bot
 * (snake_case for direct DB mapping)
 */
export interface RaceBotDB {
  id: string;
  name: string;
  target_wpm: number;
  error_rate: number;
  personality: BotPersonality;
  avatar_url?: string;
  tagline?: string;
  active: boolean;
  created_at: string;
}

/**
 * Live race participant (user or bot)
 * Used for real-time race state tracking
 */
export interface RaceParticipant {
  id: string;
  name: string;
  isBot: boolean;
  targetWpm?: number;          // For bots only
  currentProgress: number;     // 0-100% of text completed
  currentWpm: number;          // Real-time WPM calculation
  accuracy: number;            // Current accuracy percentage
  position: number;            // Placement in race (1 = first)
  avatarUrl?: string;
}

// ============================================
// ACADEMY DRILL INTERFACES
// ============================================

/**
 * AI-generated personalized typing drill
 * Targets specific weak keys identified by analytics
 */
export interface AcademyDrill {
  id: string;
  userId: string;
  targetKeys: string[];        // Keys to focus on: ['P', 'Q', 'X']
  drillText: string;           // AI-generated practice text
  difficulty: number;          // 1-5 complexity scale
  generatedAt: string;
  completed: boolean;
  completedAt?: string;
  finalAccuracy?: number;      // Score when completed
  finalWpm?: number;
  sessionId?: string;          // Link to typing_sessions record
}

/**
 * Database representation of academy drill
 * (snake_case for direct DB mapping)
 */
export interface AcademyDrillDB {
  id: string;
  user_id: string;
  target_keys: string;         // Comma-separated: 'P,Q,X'
  drill_text: string;
  difficulty: number;
  generated_at: string;
  completed: boolean;
  completed_at?: string;
  final_accuracy?: number;
  final_wpm?: number;
  session_id?: string;
}

/**
 * Request to generate a new drill
 * Used by AI service to create targeted content
 */
export interface DrillGenerationRequest {
  userId: string;
  weakKeys: KeyStat[];         // Ordered by accuracy (worst first)
  preferredDifficulty?: number; // 1-5, optional override
  customPrompt?: string;       // Optional user guidance
}

// ============================================
// TYPING SESSION INTERFACES (EXTENDED)
// ============================================

/**
 * Extended typing session with dual-mode support
 * Replaces/extends the base TypingSession type from types.ts
 */
export interface TypingSessionExtended {
  id: string;
  userId: string;
  challengeId: string | null;
  mode: TrainingMode;
  wpm: number;
  accuracy: number;
  errorCount: number;
  latencyAvg: number;          // Average ms between keystrokes (Academy mode)
  rhythmScore: number;         // 0-100 consistency rating (Academy mode)
  completedAt: string;
  // Optional metadata
  raceId?: string;             // If part of a race (Velocity mode)
  drillId?: string;            // If completing a drill (Academy mode)
}

/**
 * Database representation of extended typing session
 * Maps to typing_sessions table after migration
 */
export interface TypingSessionDB {
  id: string;
  user_id: string;
  challenge_id: string | null;
  mode: TrainingMode;
  wpm: number;
  accuracy: number;
  error_count: number;
  latency_avg: number;
  rhythm_score: number;
  completed_at: string;
}

// ============================================
// ANALYTICS & STATS INTERFACES
// ============================================

/**
 * Per-key performance statistics
 * Used to identify weak points and track improvement
 */
export interface KeyStat {
  key: string;                 // Single character: 'A', 'p', '1'
  presses: number;             // Total times key was pressed
  errors: number;              // Times key was pressed incorrectly
  accuracy: number;            // Calculated: (presses - errors) / presses * 100
}

/**
 * Weekly aggregated key statistics
 * Stored in typing_stats_aggregate table
 */
export interface WeeklyKeyStat {
  id: string;
  userId: string;
  weekStart: string;           // ISO date of Monday
  keyChar: string;
  totalPresses: number;
  totalErrors: number;
  accuracy: number;            // Auto-calculated by DB
  updatedAt: string;
}

/**
 * Database representation of weekly stats
 */
export interface WeeklyKeyStatDB {
  id: string;
  user_id: string;
  week_start: string;
  key_char: string;
  total_presses: number;
  total_errors: number;
  accuracy: number;
  updated_at: string;
}

/**
 * Latency measurement (time between keystrokes)
 * Used for rhythm analysis in Academy mode
 */
export interface LatencyPoint {
  timestamp: number;           // Unix timestamp (ms)
  latency: number;             // Ms since last keystroke
  key: string;                 // Character that was pressed
}

/**
 * Rhythm analysis result
 * Measures typing consistency/flow
 */
export interface RhythmAnalysis {
  score: number;               // 0-100 consistency rating
  averageLatency: number;      // Mean time between keystrokes
  variance: number;            // Statistical variance (lower = more consistent)
  fastestStreak: number;       // Longest streak of sub-average latencies
  slowPoints: LatencyPoint[];  // Outlier slow keystrokes
}

// ============================================
// RACE STATE INTERFACES
// ============================================

/**
 * Active typing race state
 * Manages live race with multiple participants
 */
export interface Race {
  id: string;
  challengeId: string;
  challengeText: string;
  mode: TrainingMode;          // Should always be 'velocity'
  participants: RaceParticipant[];
  status: 'waiting' | 'countdown' | 'racing' | 'finished';
  startTime?: number;          // Unix timestamp when race started
  userPosition: number;        // Current user's placement (1-indexed)
  isUserFinished: boolean;
}

/**
 * Race results after completion
 * Used for submitting to backend and showing victory screen
 */
export interface RaceResults {
  raceId: string;
  challengeId: string;
  userWpm: number;
  userAccuracy: number;
  userPosition: number;        // Final placement
  totalParticipants: number;
  completionTime: number;      // Milliseconds to complete
  pointsEarned: number;        // Orbit Points reward
  botResults: Array<{
    botId: string;
    name: string;
    finalWpm: number;
    accuracy: number;
    position: number;
  }>;
}

// ============================================
// STORE STATE TYPE (for trainingSlice.ts)
// ============================================

/**
 * Training state slice for Zustand store
 * Manages all VELOCITY and ACADEMY state
 */
export interface TrainingState {
  // Mode Management
  currentMode: TrainingMode;
  setMode: (mode: TrainingMode) => void;

  // VELOCITY State
  currentRace: Race | null;
  raceBots: RaceBot[];
  raceInProgress: boolean;
  startRace: (challengeId: string, botCount?: number) => Promise<void>;
  updateRaceProgress: (userProgress: number, userWpm: number) => void;
  finishRace: (results: RaceResults) => Promise<void>;
  loadRaceBots: () => Promise<void>;

  // ACADEMY State
  currentDrill: AcademyDrill | null;
  drillHistory: AcademyDrill[];
  weakKeys: KeyStat[];
  generateDrill: () => Promise<AcademyDrill>;
  startDrill: (drillId: string) => void;
  completeDrill: (accuracy: number, wpm: number, rhythmData: RhythmAnalysis) => Promise<void>;
  loadDrillHistory: () => Promise<void>;

  // Shared Analytics
  typingStats: KeyStat[];
  weeklyStats: WeeklyKeyStat[];
  latencyHistory: LatencyPoint[];
  rhythmScore: number;
  fetchTypingStats: () => Promise<void>;
  fetchWeeklyStats: (weekStart?: string) => Promise<void>;
  updateWeeklyStats: () => Promise<void>;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Response from matchmaking API
 * Returns bots matched to user's skill level
 */
export interface MatchmakingResponse {
  bots: RaceBot[];
  averageWpm: number;
  challenge: {
    id: string;
    text: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  };
}

/**
 * Response from drill generation API
 * Returns AI-generated practice text
 */
export interface DrillGenerationResponse {
  drill: AcademyDrill;
  estimatedDuration: number;   // Estimated seconds to complete
  keyFrequencies: Record<string, number>; // How often each target key appears
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Type guard: Check if typing session is velocity mode
 */
export function isVelocitySession(session: TypingSessionExtended): boolean {
  return session.mode === 'velocity';
}

/**
 * Type guard: Check if typing session is academy mode
 */
export function isAcademySession(session: TypingSessionExtended): boolean {
  return session.mode === 'academy';
}

/**
 * Transform DB race bot to application format
 */
export function mapRaceBotFromDB(db: RaceBotDB): RaceBot {
  return {
    id: db.id,
    name: db.name,
    targetWpm: db.target_wpm,
    errorRate: db.error_rate,
    personality: db.personality,
    avatarUrl: db.avatar_url,
    tagline: db.tagline,
    active: db.active,
    createdAt: db.created_at
  };
}

/**
 * Transform DB academy drill to application format
 */
export function mapAcademyDrillFromDB(db: AcademyDrillDB): AcademyDrill {
  return {
    id: db.id,
    userId: db.user_id,
    targetKeys: db.target_keys.split(',').map(k => k.trim()),
    drillText: db.drill_text,
    difficulty: db.difficulty,
    generatedAt: db.generated_at,
    completed: db.completed,
    completedAt: db.completed_at,
    finalAccuracy: db.final_accuracy,
    finalWpm: db.final_wpm,
    sessionId: db.session_id
  };
}

/**
 * Transform DB weekly stat to application format
 */
export function mapWeeklyStatFromDB(db: WeeklyKeyStatDB): WeeklyKeyStat {
  return {
    id: db.id,
    userId: db.user_id,
    weekStart: db.week_start,
    keyChar: db.key_char,
    totalPresses: db.total_presses,
    totalErrors: db.total_errors,
    accuracy: db.accuracy,
    updatedAt: db.updated_at
  };
}
