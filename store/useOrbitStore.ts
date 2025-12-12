
import { create } from 'zustand';
import { Task, ChatMessage, UserProfile, IntelDrop, DMChannel, Message, MessageReaction, Period } from '../types';
import { PokerGame, PokerGamePlayer, PokerAction, PokerLobbyGame, AIDifficulty, PokerActionType, PokerAnimation } from '../lib/poker/types';
import { createDeck, dealCards, evaluateHand, compareHands } from '../lib/poker/PokerEngine';
import { generateOracleRoast, assessTaskDifficulty } from '../lib/ai/gemini';
import { IntelResult } from '../lib/ai/intel';
import { fetchIntelHistory, IntelChatMessage, sendIntelQueryWithPersistence } from '../lib/ai/IntelService';
import { supabase } from '../lib/supabase';

const missingTable = (error: any, table: string) =>
  error?.code === 'PGRST205' && error?.message?.includes(`table '${table}'`);

interface OrbitState {
  // Auth State
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  currentUser: UserProfile | null;

  applyEquippedCursor?: (items?: any[]) => void;

  // App State
  tasks: Task[];
  isOracleThinking: boolean;

  // Intel State
  intelDrops: IntelDrop[];
  isIntelLoading: boolean;
  currentIntelResult: IntelResult | null;
  intelMessages: IntelChatMessage[];
  oracleHistory: ChatMessage[];

  // Phase 3: Social State
  onlineUsers: string[];
  dmChannels: DMChannel[];
  activeChannelId: string | null;
  messages: Record<string, Message[]>;
  reactions: Record<string, MessageReaction[]>;
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, string[]>;
  typingChannels: Record<string, any>;
  commsPanelOpen: boolean;
  heartbeatInterval: NodeJS.Timeout | null;

  // Message notification state
  messageToast: {
    isVisible: boolean;
    senderUsername: string;
    senderAvatar?: string;
    messagePreview: string;
    onDismiss: () => void;
    onClick: () => void;
  } | null;
  persistentBanners: Array<{
    id: string;
    senderUsername: string;
    senderAvatar?: string;
    messagePreview: string;
    timestamp: string;
    channelId: string;
  }>;

  // DM Replying State
  replyingTo: Message | null;



  // Phase 6: Schedule State
  schedule: Period[];
  currentPeriod: Period | null;
  nextPeriod: Period | null;

  // Phase 7: Games State (Poker)
  pokerLobbyGames: PokerLobbyGame[];
  activePokerGame: {
    game: PokerGame;
    players: PokerGamePlayer[];
    actions: PokerAction[];
  } | null;
  isPokerLoading: boolean;

  // Poker Animation State
  pokerAnimationQueue: PokerAnimation[];
  isAnimationLocked: boolean;
  currentAnimatingAction: string | null;
  currentPokerAnimation: PokerAnimation | null;
  lastPokerAIReasoning: {
    playerId: string;
    name: string;
    action: PokerActionType;
    amount: number;
    reasoning: string;
    round: string;
  } | null;

  // Initialization
  initialize: () => Promise<void>;
  loadOracleHistory: () => Promise<void>;

  // Auth Actions
  login: (email: string, pass: string) => Promise<{ success: boolean, error?: string }>;
  register: (email: string, pass: string, username: string) => Promise<{ success: boolean, error?: string }>;
  logout: () => Promise<void>;

  // Data Actions
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  forfeitTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>; // Admin-only deletion
  claimTask: (taskId: string) => Promise<void>; // Claim a public task as your own
  submitAnswer: (taskId: string, answer: string) => Promise<void>;
  askOracle: (query: string) => Promise<void>;
  triggerSOS: () => void;

  // Intel Actions
  executeIntelQuery: (query: string, deepDive?: boolean) => Promise<void>;
  sendIntelQuery: (prompt: string, options?: {
    depthLevel?: number;
    modelUsed?: 'flash' | 'pro' | 'orbit-x' | 'gemini-3-pro' | 'gemini-3-image';
    researchMode?: boolean;
    customInstructions?: string;
    conversationMode?: boolean;
    thinkingEnabled?: boolean;
    mode?: 'chat' | 'image' | 'generation';
    thinkingLevel?: 'low' | 'medium' | 'high';
    image?: string;
  }) => Promise<IntelResult | null>;
  loadIntelHistory: () => Promise<void>;
  clearIntelHistory: () => void;
  setIntelInstructions: (instructions: string) => void;
  saveIntelDrop: (query: string, isPrivate: boolean) => Promise<void>;
  shareAIChatToFeed: (messages: IntelChatMessage[], subject: string) => Promise<void>;
  shareAIChatToDM: (messages: IntelChatMessage[], subject: string, recipientId: string) => Promise<void>;
  shareResearchChatToFeed: (messages: Array<{ role: 'user' | 'model', text: string, thinking?: string, image?: string }>, subject: string, mode: 'chat' | 'vision') => Promise<void>;
  publishManualDrop: (title: string, content: string, tags?: string[], attachmentFile?: File, isPrivate?: boolean) => Promise<void>;
  updateIntelDrop: (id: string, updates: Partial<IntelDrop>) => Promise<void>;
  deleteIntelDrop: (id: string) => Promise<void>; // Admin-only deletion
  fetchIntelDrops: () => Promise<void>;

  // Phase 3: Social Actions
  fetchDMChannels: () => Promise<void>;
  createOrGetChannel: (otherUserId: string) => Promise<string>;
  fetchMessages: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, content: string, attachmentFile?: File, replyToId?: string) => Promise<void>;
  deleteMessage: (messageId: string, channelId: string) => Promise<void>;
  editMessage: (messageId: string, channelId: string, newContent: string) => Promise<void>;
  hideChannel: (channelId: string) => Promise<void>;
  toggleReadReceipts: (channelId: string, enabled: boolean) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (reactionId: string) => Promise<void>;
  setTyping: (channelId: string, isTyping: boolean) => void;
  setActiveChannel: (channelId: string | null) => void;
  toggleCommsPanel: () => void;
  dismissMessageToast: () => void;
  dismissPersistentBanner: (bannerId: string) => void;
  setReplyingTo: (message: Message | null) => void;



  // Phase 6: Schedule Actions
  fetchSchedule: () => Promise<void>;
  updatePeriod: (period: Period) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  addPeriod: (period: Omit<Period, 'id' | 'created_at'>) => Promise<void>;

  // Phase 7: Games Actions (Poker)
  fetchPokerLobbyGames: () => Promise<void>;
  createPokerGame: (buyIn: number, maxPlayers: number, gameType?: 'practice' | 'multiplayer', aiDifficulty?: AIDifficulty) => Promise<{ gameId: string | null; error: string | null }>;
  joinPokerGame: (gameId: string) => Promise<boolean>;
  leavePokerGame: (gameId: string) => Promise<void>;
  cashOutAndLeave: (gameId: string) => Promise<boolean>;

  // Poker Animation Actions
  addPokerAnimation: (animation: PokerAnimation) => void;
  processAnimationQueue: () => void;
  skipCurrentAnimation: () => void;
  clearAnimationQueue: () => void;
  performPokerAction: (gameId: string, action: PokerActionType, amount?: number, playerId?: string) => Promise<boolean>;
  rebuyPokerPlayer: (gameId: string, amount?: number) => Promise<boolean>;
  adminDeletePokerGame: (gameId: string) => Promise<void>;
  subscribeToPokerGame: (gameId: string) => void;
  unsubscribeFromPokerGame: (gameId: string) => void;
  getNextActivePlayerId: (gameId: string, currentPosition: number) => string | null;
  processAITurn: (gameId: string, aiPlayerId: string) => Promise<void>;
  checkRoundComplete: (gameId: string) => boolean;
  advanceGameStage: (gameId: string) => Promise<void>;
  startNextHand: (gameId: string) => Promise<void>;

  // Economy
  orbitPoints: number;
  shopItems: any[];
  inventoryItems: any[];
  claimPassivePoints: () => Promise<{ success: boolean; error?: string; earned?: number }>;
  loadShop: () => Promise<void>;
  loadInventory: () => Promise<void>;
  purchaseItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  equipItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  updateOrbitPoints: (points: number) => void;

  // Notifications
  notifications: any[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Announcer System
  announcements: {
    list: Announcement[];
    activeBanner: Announcement | null;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    selectedCategories: Announcement['category'][];
    isModalOpen: boolean;
    activeAnnouncementId: string | null;
    isLoading: boolean;
    error: string | null;
    dismissedIds: Set<string>;
  };
  fetchAnnouncements: (reset?: boolean) => Promise<void>;
  loadMoreAnnouncements: () => Promise<void>;
  fetchActiveBanner: () => Promise<void>;
  dismissBanner: (id: string) => void;
  openChangelogModal: (announcementId?: string) => void;
  closeChangelogModal: () => void;
  toggleCategory: (category: Announcement['category']) => void;
  createAnnouncement: (data: CreateAnnouncementRequest) => Promise<Announcement>;
  updateAnnouncement: (id: string, data: Partial<CreateAnnouncementRequest>) => Promise<Announcement>;
  deleteAnnouncement: (id: string) => Promise<void>;
}

