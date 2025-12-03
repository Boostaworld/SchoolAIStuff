export interface Task {
  id: string;
  user_id?: string; // Owner of the task
  title: string;
  category: 'Quick' | 'Grind' | 'Cooked';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  completed: boolean;
  is_public?: boolean; // Whether task is visible to all users
  isCopied?: boolean;
  isAnalyzing?: boolean; // For AI loading state
  profiles?: { // Author info (populated from join)
    username: string;
    avatar_url: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string; // URL
  joinedAt: string;
  isAdmin?: boolean;
  points?: number; // alias for orbit_points in legacy code paths
  can_customize_ai?: boolean;
  unlocked_models?: string[];
  intel_instructions?: string;
  max_wpm?: number; // Phase 3: Maximum WPM achieved
  orbit_points?: number; // Phase 3: Gamification points
  last_active?: string; // Phase 3: For presence tracking
  stats: {
    tasksCompleted: number;
    tasksForfeited: number;
    streakDays: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isSOS?: boolean;
}

export interface BellSchedule {
  period: string;
  timeRemaining: string;
  type: 'Class' | 'Break' | 'Lunch';
}

export enum TrailState {
  BLAZING = 'Blazing', // < 15m
  WARM = 'Warm',       // < 2h
  FADING = 'Fading'    // < 12h
}

export interface IntelSource {
  title: string;
  url: string;
  snippet: string;
}

export interface IntelDrop {
  id: string;
  author_id: string;
  author_username?: string;
  author_avatar?: string;
  query: string;
  summary_bullets: string[];
  sources: IntelSource[];
  related_concepts: string[];
  is_private: boolean;
  created_at: string;
}

// ============================================
// PHASE 3: SOCIAL & TRAINING TYPES
// ============================================

// Social/DM Types
export interface DMChannel {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  // Computed properties
  otherUser?: UserProfile;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  attachment_type?: string;
  read: boolean;
  created_at: string;
  // Computed properties
  senderUsername?: string;
  senderAvatar?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  // Computed
  username?: string;
}

// Training/Typing Types
export interface TypingChallenge {
  id: string;
  title: string;
  text_content: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  created_at: string;
  // Enhanced fields
  category?: string;
  length_type?: 'Sprint' | 'Medium' | 'Marathon';
  is_custom?: boolean;
  is_ai_generated?: boolean;
  user_id?: string;
  word_count?: number;
  char_count?: number;
}

export interface TypingSession {
  id: string;
  user_id: string;
  challenge_id: string | null;
  wpm: number;
  accuracy: number;
  error_count: number;
  completed_at: string;
}

export interface TypingStats {
  user_id: string;
  key_char: string;
  error_count: number;
  total_presses: number;
}

export interface KeyStat {
  errors: number;
  presses: number;
  accuracy: number; // Computed: (presses - errors) / presses * 100
}

export interface TypingHistory {
  id: string;
  user_id: string;
  challenge_id: string;
  session_id: string;
  wpm: number;
  accuracy: number;
  error_count: number;
  time_elapsed: number; // seconds
  words_data?: Array<{ word: string; correct: boolean; time_ms: number }>;
  challenge_text: string;
  challenge_title: string;
  completed_at: string;
}

// Racing Types
export interface TypingRace {
  id: string;
  challenge_id: string;
  host_user_id: string;
  bot_count: number;
  bot_wpm_ranges: number[];
  status: 'waiting' | 'in_progress' | 'completed';
  started_at?: string;
  created_at: string;
}

export interface RaceParticipant {
  id: string;
  race_id: string;
  user_id?: string;
  is_bot: boolean;
  bot_name?: string;
  bot_target_wpm?: number;
  position?: number;
  final_wpm?: number;
  final_accuracy?: number;
  completion_time?: number; // milliseconds
  // Computed
  username?: string;
  avatar?: string;
  currentProgress?: number; // 0-100%
  currentWPM?: number;
}

export interface ChallengeGenerationRequest {
  id: string;
  user_id: string;
  category: string;
  difficulty: string;
  length_type: string;
  custom_prompt?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  generated_challenge_id?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// ============================================
// DUAL-CORE TRAINING TYPES
// ============================================

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

export interface EnhancedTypingSession extends TypingSession {
  mode?: TrainingMode;
  latencyAvg?: number; // ms between keystrokes
  rhythmScore?: number; // 0-100
}

export interface RaceResults {
  wpm: number;
  accuracy: number;
  errorCount: number;
  placement: number; // 1st, 2nd, 3rd, 4th
  pointsEarned: number;
}
