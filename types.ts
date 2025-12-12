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
  due_date?: string; // ISO 8601 datetime
  resource_links?: Array<{ title: string; url: string }>; // Google Classroom, rubrics, etc.
  answer?: string; // markdown content
  original_task_id?: string; // UUID of source task if claimed
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
  is_admin?: boolean; // snake_case alias for compatibility
  points?: number; // alias for orbit_points in legacy code paths
  can_customize_ai?: boolean;
  unlocked_models?: string[];
  intel_instructions?: string;

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

// Phase 6: Interactive Schedule System
export interface Period {
  id?: string;
  period_number: number;
  period_label: string;
  period_type: 'Class' | 'Break' | 'Lunch';
  start_time: string; // HH:MM format (e.g., "08:00")
  end_time: string;   // HH:MM format (e.g., "08:50")
  is_enabled: boolean;
  created_at?: string;
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
  author_is_admin?: boolean;
  author_ai_plus?: boolean;
  query: string;
  summary_bullets: string[];
  sources: IntelSource[];
  related_concepts: string[];
  is_private: boolean;
  created_at: string;
  attachment_url?: string;
  attachment_type?: string;
  essay?: string;
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
  read_receipts_enabled?: boolean;
  // Computed properties
  otherUser?: UserProfile;
  lastMessage?: Message;
  lastMessageAt?: string;
  lastMessagePreview?: string;
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
  edited_at?: string;  // Added for edit tracking
  deleted_at?: string; // Added for soft delete
  reply_to_id?: string; // For threading/replying
  // Computed properties
  senderUsername?: string;
  senderAvatar?: string;
  senderIsAdmin?: boolean;
  senderCanCustomizeAI?: boolean;
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

export interface Announcement {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  version: string | null;
  category: 'update' | 'feature' | 'fix' | 'system' | 'event';
  active: boolean;
  hero_image_url: string | null;
  is_pinned: boolean;
  banner_enabled: boolean;
  theme_id: string;
  custom_theme: any | null; // AnnouncementTheme JSON
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  summary?: string;
  content: string;
  version?: string;
  category: Announcement['category'];
  hero_image_url?: string;
  is_pinned?: boolean;
  banner_enabled?: boolean;
  theme_id?: string;
  custom_theme?: any; // AnnouncementTheme JSON
}

// ============================================
// BUG REPORT & SUGGESTION SYSTEM
// ============================================

export type ReportType = 'bug' | 'suggestion';
export type ReportStatus = 'new' | 'in_progress' | 'need_info' | 'resolved' | 'closed';

export interface ReportContext {
  route: string;
  full_url: string;
  user_id: string;
  username: string;
  timestamp: string;
  timezone: string;
  app_version: string;
  browser: string;
  os: string;
  viewport: string;
  referrer: string | null;
  action_trail: Array<{
    action: 'navigate' | 'click' | 'input' | 'error';
    target?: string;
    to?: string;
    ts: string;
  }>;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  report_type: ReportType;
  user_text: string;
  attachment_url?: string;
  attachment_type?: string;
  context: ReportContext;
  status: ReportStatus;
  internal_notes?: string;
  assigned_admin_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  // Computed/joined fields
  reporter_username?: string;
  reporter_avatar?: string;
  thread_count?: number;
}

export interface ReportThread {
  id: string;
  report_id: string;
  sender_id: string;
  is_admin_reply: boolean;
  content: string;
  created_at: string;
  // Computed/joined fields
  sender_username?: string;
  sender_avatar?: string;
  sender_is_admin?: boolean;
}