export const useOrbitStore = create<OrbitState>((set, get) => ({
  applyEquippedCursor: (items?: any[]) => {
    if (typeof document === 'undefined') return;
    const inventory = items || get().inventoryItems || [];
    const cursorItem = inventory.find((inv: any) => inv.equipped && (inv.item?.item_type === 'cursor' || inv.shop_items?.item_type === 'cursor'));
    const cursorMeta = cursorItem?.item || cursorItem?.shop_items;
    const cursorUrl = cursorMeta?.metadata?.cursor_url || cursorMeta?.preview_url;

    if (cursorUrl) {
      document.documentElement.style.setProperty('--orbit-cursor-url', `url('${cursorUrl}') 16 16`);
      document.body.classList.add('orbit-custom-cursor');
    } else {
      document.documentElement.style.removeProperty('--orbit-cursor-url');
      document.body.classList.remove('orbit-custom-cursor');
    }
  },
  isAuthenticated: false,
  isAuthLoading: true,
  currentUser: null,
  tasks: [],
  oracleHistory: [
    { id: 'init', role: 'model', text: "System Link established. Database connected. Waiting for input.", timestamp: new Date() }
  ],
  isOracleThinking: false,
  intelDrops: [],
  isIntelLoading: false,
  currentIntelResult: null,
  intelMessages: [],
  orbitPoints: 0,
  shopItems: [],
  inventoryItems: [],
  notifications: [],
  unreadCount: 0,

  // Phase 3: Social State
  onlineUsers: [],
  dmChannels: [],
  activeChannelId: null,
  messages: {},
  reactions: {},
  unreadCounts: {},
  typingUsers: {},
  typingChannels: {},
  commsPanelOpen: false,
  heartbeatInterval: null,

  // Message notification state
  messageToast: null,
  persistentBanners: [],

  // DM Replying State
  replyingTo: null,



  // Phase 6: Schedule State
  schedule: [],
  currentPeriod: null,
  nextPeriod: null,

  // Phase 7: Games State (Poker)
  pokerLobbyGames: [],
  activePokerGame: null,
  isPokerLoading: false,

  // Poker Animation State
  pokerAnimationQueue: [],
  isAnimationLocked: false,
  currentAnimatingAction: null,
  currentPokerAnimation: null,
  lastPokerAIReasoning: null,

  // Announcer System State
  announcements: {
    list: [],
    activeBanner: null,
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false
    },
    selectedCategories: [],
    isModalOpen: false,
    activeAnnouncementId: null,
    isLoading: false,
    error: null,
    dismissedIds: typeof window !== 'undefined'
      ? new Set(JSON.parse(localStorage.getItem('orbit_dismissed_announcements') || '[]'))
      : new Set()
  },

  // --- INITIALIZATION & REALTIME ---
  initialize: async () => {
    try {
      // 1. Check Session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        // Fetch Profile; create if missing
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let ensuredProfile = profile;
        if (profileError?.code === 'PGRST116' || !profile) {
          const fallbackUsername = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'operative';
          const { data: inserted, error: insertErr } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              username: fallbackUsername,
              avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
            })
            .select()
            .single();
          if (!insertErr) {
            ensuredProfile = inserted;
          }
        }

        // Fetch Tasks: Get user's own active tasks + public tasks from others (limit for performance)
        const { data: tasks } = await supabase
          .from('tasks')
          .select(`
            *,
            profiles!tasks_user_id_fkey(username, avatar_url)
          `)
          .or(`user_id.eq.${session.user.id},is_public.eq.true`)
          .order('created_at', { ascending: false })
          .limit(100);

        // Map DB Profile to App Type
        const mappedUser: UserProfile = ensuredProfile ? {
          id: ensuredProfile.id,
          username: ensuredProfile.username,
          avatar: ensuredProfile.avatar_url,
          joinedAt: new Date().toISOString(), // Using now as fallback
          isAdmin: ensuredProfile.is_admin || false,
          // Expose both camelCase and snake_case admin flags for UI compatibility
          ...(ensuredProfile.is_admin ? { is_admin: ensuredProfile.is_admin } : { is_admin: ensuredProfile.is_admin || false }),
          orbit_points: ensuredProfile.orbit_points || 0,
          points: ensuredProfile.orbit_points || 0, // legacy alias used in UI code
          last_active: ensuredProfile.last_active,
          can_customize_ai: ensuredProfile.can_customize_ai || false,
          unlocked_models: ensuredProfile.unlocked_models || ['flash'],
          intel_instructions: ensuredProfile.intel_instructions || '',
          stats: {
            tasksCompleted: ensuredProfile.tasks_completed || 0,
            tasksForfeited: ensuredProfile.tasks_forfeited || 0,
            streakDays: 0
          }
        } : null;

        set({
          isAuthenticated: true,
          currentUser: mappedUser,
          tasks: tasks || [],
          orbitPoints: mappedUser?.orbit_points || 0
        });

        // Fetch Intel Drops
        await get().fetchIntelDrops();
        await get().loadOracleHistory();

        // Phase 3: Fetch Social Data
        await get().fetchDMChannels();

        // Phase 6: Fetch Schedule
        await get().fetchSchedule();
        await get().loadInventory();

        // Request browser notification permission
        if (typeof window !== 'undefined') {
          import('../lib/utils/notifications').then(({ requestNotificationPermission }) => {
            requestNotificationPermission();
          });
        }

        // Phase 3: Setup Online Presence Tracking
        const presenceChannel = supabase.channel('online_presence')
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const userIds = Object.values(state).flat().map((p: any) => p.user_id);
            set({ onlineUsers: userIds });
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await presenceChannel.track({ user_id: session.user.id });
            }
          });

        // 2. Setup Realtime Task Listeners (Sync across devices)
        supabase.channel('public:tasks')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${session.user.id}` }, (payload: any) => {
            const currentTasks = get().tasks;
            if (payload.eventType === 'INSERT') {
              // ✅ FIX: Only add if not already in state (prevents duplication)
              const exists = currentTasks.some(t => t.id === payload.new.id);
              if (!exists) {
                set({ tasks: [...currentTasks, payload.new as Task] });
              }
            } else if (payload.eventType === 'UPDATE') {
              set({ tasks: currentTasks.map(t => t.id === payload.new.id ? payload.new as Task : t) });
            } else if (payload.eventType === 'DELETE') {
              set({ tasks: currentTasks.filter(t => t.id !== payload.old.id) });
            }
          })
          .subscribe();

        // 3. Setup Realtime Intel Drop Listeners
        supabase.channel('public:intel_drops')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'intel_drops' }, (payload: any) => {
            const currentDrops = get().intelDrops;
            if (payload.eventType === 'INSERT') {
              // Fetch full drop with profile data
              get().fetchIntelDrops();
            } else if (payload.eventType === 'DELETE') {
              set({ intelDrops: currentDrops.filter(d => d.id !== payload.old.id) });
            }
          })
          .subscribe();

        // 4. Setup Realtime DM Channel Listeners
        supabase.channel('public:dm_channels')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_channels' }, (payload: any) => {
            const userId = get().currentUser?.id;
            if (!userId) return;

            const involvesUser =
              (payload.new && (payload.new.user1_id === userId || payload.new.user2_id === userId)) ||
              (payload.old && (payload.old.user1_id === userId || payload.old.user2_id === userId));

            if (involvesUser) {
              get().fetchDMChannels();
            }
          })
          .subscribe();

        // 5. Setup Realtime DM Message Listeners
        supabase.channel('public:messages')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload: any) => {
            const newMessage = payload.new as Message;
            const currentMessages = get().messages;
            const currentUser = get().currentUser;

            // Skip if this is our own message (already added optimistically)
            if (newMessage.sender_id === currentUser?.id) return;

            // Check if this message is for a channel the user is part of
            const userChannels = get().dmChannels;
            const relevantChannel = userChannels.find(ch => ch.id === newMessage.channel_id);

            if (relevantChannel) {
              set({
                messages: {
                  ...currentMessages,
                  [newMessage.channel_id]: [
                    ...(currentMessages[newMessage.channel_id] || []),
                    newMessage
                  ]
                }
              });

              // Refresh channel list to update unread counts
              await get().fetchDMChannels();

              // Show notifications if not currently viewing this channel
              const activeChannelId = get().activeChannelId;
              if (activeChannelId !== newMessage.channel_id) {
                const sender = relevantChannel.otherUser;
                if (sender) {
                  // 1. Create database notification
                  try {
                    await supabase.from('notifications').insert({
                      recipient_id: currentUser?.id,
                      sender_id: newMessage.sender_id,
                      type: 'dm',
                      title: `New message from ${sender.username}`,
                      content: {
                        message: newMessage.content.substring(0, 100),
                        channelId: newMessage.channel_id,
                        senderUsername: sender.username,
                        senderAvatar: sender.avatar
                      },
                      link_url: `#comms/${newMessage.channel_id}`,
                      is_read: false
                    });

                    // Refresh notifications in state
                    await get().fetchNotifications();
                  } catch (err) {
                    console.error('Failed to create notification:', err);
                  }

                  // 2. Show toast notification
                  const bannerId = `banner-${Date.now()}`;
                  set({
                    messageToast: {
                      isVisible: true,
                      senderUsername: sender.username,
                      senderAvatar: sender.avatar,
                      messagePreview: newMessage.content.substring(0, 100),
                      onDismiss: () => {
                        set({ messageToast: null });
                      },
                      onClick: () => {
                        get().setActiveChannel(newMessage.channel_id);
                        // Navigate to comms page using hash navigation
                        if (typeof window !== 'undefined') {
                          window.location.hash = `comms/${newMessage.channel_id}`;
                        }
                        set({ messageToast: null });
                      }
                    }
                  });

                  // Auto-dismiss toast after 5 seconds
                  setTimeout(() => {
                    const currentToast = get().messageToast;
                    if (currentToast?.senderUsername === sender.username) {
                      set({ messageToast: null });
                    }
                  }, 5000);

                  // 3. Add persistent banner
                  set(state => ({
                    persistentBanners: [
                      ...state.persistentBanners,
                      {
                        id: bannerId,
                        senderUsername: sender.username,
                        senderAvatar: sender.avatar,
                        messagePreview: newMessage.content.substring(0, 100),
                        timestamp: newMessage.created_at,
                        channelId: newMessage.channel_id
                      }
                    ]
                  }));

                  // 4. Browser notification (legacy)
                  import('../lib/utils/notifications').then(({ showDMNotification, updateFaviconBadge, getTotalUnreadCount }) => {
                    showDMNotification({
                      senderUsername: sender.username,
                      senderAvatar: sender.avatar,
                      messagePreview: newMessage.content,
                      channelId: newMessage.channel_id,
                      onClick: () => {
                        get().setActiveChannel(newMessage.channel_id);
                        if (typeof window !== 'undefined') {
                          window.location.hash = `comms/${newMessage.channel_id}`;
                        }
                        // get().toggleCommsPanel(); // No longer needed if we go to full page
                      }
                    });

                    // Update favicon badge
                    const channels = get().dmChannels;
                    const totalUnread = getTotalUnreadCount(channels);
                    updateFaviconBadge(totalUnread);
                  });
                }
              }
            }
          })
          .subscribe();

        // 6. Setup Realtime Reaction Listeners
        supabase.channel('public:message_reactions')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload: any) => {
            const newReaction = payload.new as MessageReaction;
            const currentReactions = get().reactions;

            const currentList = currentReactions[newReaction.message_id] || [];

            // Avoid duplicates (e.g. from optimistic updates or double events)
            if (currentList.some(r => r.id === newReaction.id)) return;

            set({
              reactions: {
                ...currentReactions,
                [newReaction.message_id]: [...currentList, newReaction]
              }
            });
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload: any) => {
            const deletedReaction = payload.old as MessageReaction;
            const currentReactions = get().reactions;

            set({
              reactions: {
                ...currentReactions,
                [deletedReaction.message_id]: (currentReactions[deletedReaction.message_id] || []).filter(
                  r => r.id !== deletedReaction.id
                )
              }
            });
          })
          .subscribe();

        // 7. Setup Realtime Notification Listeners
        supabase.channel('public:notifications')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${session.user.id}`
          }, (payload: any) => {
            const newNotification = payload.new;
            const currentNotifications = get().notifications;

            // Add new notification to the list
            set({
              notifications: [newNotification, ...currentNotifications],
              unreadCount: get().unreadCount + 1
            });
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${session.user.id}`
          }, (payload: any) => {
            const updatedNotification = payload.new;
            const currentNotifications = get().notifications;

            // Update the notification in the list
            const updated = currentNotifications.map((n: any) =>
              n.id === updatedNotification.id ? updatedNotification : n
            );

            set({
              notifications: updated,
              unreadCount: updated.filter((n: any) => !n.is_read).length
            });
          })
          .subscribe();

        // Fetch initial notifications
        await get().fetchNotifications();

        // Setup heartbeat to update last_active every 30 seconds
        const heartbeat = setInterval(async () => {
          const { error } = await supabase
            .from('profiles')
            .update({ last_active: new Date().toISOString() })
            .eq('id', session.user.id);

          if (error) {
            console.error('❌ Heartbeat failed:', error);
          }
        }, 30000); // 30 seconds

        // Store interval ID for cleanup
        set({ heartbeatInterval: heartbeat });
      }
    } catch (error) {
      console.warn("Orbit Init Warning: Supabase disconnected or unconfigured.", error);
      // We intentionally suppress the error here so the UI can load the Login Screen
      // instead of white-screening.
    } finally {
      set({ isAuthLoading: false });
    }
  },

  // --- AUTH ACTIONS ---
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    const userId = data.user?.id;
    if (userId) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('orbit_points')
          .eq('id', userId)
          .single();
        const currentPoints = prof?.orbit_points || 0;
        await supabase
          .from('profiles')
          .update({ orbit_points: currentPoints + 20 })
          .eq('id', userId);
      } catch (e) {
        console.warn('Orbit points bonus on login failed', e);
      }
    }

    await get().initialize(); // Re-run init to fetch data
    return { success: true };
  },

  register: async (email, password, username) => {
    // Sign up creates the auth user. 
    // The SQL Trigger we wrote creates the 'profiles' row automatically.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username } // Passed to the trigger
      }
    });

    if (error) return { success: false, error: error.message };

    await get().initialize();
    return { success: true };
  },

  logout: async () => {
    // Clear heartbeat interval
    const state = get();
    if (state.heartbeatInterval) {
      clearInterval(state.heartbeatInterval);
    }

    await supabase.auth.signOut();
    set({
      isAuthenticated: false,
      currentUser: null,
      tasks: [],
      intelDrops: [],
      currentIntelResult: null,
      heartbeatInterval: null
    });
  },

  // --- DATA ACTIONS ---
  addTask: async (task) => {
    const { currentUser } = get();
    if (!currentUser) return;

    // 1. Optimistic Update (Show it immediately)
    const tempId = 'temp-' + Date.now();
    const optimisticTask: Task = {
      id: tempId,
      title: task.title || 'New Task',
      category: task.category || 'Grind',
      difficulty: task.difficulty || 'Medium',
      completed: false,
      is_public: task.is_public || false,
      isAnalyzing: !task.difficulty, // Only show analyzing if we need AI
      due_date: task.due_date,
      resource_links: task.resource_links || []
    };
    set((state) => ({ tasks: [...state.tasks, optimisticTask] }));

    try {
      // 2. AI Analysis if difficulty not manually set
      let difficulty = task.difficulty;
      if (!difficulty) {
        const analysis = await assessTaskDifficulty(optimisticTask.title);
        difficulty = analysis.difficulty;
      }

      // 3. DB Insert with profile join (matching initialization query format)
      const { data, error } = await supabase.from('tasks').insert({
        user_id: currentUser.id,
        title: optimisticTask.title,
        category: optimisticTask.category,
        difficulty: difficulty,
        completed: false,
        is_public: task.is_public || false,
        due_date: optimisticTask.due_date,
        resource_links: optimisticTask.resource_links
      }).select(`
        *,
        profiles!tasks_user_id_fkey(username, avatar_url)
      `).single();

      // 4. Handle errors properly - throw if insert failed
      if (error) {
        console.error('Task creation failed:', error);
        // Remove optimistic task on failure
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== tempId)
        }));
        throw error;
      }

      // 5. Reconcile Optimistic Task with Real DB Task
      if (data) {
        set((state) => ({
          tasks: state.tasks.map(t => t.id === tempId ? data as Task : t)
        }));
      }
    } catch (err) {
      console.error('Error in addTask:', err);
      // Ensure optimistic task is removed on any error
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== tempId)
      }));
      throw err; // Re-throw so UI can handle it
    }
  },

  toggleTask: async (id, currentStatus) => {
    // Get the task to access its difficulty
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;

    // Optimistic
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t)
    }));

    // DB Update
    const { error } = await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', id);

    // Update Profile Stats if completing
    if (!error && !currentStatus) {
      const user = get().currentUser;
      if (user) {
        // Award points based on task difficulty
        const pointsMap: Record<string, number> = {
          'Hard': 50,
          'Medium': 30,
          'Easy': 15
        };
        const pointsEarned = pointsMap[task.difficulty] || 30; // Default to Medium if unknown
        const currentPoints = user.orbit_points ?? user.points ?? 0;
        const newPoints = currentPoints + pointsEarned;

        // Update task completion count
        const newCount = user.stats.tasksCompleted + 1;

        // Update both points and task count in one call
        await supabase.from('profiles').update({
          tasks_completed: newCount,
          orbit_points: newPoints
        }).eq('id', user.id);

        set(state => state.currentUser ? ({
          currentUser: {
            ...state.currentUser,
            stats: { ...state.currentUser.stats, tasksCompleted: newCount },
            orbit_points: newPoints,
            points: newPoints
          },
          orbitPoints: newPoints
        }) : {});
      }
    }
  },

  forfeitTask: async (id) => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Optimistic Delete
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));

    // DB Delete
    await supabase.from('tasks').delete().eq('id', id);

    // Update Shame Stats
    const newCount = currentUser.stats.tasksForfeited + 1;
    await supabase.from('profiles').update({ tasks_forfeited: newCount }).eq('id', currentUser.id);
    set(state => state.currentUser ? ({
      currentUser: { ...state.currentUser, stats: { ...state.currentUser.stats, tasksForfeited: newCount } }
    }) : {});
  },

  deleteTask: async (id) => {
    // Admin-only deletion (no stat penalty)
    // Optimistic Delete
    const currentTasks = get().tasks;
    set({ tasks: currentTasks.filter(t => t.id !== id) });

    // DB Delete with error handling
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error("❌ Failed to delete task:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      // Revert on error
      set({ tasks: currentTasks });
      throw new Error(error.message || 'Failed to delete task');
    } else {
      console.log("✅ Task deleted successfully:", id);
    }
  },

  claimTask: async (taskId: string) => {
    const { currentUser, tasks } = get();
    if (!currentUser) return;

    // Find the public task
    const publicTask = tasks.find(t => t.id === taskId);
    if (!publicTask || !publicTask.is_public) return;

    // Check if user already has this exact task
    const alreadyHas = tasks.some(t =>
      t.user_id === currentUser.id &&
      t.title === publicTask.title &&
      t.category === publicTask.category
    );

    if (alreadyHas) {
      console.log('⚠️ Task already claimed or exists');
      return;
    }

    // Create a copy for the current user (private by default)
    const { data, error } = await supabase.from('tasks').insert({
      user_id: currentUser.id,
      title: publicTask.title,
      category: publicTask.category,
      difficulty: publicTask.difficulty,
      completed: false,
      is_public: false, // Claimed tasks are private
      original_task_id: publicTask.id, // Link to original
      due_date: publicTask.due_date, // Copy current due date
      resource_links: publicTask.resource_links, // Copy resources
      answer: publicTask.answer // Copy answer if exists
    }).select(`
      *,
      profiles!tasks_user_id_fkey(username, avatar_url)
    `).single();

    if (error) {
      console.error('❌ Failed to claim task:', error);
      throw error;
    }

    console.log('✅ Task claimed successfully, waiting for realtime sync');
  },

  updateTask: async (id, updates) => {
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));

    const { error } = await supabase.from('tasks').update(updates).eq('id', id);

    if (error) {
      console.error('❌ Failed to update task:', error);
      const { data } = await supabase.from('tasks').select('*').eq('id', id).single();
      if (data) {
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? data as Task : t)
        }));
      }
    }
  },

  submitAnswer: async (taskId, answer) => {
    const { currentUser, tasks } = get();
    const task = tasks.find(t => t.id === taskId);

    if (!task || !currentUser) return;

    if (task.user_id !== currentUser.id && !currentUser.isAdmin) {
      console.error('⛔ Permission denied: Cannot submit answer for this task');
      return;
    }

    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, answer } : t)
    }));

    const { error } = await supabase.from('tasks').update({ answer }).eq('id', taskId);

    if (error) {
      console.error('❌ Failed to submit answer:', error);
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, answer: task.answer } : t)
      }));
    }
  },

  askOracle: async (query: string) => {
    const { oracleHistory, currentUser } = get();

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: new Date()
    };

    set({
      oracleHistory: [...oracleHistory, userMsg],
      isOracleThinking: true
    });

    // Persist user message
    if (currentUser) {
      supabase.from('oracle_chat_history').insert({
        user_id: currentUser.id,
        role: 'user',
        content: query,
        timestamp: userMsg.timestamp.toISOString()
      }).then(({ error }) => {
        if (error) console.warn('Oracle user msg persist failed:', error);
      });
    }

    try {
      // 2. Get AI Response
      // Pass the updated history including the new user message
      const updatedHistory = [...oracleHistory, userMsg];
      const responseText = await generateOracleRoast(
        updatedHistory,
        currentUser?.stats?.tasksCompleted || 0,
        currentUser?.stats?.tasksForfeited || 0
      );

      // 3. Add AI Message
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      set(state => ({
        oracleHistory: [...state.oracleHistory, aiMsg],
        isOracleThinking: false
      }));

      // Persist AI message
      if (currentUser) {
        supabase.from('oracle_chat_history').insert({
          user_id: currentUser.id,
          role: 'model',
          content: responseText,
          timestamp: aiMsg.timestamp.toISOString()
        }).then(({ error }) => {
          if (error) console.warn('Oracle AI msg persist failed:', error);
        });
      }

    } catch (error) {
      console.error('Oracle Error:', error);
      set({ isOracleThinking: false });

      // Add error message
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "[ERROR] CONNECTION INTERRUPTED. RETRY.",
        timestamp: new Date()
      };

      set(state => ({
        oracleHistory: [...state.oracleHistory, errorMsg]
      }));
    }
  },

  triggerSOS: () => {
    const { oracleHistory } = get();
    const sosMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: "🚨 SOS BROADCASTED. ALL OPERATIVES ALERTED.",
      timestamp: new Date(),
      isSOS: true
    };
    set({ oracleHistory: [...oracleHistory, sosMsg] });

    const { currentUser } = get();
    if (currentUser) {
      supabase.from('oracle_chat_history').insert({
        user_id: currentUser.id,
        role: 'model',
        content: sosMsg.text,
        is_sos: true,
        timestamp: sosMsg.timestamp.toISOString()
      }).then(({ error }) => {
        if (error) console.warn('Oracle SOS persist failed:', error);
      });
    }
  },

  // --- INTEL ACTIONS ---
  executeIntelQuery: async (query: string, deepDive: boolean = false) => {
    await get().sendIntelQuery(query, {
      depthLevel: deepDive ? 6 : 3,
      modelUsed: deepDive ? 'orbit-x' : 'flash',
      researchMode: deepDive
    });
  },

  setIntelInstructions: (instructions: string) => {
    set(state => ({
      currentUser: state.currentUser
        ? { ...state.currentUser, intel_instructions: instructions }
        : state.currentUser
    }));
  },

  sendIntelQuery: async (prompt: string, options = {}) => {
    const { currentUser, intelMessages: existingHistory } = get();
    if (!currentUser) return null;

    const depthLevel = (options as any).depthLevel ?? 3;
    const modelUsed = (options as any).modelUsed || 'flash';
    const researchMode = (options as any).researchMode ?? modelUsed === 'orbit-x';
    const customInstructions = ((options as any).customInstructions || '').trim();
    const conversationMode = (options as any).conversationMode || false;
    const thinkingEnabled = (options as any).thinkingEnabled ?? true; // Default to enabled

    const optimisticUser: IntelChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
      meta: {
        model_used: modelUsed,
        depth_level: depthLevel,
        research_mode: researchMode
      }
    };

    set(state => ({
      intelMessages: [...state.intelMessages, optimisticUser],
      isIntelLoading: true,
      currentIntelResult: null
    }));

    // Prefer cached profile instructions; fallback to DB fetch for new fields
    let profileInstructions = currentUser.intel_instructions || '';
    if (!profileInstructions) {
      const { data } = await supabase
        .from('profiles')
        .select('intel_instructions')
        .eq('id', currentUser.id)
        .single();
      profileInstructions = data?.intel_instructions || '';
    }

    const historyForContext = existingHistory.map(msg => ({
      role: msg.role,
      text: msg.role === 'model'
        ? `${(msg.result?.summary_bullets || []).join(' ')}\n${msg.result?.essay || msg.content || ''}`.trim()
        : msg.content
    }));

    try {
      const { result, sessionId, created_at } = await sendIntelQueryWithPersistence({
        prompt,
        userId: currentUser.id,
        depthLevel,
        modelUsed,
        researchMode,
        customInstructions: customInstructions || undefined,
        profileInstructions,
        canCustomize: currentUser.can_customize_ai || false,
        unlockedModels: (currentUser.is_admin || currentUser.isAdmin)
          ? ['flash', 'pro', 'orbit-x', 'gemini-3-pro', 'gemini-3-image']
          : (currentUser.unlocked_models || ['flash']),
        conversationHistory: historyForContext,
        conversationMode,
        thinkingEnabled,
        mode: options?.mode,
        thinkingLevel: options?.thinkingLevel,
        image: options?.image
      });

      const modelMessage: IntelChatMessage = {
        id: sessionId || `ai-${Date.now()}`,
        role: 'model',
        content: 'Intel response',
        created_at: created_at || new Date().toISOString(),
        result,
        meta: {
          model_used: modelUsed,
          depth_level: depthLevel,
          research_mode: researchMode
        }
      };

      set(state => ({
        intelMessages: [...state.intelMessages, modelMessage],
        currentIntelResult: result,
        isIntelLoading: false
      }));

      return result;
    } catch (error: any) {
      console.error('Intel Query Error:', error);

      // Provide user-friendly error messages
      let userMessage = 'Intel query failed. Please try again.';
      if (error?.message?.includes('API Configuration Error')) {
        userMessage = 'Gemini API key is missing. Please configure your API key in .env.local';
      } else if (error?.message?.includes('CLEARANCE_DENIED')) {
        userMessage = error.message.replace('CLEARANCE_DENIED: ', '');
      } else if (error?.message?.includes('empty or invalid response')) {
        userMessage = 'AI returned an invalid response. Try simplifying your query or adjusting settings.';
      } else if (error?.message?.includes('not valid JSON')) {
        userMessage = 'AI response format error. This may be a temporary issue - please retry.';
      }

      // Show toast error
      const { toast } = await import('@/lib/toast');
      toast.error(userMessage);

      set(state => ({
        intelMessages: state.intelMessages.filter(m => m.id !== optimisticUser.id),
        isIntelLoading: false
      }));
      throw error;
    }
  },

  loadIntelHistory: async () => {
    // Reset Intel thread on refresh to avoid unbounded context growth
    set({ intelMessages: [] });
  },

  clearIntelHistory: () => set({ intelMessages: [] }),

  loadOracleHistory: async () => {
    // Reset Oracle chatbot on refresh to avoid carrying long threads
    set({ oracleHistory: get().oracleHistory.slice(0, 1) });
  },

  saveIntelDrop: async (query: string, isPrivate: boolean) => {
    const { currentUser, currentIntelResult } = get();
    if (!currentUser || !currentIntelResult) return;

    const { data, error } = await supabase
      .from('intel_drops')
      .insert({
        author_id: currentUser.id,
        query: query,
        summary_bullets: currentIntelResult.summary_bullets,
        sources: currentIntelResult.sources,
        related_concepts: currentIntelResult.related_concepts,
        essay: currentIntelResult.essay,
        is_private: isPrivate
      })
      .select()
      .single();

    if (error) throw error;

    // Clear current result after saving
    set({ currentIntelResult: null });
  },

  shareAIChatToFeed: async (messages: IntelChatMessage[], subject: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { toast } = await import('../lib/toast');
    const trimmedSubject = (subject || '').trim() || 'AI Chat';
    if (!messages || messages.length === 0) {
      toast.error('Select at least one message to share.');
      return;
    }

    const formatModelContent = (msg: IntelChatMessage) => {
      if (msg.result) {
        const bulletText = Array.isArray(msg.result.summary_bullets) && msg.result.summary_bullets.length
          ? msg.result.summary_bullets.map((b: string) => `- ${b}`).join('\n')
          : '';
        const essayText = (msg.result.essay || '').trim();
        return [bulletText, essayText].filter(Boolean).join('\n\n') || msg.content || 'AI response';
      }
      return msg.content || 'AI response';
    };

    const formattedChat = messages
      .map((msg) => {
        const sender = msg.role === 'user' ? (currentUser.username || 'User') : 'AI Assistant';
        const body = msg.role === 'user' ? msg.content : formatModelContent(msg);
        return `**${sender}:** ${body}`;
      })
      .join('\n\n');

    const { error } = await supabase
      .from('intel_drops')
      .insert({
        author_id: currentUser.id,
        query: `AI Chat about ${trimmedSubject}`,
        summary_bullets: [
          'Conversation with AI Assistant',
          `${messages.length} messages shared`,
          `Topic: ${trimmedSubject}`
        ],
        sources: [],
        related_concepts: trimmedSubject ? [trimmedSubject] : [],
        essay: formattedChat,
        is_private: false,
        attachment_type: 'ai_chat'
      });

    if (error) {
      console.error('Failed to share chat to feed:', error);
      toast.error('Failed to share chat to feed.');
      throw error;
    }

    toast.success('AI chat shared to feed!');
    await get().fetchIntelDrops();
  },

  shareAIChatToDM: async (messages: IntelChatMessage[], subject: string, recipientId: string) => {
    const { currentUser, createOrGetChannel, sendMessage } = get();
    if (!currentUser) return;

    const { toast } = await import('../lib/toast');
    const trimmedSubject = (subject || '').trim() || 'AI Chat';
    if (!recipientId) {
      toast.error('Select a friend to send the chat to.');
      return;
    }

    if (!messages || messages.length === 0) {
      toast.error('Select at least one message to share.');
      return;
    }

    const formatModelContent = (msg: IntelChatMessage) => {
      if (msg.result) {
        const bulletText = Array.isArray(msg.result.summary_bullets) && msg.result.summary_bullets.length
          ? msg.result.summary_bullets.map((b: string) => `- ${b}`).join('\n')
          : '';
        const essayText = (msg.result.essay || '').trim();
        return [bulletText, essayText].filter(Boolean).join('\n\n') || msg.content || 'AI response';
      }
      return msg.content || 'AI response';
    };

    const formattedChat = messages
      .map((msg) => {
        const sender = msg.role === 'user' ? 'You' : 'AI Assistant';
        const body = msg.role === 'user' ? msg.content : formatModelContent(msg);
        return `**${sender}:** ${body}`;
      })
      .join('\n\n');

    try {
      const channelId = await createOrGetChannel(recipientId);
      await sendMessage(channelId, `📊 AI Chat about ${trimmedSubject}\n\n${formattedChat}`);
      toast.success('Chat sent to friend!');
    } catch (error: any) {
      console.error('Failed to share chat to DM:', error);
      toast.error('Failed to send chat to friend.');
      throw error;
    }
  },

  shareResearchChatToFeed: async (
    messages: Array<{ role: 'user' | 'model', text: string, thinking?: string, image?: string }>,
    subject: string,
    mode: 'chat' | 'vision'
  ) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { toast } = await import('../lib/toast');
    const trimmedSubject = (subject || '').trim() || (mode === 'vision' ? 'Vision Analysis' : 'AI Chat');

    if (!messages || messages.length === 0) {
      toast.error('Select at least one message to share.');
      return;
    }

    // Format messages for feed
    const formattedChat = messages
      .map((msg) => {
        const sender = msg.role === 'user' ? (currentUser.username || 'User') : 'AI Assistant';
        let body = msg.text;

        // Add thinking if available
        if (msg.thinking) {
          body += `\n\n_[Thinking: ${msg.thinking.substring(0, 200)}...]_`;
        }

        // Add image indicator for vision mode
        if (msg.image) {
          body = `🖼️ _[Image attached]_\n\n${body}`;
        }

        return `**${sender}:** ${body}`;
      })
      .join('\n\n');

    const { error } = await supabase
      .from('intel_drops')
      .insert({
        author_id: currentUser.id,
        query: `${mode === 'vision' ? '🔬 Vision Analysis' : '💬 Research Chat'}: ${trimmedSubject}`,
        summary_bullets: [
          mode === 'vision' ? 'Vision Lab Analysis' : 'Research Lab Conversation',
          `${messages.length} messages shared`,
          `Topic: ${trimmedSubject}`
        ],
        sources: [],
        related_concepts: trimmedSubject ? [trimmedSubject] : [],
        essay: formattedChat,
        is_private: false,
        attachment_type: mode === 'vision' ? 'vision_chat' : 'research_chat'
      });

    if (error) {
      console.error('Failed to share research chat to feed:', error);
      toast.error('Failed to share to feed.');
      throw error;
    }

    toast.success('Shared to feed!');
    await get().fetchIntelDrops();
  },

  fetchIntelDrops: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Fetch public drops + my private drops (limit to 50 for performance)
    const { data, error } = await supabase
      .from('intel_drops')
      .select(`
        *,
        profiles!intel_drops_author_id_fkey (
          username,
          avatar_url,
          is_admin,
          can_customize_ai
        )
      `)
      .or(`is_private.eq.false,author_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Fetch Intel Drops Error:', error);
      return;
    }

    // Map to IntelDrop type with author info
    const mappedDrops: IntelDrop[] = (data || []).map((drop: any) => ({
      id: drop.id,
      author_id: drop.author_id,
      author_username: drop.profiles?.username,
      author_avatar: drop.profiles?.avatar_url,
      author_is_admin: drop.profiles?.is_admin || false,
      author_ai_plus: drop.profiles?.can_customize_ai || false,
      query: drop.query,
      summary_bullets: drop.summary_bullets,
      sources: drop.sources,
      related_concepts: drop.related_concepts,
      essay: drop.essay,
      attachment_url: drop.attachment_url,
      attachment_type: drop.attachment_type,
      is_private: drop.is_private,
      created_at: drop.created_at
    }));

    set({ intelDrops: mappedDrops });
  },

  publishManualDrop: async (title: string, content: string, tags: string[] = [], attachmentFile?: File, isPrivate = false) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('You must be signed in to post a transmission.');

    // Handle file upload if present
    let attachmentUrl = null;
    let attachmentType = null;

    if (attachmentFile) {
      const filePath = `${currentUser.id}/${Date.now()}_${attachmentFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('intel_attachments')
        .upload(filePath, attachmentFile);

      if (uploadError) {
        console.error('File upload error:', uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from('intel_attachments')
          .getPublicUrl(uploadData.path);

        attachmentUrl = urlData.publicUrl;
        attachmentType = attachmentFile.type;
      }
    }

    const basePayload = {
      author_id: currentUser.id,
      query: title,
      // If content is empty but we have an attachment, allow empty bullets (Visual Drop)
      summary_bullets: content.trim() ? [content] : [],
      sources: [],
      related_concepts: ['Manual Broadcast', ...tags],
      is_private: isPrivate
    };

    const attachmentPayload = (attachmentUrl || attachmentType) ? {
      attachment_url: attachmentUrl,
      attachment_type: attachmentType
    } : null;

    const attemptInsert = async (includeAttachments: boolean) => {
      const payload = includeAttachments && attachmentPayload
        ? { ...basePayload, ...attachmentPayload }
        : basePayload;

      return supabase
        .from('intel_drops')
        .insert(payload)
        .select()
        .single();
    };

    let data, error;

    if (attachmentPayload) {
      ({ data, error } = await attemptInsert(true));

      // Fallback if attachment columns are missing in older databases
      if (error && (error.code === '42703' || error.message?.toLowerCase().includes('attachment'))) {
        const { toast } = await import('@/lib/toast');
        toast.warning('Transmission posted, but attachment failed. The database may need an update.');
        console.warn('Attachment columns missing; retrying transmission without attachment metadata. An orphaned file may exist in storage as a result.');
        ({ data, error } = await attemptInsert(false));
      }
    } else {
      ({ data, error } = await attemptInsert(false));
    }

    if (error) throw error;

    // Refresh the feed
    await get().fetchIntelDrops();
  },

  deleteIntelDrop: async (id: string) => {
    // Optimistic Update
    const currentDrops = get().intelDrops;
    set({ intelDrops: currentDrops.filter(d => d.id !== id) });

    const { error } = await supabase.from('intel_drops').delete().eq('id', id);
    if (error) {
      console.error("Failed to delete drop:", error);
      // Revert on error
      set({ intelDrops: currentDrops });
    }
  },

  updateIntelDrop: async (id: string, updates: Partial<IntelDrop>) => {
    const { intelDrops } = get();

    // Optimistic Update
    set({
      intelDrops: intelDrops.map(d => d.id === id ? { ...d, ...updates } : d)
    });

    // Prepare payload for DB (map frontend types to DB columns if needed)
    // IntelDrop type matches DB mostly, but we need to be careful with readonly fields
    const dbUpdates: any = {};
    if (updates.query !== undefined) dbUpdates.query = updates.query;
    if (updates.summary_bullets !== undefined) dbUpdates.summary_bullets = updates.summary_bullets;
    if (updates.related_concepts !== undefined) dbUpdates.related_concepts = updates.related_concepts;
    if (updates.is_private !== undefined) dbUpdates.is_private = updates.is_private;
    if (updates.attachment_url !== undefined) dbUpdates.attachment_url = updates.attachment_url;

    const { error } = await supabase
      .from('intel_drops')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Failed to update drop:', error);
      // Revert
      const { data } = await supabase.from('intel_drops').select('*').eq('id', id).single();
      if (data) {
        // We need to re-map the data to match IntelDrop type if we revert, 
        // but for now just fetching fresh drops might be safer or just reverting to old state
        // Simpler: Just refresh everything
        get().fetchIntelDrops();
      }
    }
  },

  // ============================================
  // PHASE 3: SOCIAL ACTIONS
  // ============================================

  fetchDMChannels: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Use optimized SQL function that returns everything in ONE query
    // This replaces the N+1 pattern (40+ queries -> 1 query)
    const { data, error } = await supabase.rpc('get_dm_channels_with_meta', {
      p_user_id: currentUser.id
    });

    if (error) {
      // Fallback: If the function doesn't exist yet, use legacy method
      if (error.code === '42883' || error.message?.includes('function')) {
        console.warn('Optimized DM function not found, using fallback. Run sql/optimize_queries.sql');
        return await fetchDMChannelsLegacy();
      }
      if (missingTable(error, 'public.dm_channels')) {
        console.warn('Comms: dm_channels table not found; disabling DM features.');
        set({ dmChannels: [] });
        return;
      }
      console.error('Fetch DM Channels Error:', error);
      return;
    }

    // Map the flat RPC result to the expected DMChannel structure
    const channels = (data || []).map((row: any) => ({
      id: row.id,
      user1_id: row.user1_id,
      user2_id: row.user2_id,
      created_at: row.created_at,
      read_receipts_enabled: row.read_receipts_enabled,
      unreadCount: row.unread_count || 0,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_content?.substring(0, 50),
      otherUser: row.other_user_id ? {
        id: row.other_user_id,
        username: row.other_user_username,
        avatar: row.other_user_avatar,
        joinedAt: '',
        orbit_points: row.other_user_orbit_points,
        last_active: row.other_user_last_active,
        stats: {
          tasksCompleted: row.other_user_tasks_completed || 0,
          tasksForfeited: row.other_user_tasks_forfeited || 0,
          streakDays: 0
        }
      } : undefined
    }));

    set({ dmChannels: channels });

    // Update favicon badge with total unread count
    if (typeof window !== 'undefined') {
      import('../lib/utils/notifications').then(({ updateFaviconBadge, getTotalUnreadCount }) => {
        const totalUnread = getTotalUnreadCount(channels);
        updateFaviconBadge(totalUnread);
      });
    }
  },

  createOrGetChannel: async (otherUserId: string) => {
    const { currentUser, fetchDMChannels } = get();
    if (!currentUser) throw new Error('Not authenticated');

    const [user1, user2] = [currentUser.id, otherUserId].sort();

    try {
      // Try to insert new channel
      const { data, error } = await supabase
        .from('dm_channels')
        .insert({ user1_id: user1, user2_id: user2 })
        .select()
        .single();

      // If channel already exists (unique constraint violation), fetch it
      if (error?.code === '23505') {
        const { data: existing, error: existingError } = await supabase
          .from('dm_channels')
          .select()
          .eq('user1_id', user1)
          .eq('user2_id', user2)
          .single();

        if (existingError) throw existingError;
        await fetchDMChannels();
        return existing!.id;
      }

      if (error) throw error;

      await fetchDMChannels();
      return data.id;
    } catch (error: any) {
      if (missingTable(error, 'public.dm_channels')) {
        console.warn('Comms: dm_channels table not found; run sql/add_dm_comms.sql');
      }
      const { toast } = await import('../lib/toast');
      toast.error(error?.message || 'Failed to initialize uplink.');
      throw error;
    }
  },

  fetchMessages: async (channelId: string) => {
    // Fetch the most recent 100 messages (prevents unbounded growth)
    // We fetch descending to get the latest, then reverse for display order
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (username, avatar_url, is_admin, can_customize_ai)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Fetch Messages Error:', error);
      return;
    }

    // Map sender profile data to message
    const messagesWithSender = (data || []).map((msg: any) => ({
      ...msg,
      senderUsername: msg.profiles?.username,
      senderAvatar: msg.profiles?.avatar_url,
      senderIsAdmin: msg.profiles?.is_admin || false,
      senderCanCustomizeAI: msg.profiles?.can_customize_ai || false,
      profiles: undefined // Remove nested object
    })).reverse(); // Reverse to show oldest first (we fetched in desc order for limit)

    set(state => ({
      messages: { ...state.messages, [channelId]: messagesWithSender }
    }));

    // Fetch reactions for these messages
    const messageIds = data?.map(m => m.id) || [];
    if (messageIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (reactionsData) {
        const groupedReactions: Record<string, MessageReaction[]> = {};
        reactionsData.forEach(r => {
          if (!groupedReactions[r.message_id]) groupedReactions[r.message_id] = [];
          groupedReactions[r.message_id].push(r);
        });
        set(state => ({ reactions: { ...state.reactions, ...groupedReactions } }));
      }
    }
  },

  sendMessage: async (channelId: string, content: string, attachmentFile?: File, replyToId?: string) => {
    const { currentUser, messages } = get();
    if (!currentUser) return;

    // 🛡️ DEDUPLICATION GUARD 🛡️
    // Check if the exact same message was sent to this channel in the last 2 seconds
    const channelMessages = messages[channelId] || [];
    const lastMsg = channelMessages[channelMessages.length - 1];
    if (lastMsg &&
      lastMsg.sender_id === currentUser.id &&
      lastMsg.content === content &&
      (new Date().getTime() - new Date(lastMsg.created_at).getTime() < 2000)) {
      console.warn('Duplicate message prevented by store guard:', content);
      return;
    }

    // Handle file upload if present
    let attachmentUrl = null;
    let attachmentType = null;

    if (attachmentFile) {
      const filePath = `${currentUser.id}/${Date.now()}_${attachmentFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dm_attachments')
        .upload(filePath, attachmentFile);

      if (uploadError) {
        console.error('File upload error:', uploadError);
      } else {
        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('dm_attachments')
          .getPublicUrl(uploadData.path);

        attachmentUrl = urlData.publicUrl;
        attachmentType = attachmentFile.type;
      }
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      channel_id: channelId,
      sender_id: currentUser.id,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      read: false,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId || undefined
    };

    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), optimisticMessage]
      }
    }));

    // Server insert
    const { data, error } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        sender_id: currentUser.id,
        content,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        reply_to_id: replyToId || null
      })
      .select()
      .single();

    // Reconcile optimistic with real
    if (data && !error) {
      set(state => ({
        messages: {
          ...state.messages,
          [channelId]: state.messages[channelId].map(m =>
            m.id === tempId ? data : m
          )
        }
      }));

      // Create notification for recipient
      // First, get the channel to find the recipient
      supabase
        .from('dm_channels')
        .select('user1_id, user2_id')
        .eq('id', channelId)
        .single()
        .then(async ({ data: channel }) => {
          if (channel) {
            // Recipient is the other user (not the sender)
            const recipientId = channel.user1_id === currentUser.id
              ? channel.user2_id
              : channel.user1_id;

            // Create notification for the recipient
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                recipient_id: recipientId,
                sender_id: currentUser.id,
                type: 'dm',
                title: `New message from ${currentUser.username}`,
                content: content.length > 50 ? content.substring(0, 50) + '...' : content,
                link_url: `#comms/${channelId}`,
                metadata: {
                  channel_id: channelId,
                  message_id: data.id
                }
              });

            if (notificationError) {
              console.error('❌ Failed to create DM notification:', notificationError);
            } else {
              console.log('✅ DM notification created');
            }
          }
        });
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticReaction: MessageReaction = {
      id: tempId,
      message_id: messageId,
      user_id: currentUser.id,
      emoji,
      created_at: new Date().toISOString()
    };

    set(state => ({
      reactions: {
        ...state.reactions,
        [messageId]: [...(state.reactions[messageId] || []), optimisticReaction]
      }
    }));

    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: currentUser.id,
        emoji
      })
      .select()
      .single();

    if (error) {
      console.error('Add Reaction Error:', error);
      // Revert optimistic update
      set(state => ({
        reactions: {
          ...state.reactions,
          [messageId]: state.reactions[messageId].filter(r => r.id !== tempId)
        }
      }));
    } else if (data) {
      // Replace temp ID with real ID
      set(state => {
        const currentList = state.reactions[messageId] || [];
        // Check if real ID already exists (from subscription)
        const exists = currentList.some(r => r.id === data.id);

        if (exists) {
          // Just remove the temp one, since real one is already there
          return {
            reactions: {
              ...state.reactions,
              [messageId]: currentList.filter(r => r.id !== tempId)
            }
          };
        }

        // Otherwise replace
        return {
          reactions: {
            ...state.reactions,
            [messageId]: currentList.map(r => r.id === tempId ? data : r)
          }
        };
      });
    }
  },

  removeReaction: async (reactionId: string) => {
    // Find the messageId for this reaction to update state
    const { reactions } = get();
    let messageId: string | undefined;

    for (const [msgId, msgReactions] of Object.entries(reactions)) {
      if (msgReactions.some(r => r.id === reactionId)) {
        messageId = msgId;
        break;
      }
    }

    if (messageId) {
      // Optimistic Update
      const previousReactions = reactions[messageId];
      set(state => ({
        reactions: {
          ...state.reactions,
          [messageId]: state.reactions[messageId].filter(r => r.id !== reactionId)
        }
      }));

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', reactionId);

      if (error) {
        console.error('Remove Reaction Error:', error);
        // Revert
        set(state => ({
          reactions: {
            ...state.reactions,
            [messageId!]: previousReactions
          }
        }));
      }
    }
  },

  setTyping: (channelId: string, isTyping: boolean) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const channelName = `typing:${channelId}`;
    const existingChannel = get().typingChannels[channelName];

    if (existingChannel) {
      existingChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUser.id, typing: isTyping }
      });
    } else {
      const channel = supabase.channel(channelName);
      channel
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const { user_id, typing } = payload;
          const currentTyping = get().typingUsers[channelId] || [];

          if (typing) {
            if (!currentTyping.includes(user_id)) {
              set({
                typingUsers: {
                  ...get().typingUsers,
                  [channelId]: [...currentTyping, user_id]
                }
              });
            }
          } else {
            set({
              typingUsers: {
                ...get().typingUsers,
                [channelId]: currentTyping.filter(id => id !== user_id)
              }
            });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'typing',
              payload: { user_id: currentUser.id, typing: isTyping }
            });
          }
        });

      set(state => ({
        typingChannels: { ...state.typingChannels, [channelName]: channel }
      }));
    }
  },

  setActiveChannel: (channelId: string | null) => {
    const prevChannelId = get().activeChannelId;

    if (prevChannelId && prevChannelId !== channelId) {
      const prevChannelName = `typing:${prevChannelId}`;
      const prevChannel = get().typingChannels[prevChannelName];
      if (prevChannel) {
        prevChannel.unsubscribe();
        set(state => {
          const { [prevChannelName]: removed, ...rest } = state.typingChannels;
          return { typingChannels: rest };
        });
      }
    }

    set({ activeChannelId: channelId });

    if (channelId) {
      get().fetchMessages(channelId);

      const currentUser = get().currentUser;
      if (currentUser) {
        supabase
          .from('messages')
          .update({ read: true })
          .eq('channel_id', channelId)
          .eq('read', false)
          .neq('sender_id', currentUser.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error marking messages as read:', error);
            } else {
              get().fetchDMChannels();
            }
          });
      }

      const channelName = `typing:${channelId}`;
      const existingChannel = get().typingChannels[channelName];

      if (!existingChannel) {
        const typingChannel = supabase.channel(channelName);
        typingChannel
          .on('broadcast', { event: 'typing' }, (payload: any) => {
            const { user_id, typing } = payload.payload;
            const currentTyping = get().typingUsers;

            if (typing) {
              set({
                typingUsers: {
                  ...currentTyping,
                  [channelId]: [...(currentTyping[channelId] || []), user_id].filter(
                    (id, idx, arr) => arr.indexOf(id) === idx
                  )
                }
              });
            } else {
              set({
                typingUsers: {
                  ...currentTyping,
                  [channelId]: (currentTyping[channelId] || []).filter(id => id !== user_id)
                }
              });
            }
          })
          .subscribe();

        set(state => ({
          typingChannels: { ...state.typingChannels, [channelName]: typingChannel }
        }));
      }
    }
  },

  deleteMessage: async (messageId: string, channelId: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !msg) {
      console.error('Failed to fetch message:', fetchError);
      const { toast } = await import('../lib/toast');
      toast.error('Failed to delete message');
      return;
    }

    if (msg.sender_id !== currentUser.id) {
      const { toast } = await import('../lib/toast');
      toast.error('Can only delete your own messages');
      return;
    }

    const daysSinceSent = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSent > 7) {
      const { toast } = await import('../lib/toast');
      toast.error('Cannot delete messages older than 7 days');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error('Delete message error:', error);
      const { toast } = await import('../lib/toast');
      toast.error('Failed to delete message');
      return;
    }

    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: state.messages[channelId]?.map(m =>
          m.id === messageId ? { ...m, deleted_at: new Date().toISOString() } : m
        ) || []
      }
    }));

    const { toast } = await import('../lib/toast');
    toast.success('Message deleted');
  },

  editMessage: async (messageId: string, channelId: string, newContent: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !msg) {
      console.error('Failed to fetch message:', fetchError);
      return;
    }

    if (msg.sender_id !== currentUser.id) {
      const { toast } = await import('../lib/toast');
      toast.error('Can only edit your own messages');
      return;
    }

    const minutesSinceSent = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60);
    if (minutesSinceSent > 5) {
      const { toast } = await import('../lib/toast');
      toast.error('Cannot edit messages older than 5 minutes');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Edit message error:', error);
      const { toast } = await import('../lib/toast');
      toast.error('Failed to edit message');
      return;
    }

    set(state => ({
      messages: {
        ...state.messages,
        [channelId]: state.messages[channelId]?.map(m =>
          m.id === messageId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m
        ) || []
      }
    }));

    const { toast } = await import('../lib/toast');
    toast.success('Message edited');
  },

  hideChannel: async (channelId: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { error } = await supabase
      .from('user_hidden_channels')
      .insert({ user_id: currentUser.id, channel_id: channelId });

    if (error) {
      console.error('Hide channel error:', error);
      const { toast } = await import('../lib/toast');
      toast.error('Failed to delete chat');
      return;
    }

    set(state => ({
      dmChannels: state.dmChannels.filter(ch => ch.id !== channelId),
      activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId
    }));

    const { toast } = await import('../lib/toast');
    toast.success('Chat deleted');
  },

  toggleReadReceipts: async (channelId: string, enabled: boolean) => {
    set(state => ({
      dmChannels: state.dmChannels.map(ch =>
        ch.id === channelId ? { ...ch, read_receipts_enabled: enabled } : ch
      )
    }));

    const { error } = await supabase
      .from('dm_channels')
      .update({ read_receipts_enabled: enabled })
      .eq('id', channelId);

    if (error) {
      console.error('Toggle read receipts error:', error);
      set(state => ({
        dmChannels: state.dmChannels.map(ch =>
          ch.id === channelId ? { ...ch, read_receipts_enabled: !enabled } : ch
        )
      }));
      const { toast } = await import('../lib/toast');
      toast.error('Failed to update read receipts');
    } else {
      const { toast } = await import('../lib/toast');
      toast.success(`Read receipts ${enabled ? 'enabled' : 'disabled'}`);
    }
  },

  toggleCommsPanel: () => {
    set(state => ({ commsPanelOpen: !state.commsPanelOpen }));
  },

  dismissMessageToast: () => {
    set({ messageToast: null });
  },

  dismissPersistentBanner: (bannerId: string) => {
    set(state => ({
      persistentBanners: state.persistentBanners.filter(b => b.id !== bannerId)
    }));
  },

  setReplyingTo: (message: Message | null) => {
    set({ replyingTo: message });
  },



  // ============================================
  // ECONOMY ACTIONS
  // ============================================
  claimPassivePoints: async () => {
    const { currentUser } = get();
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    const { data, error } = await supabase.rpc('claim_passive_points');
    if (error) {
      if (missingTable(error, 'claim_passive_points')) {
        console.warn('Passive points RPC missing; skipping.');
        return { success: false, error: 'Not available' };
      }
      return { success: false, error: error.message };
    }
    const earned = data ?? 0;
    set(state => {
      const newTotal = (state.orbitPoints || 0) + earned;
      return {
        orbitPoints: newTotal,
        currentUser: state.currentUser ? {
          ...state.currentUser,
          orbit_points: newTotal,
          points: newTotal
        } : state.currentUser
      };
    });
    return { success: true, earned };
  },

  loadShop: async () => {
    const { data, error } = await supabase.from('shop_items').select('*').order('price', { ascending: true });
    if (error) {
      if (missingTable(error, 'public.shop_items')) {
        console.warn('Shop table missing; skipping.');
        return;
      }
      console.error('Load Shop Error:', error);
      return;
    }
    set({ shopItems: data || [] });
  },

  loadInventory: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const { data, error } = await supabase
      .from('user_inventory')
      .select('id, item_id, equipped, slot, shop_items(*)')
      .eq('user_id', currentUser.id);
    if (error) {
      if (missingTable(error, 'public.user_inventory')) {
        console.warn('Inventory table missing; skipping.');
        return;
      }
      console.error('Load Inventory Error:', error);
      return;
    }
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      item_id: row.item_id,
      equipped: row.equipped,
      slot: row.slot,
      item: row.shop_items
    }));
    set({ inventoryItems: mapped });
    get().applyEquippedCursor?.(mapped);
  },

  purchaseItem: async (itemId: string) => {
    const { currentUser } = get();
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('purchase_item', {
      p_user: currentUser.id,
      p_item: itemId
    });
    if (error) {
      console.error('Purchase Error:', error);
      return { success: false, error: error.message };
    }

    // Refresh shop + inventory + balance
    await Promise.all([get().loadInventory(), get().loadShop()]);
    set({ orbitPoints: data ?? get().orbitPoints });
    return { success: true };
  },

  equipItem: async (itemId: string) => {
    const { currentUser } = get();
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.rpc('equip_item', {
      p_user: currentUser.id,
      p_item: itemId
    });

    if (error) {
      console.error('Equip Error:', error);
      return { success: false, error: error.message };
    }

    await get().loadInventory();
    get().applyEquippedCursor?.();
    return { success: true };
  },

  updateOrbitPoints: (points: number) => {
    set({ orbitPoints: points });
    // Also update currentUser.orbit_points for consistency
    const { currentUser } = get();
    if (currentUser) {
      set({
        currentUser: {
          ...currentUser,
          orbit_points: points,
          points: points // Update legacy alias too
        }
      });
    }
  },

  // ============================================
  // NOTIFICATION ACTIONS
  // ============================================
  fetchNotifications: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) {
      if (missingTable(error, 'public.notifications')) {
        console.warn('Notifications table missing; skipping.');
        return;
      }
      console.error('Fetch Notifications Error:', error);
      return;
    }
    const unreadCount = (data || []).filter((n: any) => !n.is_read).length;
    set({ notifications: data || [], unreadCount });
  },

  markNotificationRead: async (id: string) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('recipient_id', currentUser.id);
    if (error) {
      console.error('Mark Notification Error:', error);
      return;
    }
    set(state => {
      const updated = state.notifications.map((n: any) => n.id === id ? { ...n, is_read: true } : n);
      return { notifications: updated, unreadCount: updated.filter((n: any) => !n.is_read).length };
    });
  },

  markAllNotificationsRead: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', currentUser.id);
    if (error) {
      console.error('Mark All Notifications Error:', error);
      return;
    }
    set(state => ({
      notifications: state.notifications.map((n: any) => ({ ...n, is_read: true })),
      unreadCount: 0
    }));
  },

  // ============================================
  // PHASE 6: SCHEDULE ACTIONS
  // ============================================
  fetchSchedule: async () => {
    try {
      const { data, error } = await supabase
        .from('school_schedule')
        .select('*')
        .eq('is_enabled', true)
        .order('period_number', { ascending: true });

      if (error) {
        if (missingTable(error, 'public.school_schedule')) {
          console.warn('⚠️ Schedule table missing - run sql/create_school_schedule.sql');
          return;
        }
        console.error('❌ Fetch schedule error:', error);
        return;
      }

      set({ schedule: data || [] });
      console.log('✅ Schedule loaded:', data?.length || 0, 'periods');
    } catch (err) {
      console.error('❌ Fetch schedule exception:', err);
    }
  },

  updatePeriod: async (period: Period) => {
    try {
      const { error } = await supabase
        .from('school_schedule')
        .upsert(period, { onConflict: 'id' });

      if (error) {
        console.error('❌ Update period error:', error);
        return;
      }

      await get().fetchSchedule();
      console.log('✅ Period updated:', period.period_label);
    } catch (err) {
      console.error('❌ Update period exception:', err);
    }
  },

  deletePeriod: async (periodId: string) => {
    try {
      const { error } = await supabase
        .from('school_schedule')
        .delete()
        .eq('id', periodId);

      if (error) {
        console.error('❌ Delete period error:', error);
        return;
      }

      await get().fetchSchedule();
      console.log('✅ Period deleted');
    } catch (err) {
      console.error('❌ Delete period exception:', err);
    }
  },

  addPeriod: async (period: Omit<Period, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('school_schedule')
        .insert(period);

      if (error) {
        console.error('❌ Add period error:', error);
        return;
      }

      await get().fetchSchedule();
      console.log('✅ Period added:', period.period_label);
    } catch (err) {
      console.error('❌ Add period exception:', err);
    }
  },

  // ============================================
  // PHASE 7: GAMES ACTIONS (POKER)
  // ============================================

  fetchPokerLobbyGames: async () => {
    set({ isPokerLoading: true });
    try {
      const { data, error } = await supabase
        .from('poker_games')
        .select(`
          id,
          host_user_id,
          game_type,
          ai_difficulty,
          buy_in,
          max_players,
          current_players,
          status,
          created_at,
          profiles:host_user_id (username, avatar_url)
        `)
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        if (missingTable(error, 'public.poker_games')) {
          console.warn('Poker tables missing - run sql/poker_schema.sql');
          return;
        }
        throw error;
      }

      const games: PokerLobbyGame[] = (data || []).map((g: any) => ({
        id: g.id,
        host_username: g.profiles?.username || 'Unknown',
        host_avatar: g.profiles?.avatar_url,
        game_type: g.game_type,
        ai_difficulty: g.ai_difficulty,
        buy_in: g.buy_in,
        max_players: g.max_players,
        current_players: g.current_players,
        status: g.status,
        created_at: g.created_at
      }));

      set({ pokerLobbyGames: games });
    } catch (err) {
      console.error('❌ Fetch poker games error:', err);
    } finally {
      set({ isPokerLoading: false });
    }
  },

  createPokerGame: async (buyIn, maxPlayers, gameType = 'practice', aiDifficulty) => {
    const { currentUser, orbitPoints } = get();
    if (!currentUser) return { gameId: null, error: 'Not authenticated' };

    // Check funds with -200 minimum balance
    const MIN_BALANCE = -200;
    const balanceAfterBuyIn = orbitPoints - buyIn;

    if (balanceAfterBuyIn < MIN_BALANCE) {
      const maxAllowedBuyIn = orbitPoints - MIN_BALANCE;
      console.error(`❌ Insufficient funds: Balance would be ${balanceAfterBuyIn} (min: ${MIN_BALANCE})`);
      return {
        gameId: null,
        error: `Insufficient funds. Your balance would drop to ${balanceAfterBuyIn} (minimum: ${MIN_BALANCE}). Maximum buy-in: ${maxAllowedBuyIn}`
      };
    }

    try {
      // 1. Initialize Deck & Deal to Host
      let deck = createDeck();
      const { cards: hostCards, remainingDeck: deckAfterHost } = dealCards(deck, 2);
      deck = deckAfterHost; // Update tracking deck

      // Create game
      const { data: game, error: gameError } = await supabase
        .from('poker_games')
        .insert({
          host_user_id: currentUser.id,
          game_type: gameType,
          ai_difficulty: aiDifficulty,
          buy_in: buyIn,
          max_players: maxPlayers,
          current_players: 1,
          status: 'waiting',
          pot_amount: 0,
          dealer_position: 0,
          small_blind: 5,
          big_blind: 10,
          deck: deck // Save remaining deck (will be updated after bots too)
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Join as player (host) with cards
      const { data: hostPlayer, error: playerError } = await supabase
        .from('poker_game_players')
        .insert({
          game_id: game.id,
          user_id: currentUser.id,
          position: 0,
          chips: buyIn,
          is_ai: false,
          hole_cards: hostCards as any // Save hole cards
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // Deduct buy-in
      const { error: fundError } = await supabase
        .from('profiles')
        .update({ orbit_points: orbitPoints - buyIn })
        .eq('id', currentUser.id);

      if (fundError) {
        console.error('Failed to deduct funds:', fundError);
        // Should rollback game creation here ideally
      } else {
        get().updateOrbitPoints(orbitPoints - buyIn);
      }

      // If practice mode, add AI players immediately
      if (gameType === 'practice' && aiDifficulty) {
        // Add 3 AI players for a 4-player game
        const aiPlayers = [
          { name: 'Bot 1', pos: 1 },
          { name: 'Bot 2', pos: 2 },
          { name: 'Bot 3', pos: 3 }
        ];

        for (const ai of aiPlayers) {
          // Deal to bot
          const { cards: botCards, remainingDeck: deckAfterBot } = dealCards(deck, 2);
          deck = deckAfterBot;

          await supabase.from('poker_game_players').insert({
            game_id: game.id,
            is_ai: true,
            ai_name: ai.name,
            position: ai.pos,
            chips: buyIn,
            hole_cards: botCards as any // Save hole cards
          });
        }

        // Update Deck in Game (after all dealing)
        await supabase.from('poker_games').update({ deck: deck }).eq('id', game.id);

        // Update player count and START GAME
        const sbAmount = game.small_blind;
        const bbAmount = game.big_blind;

        // Post Blinds (Update SB and BB players)
        // Update SB (Pos 1) - Bot 1
        const sbUpdate = await supabase.from('poker_game_players')
          .update({
            chips: buyIn - sbAmount,
            current_bet: sbAmount
          })
          .eq('game_id', game.id)
          .eq('position', 1)
          .select();
        console.log('💰 SB Posted:', sbUpdate.data);

        // Update BB (Pos 2) - Bot 2
        const bbUpdate = await supabase.from('poker_game_players')
          .update({
            chips: buyIn - bbAmount,
            current_bet: bbAmount
          })
          .eq('game_id', game.id)
          .eq('position', 2)
          .select();
        console.log('💰 BB Posted:', bbUpdate.data);

        // Get UTG Player (Pos 3) for 4-player game
        const { data: utgPlayer } = await supabase
          .from('poker_game_players')
          .select('id')
          .eq('game_id', game.id)
          .eq('position', 3)
          .single();

        await supabase
          .from('poker_games')
          .update({
            current_players: 4,
            status: 'in_progress',
            current_turn_player_id: utgPlayer?.id || hostPlayer.id, // Start with UTG (Bot 3)
            pot_amount: sbAmount + bbAmount
          })
          .eq('id', game.id);
      }

      await get().fetchPokerLobbyGames();

      // Auto-join/subscribe to the game
      get().subscribeToPokerGame(game.id);

      return { gameId: game.id, error: null };
    } catch (err: any) {
      console.error('❌ Create poker game error:', err);
      return { gameId: null, error: err.message || 'Unknown error' };
    }
  },

  joinPokerGame: async (gameId) => {
    const { currentUser, orbitPoints } = get();
    if (!currentUser) return false;

    try {
      // Get game details
      const { data: game, error: gameError } = await supabase
        .from('poker_games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError || !game) throw gameError || new Error('Game not found');

      // Check funds with -200 minimum balance
      const MIN_BALANCE = -200;
      const balanceAfterBuyIn = orbitPoints - game.buy_in;

      if (balanceAfterBuyIn < MIN_BALANCE) {
        const maxAllowedBuyIn = orbitPoints - MIN_BALANCE;
        console.error(`❌ Insufficient funds: Balance would be ${balanceAfterBuyIn} (min: ${MIN_BALANCE})`);
        console.error(`💡 Maximum buy-in you can afford: ${maxAllowedBuyIn}`);
        return false;
      }

      // Check if already joined
      const { data: existingPlayer } = await supabase
        .from('poker_game_players')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', currentUser.id)
        .single();

      if (existingPlayer) {
        get().subscribeToPokerGame(gameId);
        return true; // Already joined
      }

      // Find open position
      const { data: players } = await supabase
        .from('poker_game_players')
        .select('position')
        .eq('game_id', gameId);

      const takenPositions = (players || []).map((p: any) => p.position);
      let openPosition = -1;
      for (let i = 0; i < game.max_players; i++) {
        if (!takenPositions.includes(i)) {
          openPosition = i;
          break;
        }
      }

      if (openPosition === -1) return false; // Full

      // Join game
      const { error: joinError } = await supabase
        .from('poker_game_players')
        .insert({
          game_id: gameId,
          user_id: currentUser.id,
          position: openPosition,
          chips: game.buy_in,
          is_ai: false
        });

      if (joinError) throw joinError;

      // Deduct buy-in
      await supabase
        .from('profiles')
        .update({ orbit_points: orbitPoints - game.buy_in })
        .eq('id', currentUser.id);

      get().updateOrbitPoints(orbitPoints - game.buy_in);

      // Update player count
      await supabase.rpc('increment_poker_players', { game_id: gameId });

      get().subscribeToPokerGame(gameId);
      return true;
    } catch (err) {
      console.error('❌ Join poker game error:', err);
      return false;
    }
  },

  leavePokerGame: async (gameId) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      // Get player stats to refund chips if game not started or cash out if leaving
      // For simplicity in MVP: Forfeit if in progress, refund if waiting
      // Real implementation needs complex cashout logic

      await supabase
        .from('poker_game_players')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', currentUser.id);

      // Update player count
      await supabase.rpc('decrement_poker_players', { game_id: gameId });

      set({ activePokerGame: null });
      get().unsubscribeFromPokerGame(gameId);
    } catch (err) {
      console.error('❌ Leave poker game error:', err);
    }
  },

  // Cash out current chips to Orbit Points and leave table
  cashOutAndLeave: async (gameId) => {
    const { currentUser, activePokerGame, orbitPoints, updateOrbitPoints } = get();
    if (!currentUser) return false;
    if (!activePokerGame || activePokerGame.game.id !== gameId) return false;

    const player = activePokerGame.players.find(p => p.user_id === currentUser.id);
    if (!player) return false;

    // Payout is whatever chips remain in front of the player (no rebuy profit/loss tracking here)
    const payout = Math.max(0, player.chips);

    try {
      // Credit wallet
      const { error: creditErr } = await supabase
        .from('profiles')
        .update({ orbit_points: orbitPoints + payout })
        .eq('id', currentUser.id);
      if (creditErr) {
        console.error('❌ Cash out credit failed:', creditErr);
        return false;
      }
      updateOrbitPoints(orbitPoints + payout);

      // Remove player from table
      await supabase
        .from('poker_game_players')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', currentUser.id);

      await supabase.rpc('decrement_poker_players', { game_id: gameId });

      set({ activePokerGame: null });
      get().unsubscribeFromPokerGame(gameId);

      console.log('✅ Cash out complete and left game', { gameId, payout });
      return true;
    } catch (err) {
      console.error('❌ Cash out error:', err);
      return false;
    }
  },

  rebuyPokerPlayer: async (gameId: string, amount?: number) => {
    const { currentUser, orbitPoints, activePokerGame, updateOrbitPoints } = get();
    if (!currentUser) return false;
    if (!activePokerGame || activePokerGame.game.id !== gameId) return false;
    // Prevent mid-hand rebuy to avoid chip reset exploits
    if (activePokerGame.game.status === 'in_progress') {
      console.warn('Rebuy blocked: hand in progress');
      return false;
    }

    const buyIn = amount ?? activePokerGame.game.buy_in;
    const MIN_BALANCE = -200;
    const newBalance = orbitPoints - buyIn;

    if (newBalance < MIN_BALANCE) {
      console.error('❌ Rebuy denied: insufficient Orbit Points', { balance: orbitPoints, cost: buyIn, min: MIN_BALANCE });
      return false;
    }

    try {
      // Deduct funds
      const { error: fundError } = await supabase
        .from('profiles')
        .update({ orbit_points: newBalance })
        .eq('id', currentUser.id);
      if (fundError) {
        console.error('❌ Rebuy fund update failed:', fundError);
        return false;
      }
      updateOrbitPoints(newBalance);

      // Reset chips and flags for this player
      const { error: playerError } = await supabase
        .from('poker_game_players')
        .update({
          chips: buyIn,
          current_bet: 0,
          is_folded: false,
          is_all_in: false
        })
        .eq('game_id', gameId)
        .eq('user_id', currentUser.id);

      if (playerError) {
        console.error('❌ Rebuy player update failed:', playerError);
        return false;
      }

      // Optimistic local state update
      const updatedPlayers = (activePokerGame.players || []).map(p =>
        p.user_id === currentUser.id
          ? { ...p, chips: buyIn, current_bet: 0, is_folded: false, is_all_in: false, is_busted: false }
          : p
      );

      set({
        activePokerGame: {
          ...activePokerGame,
          players: updatedPlayers
        }
      });

      // If the table is waiting and we now have 2+ funded players, restart next hand
      const activeCount = updatedPlayers.filter(p => (p.chips || 0) > 0).length;
      if (activeCount >= 2 && activePokerGame.game.status === 'waiting') {
        await get().startNextHand(gameId);
      }

      return true;
    } catch (err) {
      console.error('❌ Rebuy error:', err);
      return false;
    }
  },

  adminDeletePokerGame: async (gameId: string) => {
    const { currentUser } = get();
    if (!currentUser?.is_admin) {
      console.error('❌ Admin access required to delete games');
      return;
    }

    try {
      // Delete all players first (FK constraint)
      await supabase.from('poker_game_players').delete().eq('game_id', gameId);
      // Delete all actions
      await supabase.from('poker_actions').delete().eq('game_id', gameId);
      // Delete the game
      const { error } = await supabase.from('poker_games').delete().eq('id', gameId);

      if (error) throw error;

      // Refresh lobby
      get().fetchPokerLobbyGames();
      console.log(`🗑️ Game ${gameId} deleted by admin`);
    } catch (err) {
      console.error('❌ Admin delete game error:', err);
    }
  },

  processAITurn: async (gameId: string, aiPlayerId: string) => {
    const { activePokerGame, currentUser } = get();
    if (!activePokerGame || activePokerGame.game.id !== gameId) return;

    // God Mode: Either explicitly set via `expert_god` difficulty, OR expert + permission
    const hasGemini3Permission = currentUser?.unlocked_models?.includes('gemini-3-pro');
    const isExplicitGodMode = activePokerGame.game.ai_difficulty === 'expert_god';
    const useGodMode = isExplicitGodMode || (hasGemini3Permission && activePokerGame.game.ai_difficulty === 'expert');

    // Short delay for realism (reduced since we have multi-model support with high RPM)
    const delay = useGodMode ? 2000 :
      activePokerGame.game.ai_difficulty === 'expert' ? 1500 :
        activePokerGame.game.ai_difficulty === 'novice' ? 1000 : 1200;

    console.log(`⏱️ AI turn delay: ${delay / 1000}s${useGodMode ? ' (GOD MODE)' : ''}`);
    await new Promise(resolve => setTimeout(resolve, delay));

    const currentPlayer = activePokerGame.players.find(p => p.id === aiPlayerId);
    if (!currentPlayer || !currentPlayer.hole_cards) return;

    // Build game state for AI
    const gameState = {
      potAmount: activePokerGame.game.pot_amount,
      currentRound: activePokerGame.game.current_round || 'pre_flop',
      communityCards: (activePokerGame.game.community_cards || []).map((c: any) =>
        typeof c === 'string' ? c : `${c.rank}${c.suit}`
      ),
      highestBet: Math.max(...activePokerGame.players.map(p => p.current_bet || 0)),
      bigBlind: activePokerGame.game.big_blind,
      players: activePokerGame.players.map(p => ({
        name: p.username || p.ai_name || 'Unknown',
        chips: p.chips,
        currentBet: p.current_bet || 0,
        isFolded: p.is_folded || false,
        isAllIn: p.is_all_in || false,
        isAI: p.is_ai || false
      }))
    };

    // Import the AI decision maker dynamically to avoid circular deps
    const { makePokerDecision } = await import('../lib/poker/aiPlayer');

    // Get AI decision using Gemini (with god mode if permitted)
    const decision = await makePokerDecision(
      currentPlayer,
      currentPlayer.hole_cards,
      gameState,
      activePokerGame.game.ai_difficulty || 'intermediate',
      useGodMode
    );

    // Store reasoning for UI display
    set({
      lastPokerAIReasoning: {
        playerId: currentPlayer.id,
        name: currentPlayer.ai_name || currentPlayer.username || 'AI',
        action: decision.action,
        amount: decision.amount,
        reasoning: decision.reasoning || '',
        round: gameState.currentRound
      }
    });

    // Execute the decision
    console.log(`🤖 AI ${currentPlayer.ai_name} plays: ${decision.action} ${decision.amount}`);
    await get().performPokerAction(gameId, decision.action, decision.amount, currentPlayer.id);
  },

  performPokerAction: async (gameId, action, amount, playerId) => {
    const { currentUser, activePokerGame } = get();
    // Allow action if currentUser is present OR if playerId (AI) is provided
    if (!activePokerGame) return false;

    try {
      let player = null;
      if (playerId) {
        player = activePokerGame.players.find(p => p.id === playerId);
      } else if (currentUser) {
        player = activePokerGame.players.find(p => p.user_id === currentUser.id);
      }

      if (!player) {
        console.error('❌ Player not found for action:', { gameId, action, playerId, currentUserId: currentUser?.id });
        return false;
      }

      // Hard guard: only the player whose turn it is may act (covers stale state after reconnects)
      const isPlayerTurn = activePokerGame.game.current_turn_player_id === player.id;
      if (!isPlayerTurn) {
        console.warn('⏳ Action ignored because it is not this player turn', {
          gameId,
          attemptingPlayerId: player.id,
          currentTurnPlayerId: activePokerGame.game.current_turn_player_id,
          action
        });
        return false;
      }

      const currentRound = activePokerGame.game.current_round || 'pre_flop';
      const bigBlind = activePokerGame.game.big_blind || 0;
      const activePlayers = activePokerGame.players.filter(p => !p.is_folded);
      const highestBet = Math.max(...activePlayers.map(p => p.current_bet || 0), 0);
      const currentBet = player.current_bet || 0;
      const stack = player.chips;

      // Normalize action to legal alternative if input is inconsistent with state
      let normalizedAction = action;
      const minRaiseTotal = Math.max(highestBet + bigBlind, highestBet + 1); // require at least +1 over highest bet

      if (normalizedAction === 'check' && highestBet > currentBet) {
        normalizedAction = 'call';
      }

      if (normalizedAction === 'raise') {
        const targetBetInput = amount ?? minRaiseTotal;
        const targetBet = Math.max(targetBetInput, minRaiseTotal);
        if (targetBet <= highestBet) {
          normalizedAction = 'call';
        }
      }

      let wager = 0;
      let chipsUpdate: Partial<PokerGamePlayer> = {};

      switch (normalizedAction) {
        case 'fold':
          chipsUpdate = { is_folded: true };
          break;
        case 'check':
          // No chip movement
          break;
        case 'call': {
          const callCost = Math.max(0, amount ?? (highestBet - currentBet));
          wager = Math.min(callCost, stack);
          const newChips = stack - wager;
          chipsUpdate = {
            chips: newChips,
            current_bet: currentBet + wager,
            is_all_in: newChips <= 0
          };
          break;
        }
        case 'raise': {
          // `amount` represents the target total bet for this player
          const targetBetInput = amount ?? minRaiseTotal;
          const targetBet = Math.max(targetBetInput, minRaiseTotal);
          const raiseContribution = Math.max(0, targetBet - currentBet);
          wager = Math.min(raiseContribution, stack);
          const newChips = stack - wager;
          chipsUpdate = {
            chips: newChips,
            current_bet: currentBet + wager,
            is_all_in: newChips <= 0
          };
          break;
        }
        case 'all_in': {
          wager = stack;
          chipsUpdate = {
            chips: 0,
            current_bet: currentBet + wager,
            is_all_in: true
          };
          break;
        }
      }

      // Insert action
      const { error } = await supabase
        .from('poker_actions')
        .insert({
          game_id: gameId,
          player_id: player.id,
          action_type: normalizedAction,
          amount: wager,
          round: currentRound
        });

      if (error) throw error;

      // UPDATE GAME STATE (Client-side logic for MVP)
      // 1. Update Player State
      if (Object.keys(chipsUpdate).length > 0) {
        await supabase
          .from('poker_game_players')
          .update(chipsUpdate)
          .eq('id', player.id);
      }

      // OPTIMISTIC UPDATE: Update local state immediately so checkRoundComplete sees the new bet
      const updatedPlayers = activePokerGame.players.map(p =>
        p.id === player.id
          ? { ...p, ...chipsUpdate }
          : p
      );

      const newPot = activePokerGame.game.pot_amount + wager;

      const updatedGame = {
        ...activePokerGame,
        game: {
          ...activePokerGame.game,
          pot_amount: newPot
        },
        players: updatedPlayers,
        // Optimistically add action for checkRoundComplete logic
        actions: [
          ...(activePokerGame.actions || []),
          {
            id: 'temp-' + Date.now(),
            game_id: gameId,
            player_id: player.id,
            action_type: normalizedAction,
            amount: wager,
            round: currentRound,
            created_at: new Date().toISOString()
          } as PokerAction
        ]
      };

      set({ activePokerGame: updatedGame });

      // Update Pot and Last Action (Always)
      await supabase.from('poker_games').update({
        pot_amount: newPot
        // last_action cols removed as they don't exist in schema
      }).eq('id', gameId);

      // Now check round complete with updated state
      const isRoundComplete = get().checkRoundComplete(gameId);
      console.log(`🔄 Round complete check: ${isRoundComplete}`, {
        playerBets: get().activePokerGame?.players.map(p => ({ name: p.username || p.ai_name, bet: p.current_bet, folded: p.is_folded }))
      });

      if (isRoundComplete) {
        // Advance to next stage (Flop, Turn, River)
        console.log('🎯 Advancing to next stage...');
        await get().advanceGameStage(gameId);
      } else {
        // Rotate turn
        const nextTurnPlayerId = get().getNextActivePlayerId(gameId, player.position);
        console.log(`🔀 Next turn: ${nextTurnPlayerId} (from position ${player.position})`);
        if (nextTurnPlayerId) {
          await supabase.from('poker_games').update({
            current_turn_player_id: nextTurnPlayerId
          }).eq('id', gameId);

          // OPTIMISTIC UPDATE: Turn
          const afterTurnGame = {
            ...get().activePokerGame!,
            game: {
              ...get().activePokerGame!.game,
              current_turn_player_id: nextTurnPlayerId
            }
          };
          set({ activePokerGame: afterTurnGame });
        }

        // If we couldn't find a next player (everyone folded/all-in), advance the stage
        if (!nextTurnPlayerId) {
          console.log('No next turn player, advancing stage');
          await get().advanceGameStage(gameId);
          return true;
        }

        // Trigger AI if next player is AI (Using ID)
        const nextPlayer = get().activePokerGame?.players.find(p => p.id === nextTurnPlayerId);
        if (nextPlayer && nextPlayer.is_ai) {
          get().processAITurn(gameId, nextPlayer.id);
        }
      }

      return true;
    } catch (err) {
      console.error('❌ Action error:', err);
      // Rollback optimistic update by re-subscribing
      get().subscribeToPokerGame(gameId);
      throw err;
    }
  },

  subscribeToPokerGame: (gameId) => {
    const { currentUser } = get();

    // Unsubscribe from any existing game first
    const existingChannels = supabase.getChannels();
    existingChannels.forEach(ch => {
      if (ch.topic.includes('poker:')) supabase.removeChannel(ch);
    });

    // 1. Game State Channel
    const gameChannel = supabase.channel(`poker: game:${gameId} `)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_games',
        filter: `id = eq.${gameId} `
      }, (payload: any) => {
        const current = get().activePokerGame;
        if (current && payload.new) {
          set({
            activePokerGame: {
              ...current,
              game: payload.new as PokerGame
            }
          });
        }
      })
      .subscribe();

    // 2. Players Channel
    const playersChannel = supabase.channel(`poker: players:${gameId} `)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_game_players',
        filter: `game_id = eq.${gameId} `
      }, async () => {
        // Refetch all players to ensure consistency
        const { data } = await supabase
          .from('poker_game_players')
          .select(`
        *,
        profiles: user_id(username, avatar_url)
          `)
          .eq('game_id', gameId);

        if (data) {
          const mappedPlayers: PokerGamePlayer[] = data.map((p: any) => ({
            ...p,
            username: p.profiles?.username || p.ai_name || 'Unknown',
            avatar: p.profiles?.avatar_url
          }));

          const current = get().activePokerGame;
          if (current) {
            set({
              activePokerGame: {
                ...current,
                players: mappedPlayers
              }
            });
          }
        }
      })
      .subscribe();

    // 3. Actions Channel
    const actionsChannel = supabase.channel(`poker: actions:${gameId} `)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'poker_actions',
        filter: `game_id = eq.${gameId} `
      }, (payload: any) => {
        const current = get().activePokerGame;
        if (current) {
          set({
            activePokerGame: {
              ...current,
              actions: [...current.actions, payload.new as PokerAction]
            }
          });
        }
      })
      .subscribe();

    // Initial fetch
    (async () => {
      const [gameRes, playersRes, actionsRes] = await Promise.all([
        supabase.from('poker_games').select('*').eq('id', gameId).single(),
        supabase.from('poker_game_players').select('*, profiles:user_id(username, avatar_url)').eq('game_id', gameId),
        supabase.from('poker_actions').select('*').eq('game_id', gameId).order('created_at', { ascending: true })
      ]);

      if (gameRes.data && playersRes.data) {
        const mappedPlayers: PokerGamePlayer[] = playersRes.data.map((p: any) => ({
          ...p,
          username: p.profiles?.username || p.ai_name || 'Unknown',
          avatar: p.profiles?.avatar_url
        }));

        set({
          activePokerGame: {
            game: gameRes.data as PokerGame,
            players: mappedPlayers,
            actions: (actionsRes.data || []) as PokerAction[]
          }
        });

        // Check if it's currently an AI's turn (e.g. after refresh or load)
        const game = gameRes.data;
        if (game.status === 'in_progress' && game.current_turn_player_id) {
          // game.current_turn_player_id is now a PLAYER ROW ID.
          const currentPlayer = mappedPlayers.find(p => p.id === game.current_turn_player_id);
          if (currentPlayer && currentPlayer.is_ai) {
            get().processAITurn(game.id, currentPlayer.id);
          }
        }
      }
    })();
  },

  unsubscribeFromPokerGame: (gameId) => {
    supabase.removeChannel(supabase.channel(`poker: game:${gameId} `));
    supabase.removeChannel(supabase.channel(`poker: players:${gameId} `));
    supabase.removeChannel(supabase.channel(`poker: actions:${gameId} `));
    set({ activePokerGame: null });
  },

  // =============================================
  // POKER ANIMATION MANAGEMENT
  // =============================================

  addPokerAnimation: (animation: PokerAnimation) => {
    set((state) => ({
      pokerAnimationQueue: [...state.pokerAnimationQueue, animation].sort(
        (a, b) => b.priority - a.priority
      )
    }));
    // Auto-process if not currently animating
    if (!get().isAnimationLocked && !get().currentAnimatingAction) {
      get().processAnimationQueue();
    }
  },

  processAnimationQueue: () => {
    const { pokerAnimationQueue, isAnimationLocked } = get();

    // Don't process if already animating or queue is empty
    if (isAnimationLocked || pokerAnimationQueue.length === 0) {
      return;
    }

    // Get next animation
    const nextAnimation = pokerAnimationQueue[0];

    // Lock animations and set current action
    set({
      isAnimationLocked: true,
      currentAnimatingAction: nextAnimation.type,
      currentPokerAnimation: nextAnimation
    });

    // Remove from queue
    set((state) => ({
      pokerAnimationQueue: state.pokerAnimationQueue.slice(1)
    }));

    // Schedule unlock after animation duration
    setTimeout(() => {
      set({
        isAnimationLocked: false,
        currentAnimatingAction: null,
        currentPokerAnimation: null
      });
      // Process next animation if any
      if (get().pokerAnimationQueue.length > 0) {
        get().processAnimationQueue();
      }
    }, nextAnimation.duration);
  },

  skipCurrentAnimation: () => {
    // Immediately unlock and clear current action
    set({
      isAnimationLocked: false,
      currentAnimatingAction: null,
      currentPokerAnimation: null
    });
    // Process next animation if any
    if (get().pokerAnimationQueue.length > 0) {
      get().processAnimationQueue();
    }
  },

  clearAnimationQueue: () => {
    set({
      pokerAnimationQueue: [],
      isAnimationLocked: false,
      currentAnimatingAction: null,
      currentPokerAnimation: null
    });
  },

  getNextActivePlayerId: (gameId: string, currentPosition: number) => {
    const { activePokerGame } = get();
    if (!activePokerGame) return null;

    // Sort only the seated players; skip empty seats so turn order doesn’t bounce to gaps
    const sortedPlayers = [...activePokerGame.players]
      .filter(p => !p.is_folded && !p.is_all_in) // only actionable
      .sort((a, b) => a.position - b.position);

    if (sortedPlayers.length === 0) return null;

    const currentIdx = sortedPlayers.findIndex(p => p.position === currentPosition);

    // If current player isn’t in the actionable list (e.g., just folded), start from the first
    let startIdx = currentIdx === -1 ? 0 : currentIdx;

    for (let i = 1; i <= sortedPlayers.length; i++) {
      const candidate = sortedPlayers[(startIdx + i) % sortedPlayers.length];
      if (candidate) {
        return candidate.id;
      }
    }

    return null; // Should not happen unless everyone is locked
  },



  checkRoundComplete: (gameId: string) => {
    const { activePokerGame } = get();
    if (!activePokerGame) return false;

    const { players, game } = activePokerGame;
    const activePlayers = players.filter(p => !p.is_folded);
    const actionablePlayers = activePlayers.filter(p => !p.is_all_in);

    // If only one player remains (everyone else folded/all-in), round is effectively complete
    if (activePlayers.length <= 1) {
      console.log('Round complete via single active player', { active: activePlayers.length });
      return true;
    }

    // 1. Check if everyone has acted (logic: simplified for MVP)
    // In a real app, we'd track 'has_acted' flag per round.
    // For now, check if all active players have matched the highest bet (or are all-in)

    const highestBet = Math.max(...activePlayers.map(p => p.current_bet || 0));
    const allMatched = activePlayers.every(p => p.current_bet === highestBet || p.is_all_in);

    // 2. Check if everyone has acted in this round
    const currentRound = game.current_round || 'pre_flop';
    const actionsInRound = activePokerGame.actions.filter(a => a.round === currentRound);

    // Get set of player IDs who have acted
    const actors = new Set(actionsInRound.map(a => a.player_id));

    // Big Blind exemption for pre-flop: If no raises, BB effectively "acted" by posting blind? 
    // Actually, in our simple logic, BB needs to "check" if it comes back to them.
    // So we just enforce everyone must have an action record in this round.

    const allHaveActed = actionablePlayers.every(p => actors.has(p.id));
    const actedOrLocked = allHaveActed || actionablePlayers.length === 0;

    if (allMatched && actedOrLocked) {
      console.log('✅ Round Complete Check: TRUE', { round: currentRound, active: activePlayers.length, actors: Array.from(actors), actionable: actionablePlayers.length });
    } else {
      // console.log('⏳ Round Complete Check: False', { allMatched, allHaveActed, round: currentRound });
    }

    return allMatched && actedOrLocked;
  },

  startNextHand: async (gameId: string) => {
    console.log('🔄 startNextHand called with gameId:', gameId);

    const { activePokerGame } = get();
    if (!activePokerGame) {
      console.error('❌ startNextHand: No activePokerGame in state');
      return;
    }

    console.log('🎮 startNextHand: Game status:', activePokerGame.game.status);

    const { game, players } = activePokerGame;
    console.log('👥 startNextHand: All players chips:', players.map(p => ({ name: p.ai_name || p.username, chips: p.chips })));

    // Clear previous AI reasoning so new hand shows fresh thoughts only
    set({ lastPokerAIReasoning: null });

    // Clear previous hand actions in DB so reconnects don't mis-detect "all players acted"
    try {
      await supabase.from('poker_actions').delete().eq('game_id', gameId);
    } catch (clearErr) {
      console.error('⚠️ Failed to clear old poker_actions for new hand:', clearErr);
    }

    // Keep all seats; only players with chips are funded for the next hand
    const fundedPlayers = players.filter(p => (p.chips || 0) > 0);

    if (fundedPlayers.length < 2) {
      console.log('dY?? Waiting for opponents: Not enough funded players to continue.', { activePlayers: fundedPlayers.length });
      await supabase.from('poker_games').update({
        status: 'waiting',
        current_turn_player_id: null
      }).eq('id', gameId);

      set({
        activePokerGame: {
          ...activePokerGame,
          game: {
            ...activePokerGame.game,
            status: 'waiting',
            current_turn_player_id: null
          }
        }
      });
      return;
    }

    console.log('✅ startNextHand: Proceeding with', fundedPlayers.length, 'funded players');

    // 1. Rotate Dealer
    // Simple rotation: increment position and wrap around
    // In a real game, you'd skip empty seats, but here we assume players are mostly contiguous or we just use index
    // Let's find the current dealer index in the sorted active players list
    const sortedPlayers = [...fundedPlayers].sort((a, b) => a.position - b.position);
    const currentDealerIndex = sortedPlayers.findIndex(p => p.position === game.dealer_position);

    // Default to 0 if not found, otherwise moves to next player
    const nextDealerIndex = (currentDealerIndex + 1) % sortedPlayers.length;
    const nextDealer = sortedPlayers[nextDealerIndex];

    // 2. Identify Blinds
    // Heads up (2 players): Dealer is SB, Other is BB (Rule varies, but standard is Dealer=SB, Other=BB)
    // 3+ Players: Dealer -> SB -> BB
    let sbIndex, bbIndex;
    if (sortedPlayers.length === 2) {
      sbIndex = nextDealerIndex; // Dealer is SB
      bbIndex = (nextDealerIndex + 1) % sortedPlayers.length;
    } else {
      sbIndex = (nextDealerIndex + 1) % sortedPlayers.length;
      bbIndex = (nextDealerIndex + 2) % sortedPlayers.length;
    }

    const sbPlayer = sortedPlayers[sbIndex];
    const bbPlayer = sortedPlayers[bbIndex];

    // 3. Post Blinds & Create Deck
    const sbAmount = Math.min(game.small_blind, sbPlayer.chips);
    const bbAmount = Math.min(game.big_blind, bbPlayer.chips);

    const { createDeck, shuffleDeck, dealCards } = await import('../lib/poker/PokerEngine');
    let deck = shuffleDeck(createDeck());

    // 4. Deal Cards
    const updates: Promise<any>[] = [];
    let currentDeck = deck;

    // Updates for all players (reset state + deal new cards) while keeping busted seats
    const playerUpdates = players.map(p => {
      // If busted, keep them seated but folded/all-in with no cards until they rebuy
      if ((p.chips || 0) <= 0) {
        return {
          id: p.id,
          hole_cards: [],
          chips: p.chips || 0,
          current_bet: 0,
          is_folded: true,
          is_all_in: true,
          game_id: gameId
        };
      }

      const { cards, remainingDeck } = dealCards(currentDeck, 2);
      currentDeck = remainingDeck;

      // Preserve the player's existing stack instead of resetting every hand
      const startingChips = Math.max(0, p.chips ?? game.buy_in);
      let chips = startingChips;
      let currentBet = 0;
      let isAllIn = false;

      // Deduct blinds
      if (p.id === sbPlayer.id) {
        chips -= sbAmount;
        currentBet = sbAmount;
      } else if (p.id === bbPlayer.id) {
        chips -= bbAmount;
        currentBet = bbAmount;
      }

      if (chips === 0 && (p.id === sbPlayer.id || p.id === bbPlayer.id)) {
        isAllIn = true;
      }

      return {
        id: p.id,
        hole_cards: cards,
        chips,
        current_bet: currentBet,
        is_folded: false,
        is_all_in: isAllIn,
        game_id: gameId
      };
    });

    // 5. Update DB
    // Update Players
    for (const pUpdate of playerUpdates) {
      updates.push(
        Promise.resolve(supabase.from('poker_game_players').update({
          hole_cards: pUpdate.hole_cards as any,
          chips: pUpdate.chips,
          current_bet: pUpdate.current_bet,
          is_folded: pUpdate.is_folded,
          is_all_in: pUpdate.is_all_in
        }).eq('id', pUpdate.id))
      );
    }

    // Reset non-active players too (just fold/bet reset)
    // Actually, we should just reset everyone's folding status

    // Update Game
    const firstActionPlayerIndex = (bbIndex + 1) % sortedPlayers.length;
    const firstActionPlayer = sortedPlayers[firstActionPlayerIndex];

    updates.push(
      Promise.resolve(supabase.from('poker_games').update({
        current_round: 'pre_flop',
        status: 'in_progress',
        pot_amount: sbAmount + bbAmount,
        community_cards: [],
        deck: currentDeck,
        current_turn_player_id: firstActionPlayer.id,
        dealer_position: nextDealer.position,
        winner_id: null,
        winner_player_id: null,
        winning_hand: null,
        final_pot_amount: null
      }).eq('id', gameId))
    );

    const results = await Promise.all(updates);

    // Check for errors in any update
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('❌ startNextHand DB update errors:', errors.map(e => e.error));
      return; // Don't update local state if DB failed
    }

    console.log('✅ startNextHand: All DB updates successful');

    // CRITICAL: Optimistic update to sync local state immediately
    // This prevents "Player not found" errors when AI tries to act before subscription fires
    const updatedPlayers = players.map(p => {
      const pUpdate = playerUpdates.find(u => u.id === p.id);
      if (!pUpdate) return p;
      return {
        ...p,
        hole_cards: pUpdate.hole_cards,
        chips: pUpdate.chips,
        current_bet: pUpdate.current_bet,
        is_folded: pUpdate.is_folded,
        is_all_in: pUpdate.is_all_in
      };
    });

    set({
      activePokerGame: {
        ...activePokerGame,
        game: {
          ...game,
          current_round: 'pre_flop',
          status: 'in_progress',
          pot_amount: sbAmount + bbAmount,
          community_cards: [],
          deck: currentDeck,
          current_turn_player_id: firstActionPlayer.id,
          dealer_position: nextDealer.position,
          winner_id: null,
          winner_player_id: null,
          winning_hand: null,
          final_pot_amount: null
        },
        players: updatedPlayers,
        actions: [] // Clear actions for new hand
      }
    });

    console.log('Started next hand. Dealer:', nextDealer.position, 'First action:', firstActionPlayer.ai_name || firstActionPlayer.username);

    // If the hand opens on an AI seat, trigger its action immediately so the round advances
    if (firstActionPlayer.is_ai) {
      setTimeout(() => get().processAITurn(gameId, firstActionPlayer.id), 300);
    }
  },

  advanceGameStage: async (gameId: string) => {
    const { activePokerGame } = get();
    if (!activePokerGame) return;

    const { game, players } = activePokerGame;

    const creditOrbitPoints = async (userId: string | null, amount: number) => {
      if (!userId || amount <= 0) return;

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('orbit_points')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch orbit points for winner:', fetchError);
        return;
      }

      const newTotal = (profile?.orbit_points ?? 0) + amount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ orbit_points: newTotal })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Failed to credit orbit points to winner:', updateError);
        return;
      }

      const { currentUser } = get();
      if (currentUser?.id === userId) {
        get().updateOrbitPoints(newTotal);
      }
    };

    // Use actual deck from game, or create fallback if missing
    let gameDeck = game.deck as any[] | null;
    if (!gameDeck || gameDeck.length === 0) {
      console.warn('⚠️ No deck found in game, creating fallback');
      const { createDeck } = await import('../lib/poker/PokerEngine');
      gameDeck = createDeck().map((c: any) => `${c.rank}${c.suit === '♥' ? 'h' : c.suit === '♦' ? 'd' : c.suit === '♣' ? 'c' : 's'}`);
    }

    let nextStage = game.community_cards.length === 0 ? 'flop' :
      game.community_cards.length === 3 ? 'turn' :
        game.community_cards.length === 4 ? 'river' : 'showdown';

    // GUARD: Prevent infinite loop if state is already advanced (or advancing)
    const currentCardCount = game.community_cards.length;
    if (nextStage === 'flop' && currentCardCount >= 3) {
      console.warn('🛑 Loop Guard: Attempted to advance to Flop, but already have cards.', game.community_cards);
      return;
    }
    if (nextStage === 'turn' && currentCardCount >= 4) return;
    if (nextStage === 'river' && currentCardCount >= 5) return;

    let newCards: any[] = [...game.community_cards];
    let updatedDeck = [...gameDeck];

    if (nextStage === 'flop') {
      // Deal 3 cards for flop
      const flopCards = updatedDeck.splice(0, 3);
      newCards.push(...flopCards);
      console.log('🃏 Flop:', flopCards);
    } else if (nextStage === 'turn') {
      // Deal 1 card for turn
      const turnCard = updatedDeck.shift();
      newCards.push(turnCard);
      console.log('🃏 Turn:', turnCard);
    } else if (nextStage === 'river') {
      // Deal 1 card for river
      const riverCard = updatedDeck.shift();
      newCards.push(riverCard);
      console.log('🃏 River:', riverCard);
    }

    if (nextStage === 'showdown') {
      // ==================== REAL SHOWDOWN LOGIC ====================
      console.log('🎰 SHOWDOWN! Evaluating hands...');

      // Import dynamic to avoid circular deps (functions are in scope via import at top)
      const { evaluateHand, compareHands, calculatePayout } = await import('../lib/poker/PokerEngine');

      const activePlayers = players.filter(p => !p.is_folded);

      if (activePlayers.length === 1) {
        // Only one player left = they win by default
        const winner = activePlayers[0];
        const { payout } = calculatePayout(game.pot_amount);

        console.log(`🏆 Winner (last standing): ${winner.username || winner.ai_name} wins ${payout}!`);

        await creditOrbitPoints(winner.user_id || null, payout);

        const { error: chipUpdateError } = await supabase.from('poker_game_players')
          .update({ chips: winner.chips + payout })
          .eq('id', winner.id);
        if (chipUpdateError) {
          console.error('❌ Failed to credit winner chips (last standing):', chipUpdateError);
        }

        const winnerUserId = winner.user_id || null;
        const winnerPlayerId = winner.id;

        const gameUpdate: any = {
          status: 'completed',
          winner_id: winnerUserId,
          winner_player_id: winnerPlayerId,
          winning_hand: 'Last Standing',
          final_pot_amount: payout
        };

        const { error: winnerUpdateError } = await supabase.from('poker_games').update(gameUpdate).eq('id', game.id);

        // Fallback if column doesn't exist yet
        if (winnerUpdateError && winnerUpdateError.code === '42703') {
          const { error: retryError } = await supabase.from('poker_games').update({
            status: 'completed',
            winner_id: winnerUserId,
            winning_hand: 'Last Standing',
            final_pot_amount: payout
          }).eq('id', game.id);
          if (retryError) console.error('Failed to update winner without winner_player_id:', retryError);
        } else if (winnerUpdateError) {
          console.error('Failed to update winner with winner_player_id:', winnerUpdateError);
        }

        // Optimistic update for local UI (supports AI winners)
        set({
          activePokerGame: {
            ...activePokerGame,
            game: {
              ...activePokerGame.game,
              status: 'completed',
              winner_id: winnerUserId || winnerPlayerId, // Prefer user id, fallback to player id for UI
              winner_player_id: winnerPlayerId,
              winning_hand: 'Last Standing' as any,
              final_pot_amount: payout
            },
            players: activePokerGame.players.map(p =>
              p.id === winnerPlayerId ? { ...p, chips: p.chips + payout } : p
            )
          }
        });

        // Auto-start next hand
        setTimeout(() => get().startNextHand(game.id), 8000);
      } else {
        // Evaluate each player's hand
        console.log('🃏 Showdown cards:', { communityCards: newCards, playerCount: activePlayers.length });

        const evaluatedPlayers = activePlayers.map(player => {
          const rawCards = [...(player.hole_cards || []), ...newCards];
          console.log(`🃏 ${player.ai_name || player.username}: rawCards =`, rawCards);

          // Helper to parse string cards (e.g. "Ah") to PokerCard objects
          const parseCard = (c: any) => {
            if (typeof c !== 'string') return c;

            // Handle '10' case (3 chars) vs others (2 chars)
            let rankStr, suitChar;
            if (c.startsWith('10')) {
              rankStr = '10';
              suitChar = c.charAt(2);
            } else {
              rankStr = c.charAt(0);
              suitChar = c.charAt(1);
            }

            const suitMap: Record<string, string> = { 'h': '♥', 'd': '♦', 'c': '♣', 's': '♠' };
            return {
              rank: rankStr,
              suit: suitMap[suitChar] || '♠' // Default to spade if unknown
            };
          };

          const allCards = rawCards.map(parseCard);

          if (allCards.length < 5) {
            console.warn(`⚠️ Player ${player.id} has insufficient cards:`, allCards);
            return { player, hand: null };
          }
          const hand = evaluateHand(allCards);
          console.log(`📊 ${player.username || player.ai_name}: ${hand.rankName} (${hand.highCards.join(', ')})`);
          return { player, hand };
        }).filter(ep => ep.hand !== null);

        if (evaluatedPlayers.length === 0) {
          console.error('❌ No valid hands to evaluate!');
          await supabase.from('poker_games').update({ status: 'completed' }).eq('id', game.id);
          return;
        }

        // Sort by hand strength
        evaluatedPlayers.sort((a, b) => compareHands(b.hand!, a.hand!));

        const winner = evaluatedPlayers[0];
        const { payout, rake } = calculatePayout(game.pot_amount);

        console.log(`🏆 Winner: ${winner.player.username || winner.player.ai_name} with ${winner.hand!.rankName}! Payout: ${payout} (Rake: ${rake})`);

        await creditOrbitPoints(winner.player.user_id || null, payout);

        // Update winner's chips
        const { error: chipUpdateError } = await supabase.from('poker_game_players')
          .update({ chips: winner.player.chips + payout })
          .eq('id', winner.player.id);
        if (chipUpdateError) {
          console.error('❌ Failed to credit winner chips:', chipUpdateError);
        }

        const winnerUserId = winner.player.user_id || null;
        const winnerPlayerId = winner.player.id;

        // Optimistic Winner Update for UI Banner
        const { activePokerGame } = get();
        if (activePokerGame) {
          set({
            activePokerGame: {
              ...activePokerGame,
              game: {
                ...activePokerGame.game,
                status: 'completed',
                winner_id: winnerUserId || winnerPlayerId,
                winner_player_id: winnerPlayerId,
                winning_hand: winner.hand!.rankName as any, // Cast to any to avoid mismatched string literal type
                final_pot_amount: payout
              },
              players: activePokerGame.players.map(p =>
                p.id === winnerPlayerId ? { ...p, chips: p.chips + payout } : p
              )
            }
          });
        }

        // Update game status
        const gameUpdate: any = {
          status: 'completed',
          winner_id: winnerUserId,
          winner_player_id: winnerPlayerId,
          winning_hand: winner.hand!.rankName,
          final_pot_amount: payout
        };

        const { error: winnerUpdateError } = await supabase.from('poker_games').update(gameUpdate).eq('id', game.id);

        // Fallback if winner_player_id column is missing
        if (winnerUpdateError && winnerUpdateError.code === '42703') {
          const { error: retryError } = await supabase.from('poker_games').update({
            status: 'completed',
            winner_id: winnerUserId,
            winning_hand: winner.hand!.rankName,
            final_pot_amount: payout
          }).eq('id', game.id);
          if (retryError) console.error('Failed to update winner without winner_player_id:', retryError);
        } else if (winnerUpdateError) {
          console.error('Failed to update winner with winner_player_id:', winnerUpdateError);
        }

        // Auto-start next hand
        setTimeout(() => get().startNextHand(game.id), 8000);
      }
    } else {
      // Reset bets for next round
      await supabase.from('poker_game_players')
        .update({ current_bet: 0 })
        .eq('game_id', game.id);

      // First to act is immediately left of the dealer (small blind), falling back to next available
      const firstPlayerId = get().getNextActivePlayerId(gameId, game.dealer_position);
      const firstPlayer = players.find(p => p.id === firstPlayerId) ||
        players.find(p => !p.is_folded && !p.is_all_in) ||
        players.find(p => !p.is_folded);

      console.log('🔄 Advancing Round:', {
        nextStage,
        firstPlayerId: firstPlayer?.id,
        newCardsCount: newCards.length
      });

      const updatePayload = {
        community_cards: newCards,
        current_round: nextStage,
        current_turn_player_id: firstPlayer?.id || null,
        deck: updatedDeck // Save remaining deck
      };

      const { error } = await supabase.from('poker_games').update(updatePayload).eq('id', game.id);
      if (error) console.error('❌ Failed to advance stage:', error);

      // Trigger AI if first player is AI
      if (firstPlayer?.is_ai) {
        setTimeout(() => get().processAITurn(gameId, firstPlayer.id), 1000);
      }

      // OPTIMISTIC UPDATE: Stage Advance
      // Reset bets locally and update cards/stage/deck
      const { activePokerGame } = get();
      if (activePokerGame) {
        set({
          activePokerGame: {
            ...activePokerGame,
            game: {
              ...activePokerGame.game,
              current_round: nextStage as any,
              community_cards: newCards,
              current_turn_player_id: firstPlayer?.id || null,
              deck: updatedDeck // Keep deck in sync!
            },
            players: activePokerGame.players.map(p => ({ ...p, current_bet: 0 }))
          }
        });
      }

      // If everyone is all-in (no actionable players), fast-forward to the next stage
      const hasActionable = players.some(p => !p.is_folded && !p.is_all_in);
      if (!hasActionable) {
        setTimeout(() => get().advanceGameStage(gameId), 150);
      }
    }
  },

  // ============================================
  // ANNOUNCEMENTS SYSTEM
  // ============================================

  fetchAnnouncements: async (reset = false) => {
    const state = get();

    if (state.announcements.isLoading) return;

    set((s) => ({
      announcements: {
        ...s.announcements,
        isLoading: true,
        error: null,
        ...(reset && { offset: 0, list: [] })
      }
    }));

    try {
      const offset = reset ? 0 : state.announcements.pagination.offset;
      const limit = state.announcements.pagination.limit;
      const categories = state.announcements.selectedCategories;

      let query = supabase
        .from('announcements')
        .select('*', { count: 'exact' })
        .eq('active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (categories.length > 0) {
        query = query.in('category', categories);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const announcements = data || [];
      const total = count || 0;

      set((s) => ({
        announcements: {
          ...s.announcements,
          list: reset ? announcements : [...s.announcements.list, ...announcements],
          pagination: {
            ...s.announcements.pagination,
            total,
            offset: reset ? announcements.length : s.announcements.pagination.offset + announcements.length,
            hasMore: (reset ? announcements.length : s.announcements.pagination.offset + announcements.length) < total
          },
          isLoading: false
        }
      }));
    } catch (error: any) {
      console.error('Failed to fetch announcements:', error);
      set((s) => ({
        announcements: {
          ...s.announcements,
          isLoading: false,
          error: error.message || 'Failed to load announcements'
        }
      }));
    }
  },

  loadMoreAnnouncements: async () => {
    const state = get();
    if (!state.announcements.pagination.hasMore || state.announcements.isLoading) return;
    await get().fetchAnnouncements(false);
  },

  fetchActiveBanner: async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .eq('banner_enabled', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const dismissed = get().announcements.dismissedIds;
      const activeBanner = (data || []).find(ann => !dismissed.has(ann.id)) || null;

      set((s) => ({
        announcements: {
          ...s.announcements,
          activeBanner
        }
      }));
    } catch (error) {
      console.error('Failed to fetch active banner:', error);
    }
  },

  dismissBanner: (id: string) => {
    set((s) => {
      const newDismissed = new Set(s.announcements.dismissedIds);
      newDismissed.add(id);

      if (typeof window !== 'undefined') {
        localStorage.setItem('orbit_dismissed_announcements', JSON.stringify([...newDismissed]));
      }

      return {
        announcements: {
          ...s.announcements,
          activeBanner: null,
          dismissedIds: newDismissed
        }
      };
    });
  },

  openChangelogModal: (announcementId?: string) => {
    set((s) => ({
      announcements: {
        ...s.announcements,
        isModalOpen: true,
        activeAnnouncementId: announcementId || null
      }
    }));

    if (get().announcements.list.length === 0) {
      get().fetchAnnouncements(true);
    }
  },

  closeChangelogModal: () => {
    set((s) => {
      // Mark all recent announcements as read when closing the modal
      const newDismissed = new Set(s.announcements.dismissedIds);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Add all recent announcements to dismissed set
      s.announcements.list.forEach(a => {
        const createdAt = new Date(a.created_at);
        if (createdAt > sevenDaysAgo) {
          newDismissed.add(a.id);
        }
      });

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('orbit_dismissed_announcements', JSON.stringify([...newDismissed]));
      }

      return {
        announcements: {
          ...s.announcements,
          isModalOpen: false,
          activeAnnouncementId: null,
          dismissedIds: newDismissed
        }
      };
    });
  },

  toggleCategory: (category: Announcement['category']) => {
    set((s) => {
      const categories = s.announcements.selectedCategories;
      const newCategories = categories.includes(category)
        ? categories.filter(c => c !== category)
        : [...categories, category];

      return {
        announcements: {
          ...s.announcements,
          selectedCategories: newCategories
        }
      };
    });

    get().fetchAnnouncements(true);
  },

  createAnnouncement: async (data: CreateAnnouncementRequest): Promise<Announcement> => {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title: data.title,
        summary: data.summary || null,
        content: data.content,
        version: data.version || null,
        category: data.category,
        hero_image_url: data.hero_image_url || null,
        is_pinned: data.is_pinned || false,
        banner_enabled: data.banner_enabled !== false,
        theme_id: data.theme_id || 'default',
        custom_theme: data.custom_theme || null,
        active: true
      })
      .select()
      .single();

    if (error) throw error;
    if (!announcement) throw new Error('Failed to create announcement');

    await get().fetchActiveBanner();
    await get().fetchAnnouncements(true);

    return announcement;
  },

  updateAnnouncement: async (id: string, data: Partial<CreateAnnouncementRequest>): Promise<Announcement> => {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!announcement) throw new Error('Failed to update announcement');

    await get().fetchActiveBanner();
    await get().fetchAnnouncements(true);

    return announcement;
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await get().fetchActiveBanner();
    await get().fetchAnnouncements(true);
  }
}));
