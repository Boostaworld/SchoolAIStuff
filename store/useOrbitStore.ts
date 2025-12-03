
import { create } from 'zustand';
import { Task, ChatMessage, UserProfile, IntelDrop, DMChannel, Message, MessageReaction, TypingChallenge, TypingSession, KeyStat } from '../types';
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
  inventoryItems: any[];
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
  commsPanelOpen: boolean;

  // Phase 3: Training State
  typingChallenges: TypingChallenge[];
  activeChallenge: TypingChallenge | null;
  typingHeatmap: Record<string, KeyStat>;
  recentSessions: TypingSession[];

  // Initialization
  initialize: () => Promise<void>;
  loadOracleHistory: () => Promise<void>;

  // Auth Actions
  login: (email: string, pass: string) => Promise<{ success: boolean, error?: string }>;
  register: (email: string, pass: string, username: string) => Promise<{ success: boolean, error?: string }>;
  logout: () => Promise<void>;

  // Data Actions
  addTask: (task: Partial<Task>) => Promise<void>;
  toggleTask: (id: string, currentStatus: boolean) => Promise<void>;
  forfeitTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>; // Admin-only deletion
  claimTask: (taskId: string) => Promise<void>; // Claim a public task as your own
  askOracle: (query: string) => Promise<void>;
  triggerSOS: () => void;

  // Intel Actions
  executeIntelQuery: (query: string, deepDive?: boolean) => Promise<void>;
  sendIntelQuery: (prompt: string, options?: {
    depthLevel?: number;
    modelUsed?: 'flash' | 'pro' | 'orbit-x';
    researchMode?: boolean;
    customInstructions?: string;
    conversationMode?: boolean;
    thinkingEnabled?: boolean; // New: Toggle thinking mode
  }) => Promise<IntelResult | null>;
  loadIntelHistory: () => Promise<void>;
  clearIntelHistory: () => void;
  setIntelInstructions: (instructions: string) => void;
  saveIntelDrop: (query: string, isPrivate: boolean) => Promise<void>;
  publishManualDrop: (title: string, content: string, tags?: string[], attachmentFile?: File) => Promise<void>;
  deleteIntelDrop: (id: string) => Promise<void>; // Admin-only deletion
  fetchIntelDrops: () => Promise<void>;

  // Phase 3: Social Actions
  fetchDMChannels: () => Promise<void>;
  createOrGetChannel: (otherUserId: string) => Promise<string>;
  fetchMessages: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, content: string, attachmentFile?: File) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (reactionId: string) => Promise<void>;
  setTyping: (channelId: string, isTyping: boolean) => void;
  setActiveChannel: (channelId: string | null) => void;
  toggleCommsPanel: () => void;

  // Phase 3: Training Actions
  fetchChallenges: () => Promise<void>;
  startChallenge: (challengeId: string) => void;
  submitSession: (challengeId: string | null, wpm: number, accuracy: number, errorCount: number) => Promise<void>;
  syncTypingStats: (keyStats: Record<string, { errors: number; presses: number }>) => Promise<void>;
  fetchTypingHeatmap: () => Promise<void>;
  fetchRecentSessions: () => Promise<void>;

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
    { id: 'init', role: 'model', text: "Orbit Link established. Database connected. Waiting for input.", timestamp: new Date() }
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
  commsPanelOpen: false,

  // Phase 3: Training State
  typingChallenges: [],
  activeChallenge: null,
  typingHeatmap: {},
  recentSessions: [],

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

        // Fetch Tasks: Get user's own tasks + public tasks from others
        const { data: tasks } = await supabase
          .from('tasks')
          .select(`
            *,
            profiles!tasks_user_id_fkey(username, avatar_url)
          `)
          .or(`user_id.eq.${session.user.id},is_public.eq.true`)
          .order('created_at', { ascending: true });

        // Map DB Profile to App Type
        const mappedUser: UserProfile = ensuredProfile ? {
          id: ensuredProfile.id,
          username: ensuredProfile.username,
          avatar: ensuredProfile.avatar_url,
          joinedAt: new Date().toISOString(), // Using now as fallback
          isAdmin: ensuredProfile.is_admin || false,
          // Expose both camelCase and snake_case admin flags for UI compatibility
          ...(ensuredProfile.is_admin ? { is_admin: ensuredProfile.is_admin } : { is_admin: ensuredProfile.is_admin || false }),
          max_wpm: ensuredProfile.max_wpm || 0,
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

        // Phase 3: Fetch Social & Training Data
        await get().fetchDMChannels();
        await get().fetchChallenges();
        await get().fetchTypingHeatmap();
        await get().fetchRecentSessions();
        await get().loadInventory();

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
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
            const newMessage = payload.new as Message;
            const currentMessages = get().messages;
            const currentUser = get().currentUser;

            // Skip if this is our own message (already added optimistically)
            if (newMessage.sender_id === currentUser?.id) return;

            // Check if this message is for a channel the user is part of
            const userChannels = get().dmChannels;
            const isRelevant = userChannels.some(ch => ch.id === newMessage.channel_id);

            if (isRelevant) {
              set({
                messages: {
                  ...currentMessages,
                  [newMessage.channel_id]: [
                    ...(currentMessages[newMessage.channel_id] || []),
                    newMessage
                  ]
                }
              });
            }
          })
          .subscribe();

        // 6. Setup Realtime Reaction Listeners
        supabase.channel('public:message_reactions')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload: any) => {
            const newReaction = payload.new as MessageReaction;
            const currentReactions = get().reactions;

            set({
              reactions: {
                ...currentReactions,
                [newReaction.message_id]: [
                  ...(currentReactions[newReaction.message_id] || []),
                  newReaction
                ]
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
    await supabase.auth.signOut();
    set({
      isAuthenticated: false,
      currentUser: null,
      tasks: [],
      intelDrops: [],
      currentIntelResult: null
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
      isAnalyzing: !task.difficulty // Only show analyzing if we need AI
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
        is_public: task.is_public || false
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

    // ✅ FIX: Check if user already has this exact task
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
      is_public: false // Claimed tasks are private
    }).select(`
      *,
      profiles!tasks_user_id_fkey(username, avatar_url)
    `).single();

    if (error) {
      console.error('❌ Failed to claim task:', error);
      throw error;
    }

    // ✅ FIX: Don't manually add to state - let realtime handle it
    // This prevents duplication when realtime INSERT event fires
    console.log('✅ Task claimed successfully, waiting for realtime sync');
  },

  askOracle: async (query) => {
    const { tasks, oracleHistory, currentUser } = get();
    if (!currentUser) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: query, timestamp: new Date() };
    const updatedHistory = [...oracleHistory, userMsg];

    set({ oracleHistory: updatedHistory, isOracleThinking: true });

    // Persist user message
    try {
      await supabase.from('oracle_chat_history').insert({
        user_id: currentUser.id,
        role: 'user',
        content: query,
        is_sos: false,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (!missingTable(error, 'public.oracle_chat_history')) {
        console.warn('Oracle history insert failed (user):', error);
      }
    }

    const completedCount = tasks.filter(t => t.completed).length;

    const aiResponseText = await generateOracleRoast(
      updatedHistory,
      completedCount,
      currentUser.stats.tasksForfeited
    );

    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: aiResponseText, timestamp: new Date() };
    const finalHistory = [...updatedHistory, aiMsg];
    set({ oracleHistory: finalHistory, isOracleThinking: false });

    // Persist AI message
    try {
      await supabase.from('oracle_chat_history').insert({
        user_id: currentUser.id,
        role: 'model',
        content: aiResponseText,
        is_sos: false,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (!missingTable(error, 'public.oracle_chat_history')) {
        console.warn('Oracle history insert failed (model):', error);
      }
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
      }).catch((error: any) => {
        if (!missingTable(error, 'public.oracle_chat_history')) {
          console.warn('Oracle SOS persist failed:', error);
        }
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
        unlockedModels: currentUser.unlocked_models || ['flash'],
        conversationHistory: historyForContext,
        conversationMode,
        thinkingEnabled // Pass thinking preference to service
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

  fetchIntelDrops: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Fetch public drops + my private drops
    const { data, error } = await supabase
      .from('intel_drops')
      .select(`
        *,
        profiles!intel_drops_author_id_fkey (
          username,
          avatar_url
        )
      `)
      .or(`is_private.eq.false,author_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

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
      query: drop.query,
      summary_bullets: drop.summary_bullets,
      sources: drop.sources,
      related_concepts: drop.related_concepts,
      essay: drop.essay,
      is_private: drop.is_private,
      created_at: drop.created_at
    }));

    set({ intelDrops: mappedDrops });
  },

  publishManualDrop: async (title: string, content: string, tags: string[] = [], attachmentFile?: File) => {
    const { currentUser } = get();
    if (!currentUser) return;

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

    // Create a manual drop by structuring the content
    const { data, error } = await supabase
      .from('intel_drops')
      .insert({
        author_id: currentUser.id,
        query: title,
        summary_bullets: [content], // Treat the main content as a single bullet point or summary
        sources: [],
        related_concepts: ['Manual Broadcast', ...tags],
        is_private: false, // Manual posts are usually public transmissions
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      })
      .select()
      .single();

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

  // ============================================
  // PHASE 3: SOCIAL ACTIONS
  // ============================================

  fetchDMChannels: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('dm_channels')
      .select(`
        *,
        user1:profiles!dm_channels_user1_id_fkey(id, username, avatar_url, max_wpm, orbit_points, tasks_completed, tasks_forfeited, last_active),
        user2:profiles!dm_channels_user2_id_fkey(id, username, avatar_url, max_wpm, orbit_points, tasks_completed, tasks_forfeited, last_active)
      `)
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      if (missingTable(error, 'public.dm_channels')) {
        console.warn('Comms: dm_channels table not found; disabling DM features.');
        set({ dmChannels: [] });
        return;
      }
      console.error('Fetch DM Channels Error:', error);
      return;
    }

    // Map channels and populate otherUser field
    const mappedChannels: DMChannel[] = (data || []).map((channel: any) => {
      const otherUserData = channel.user1_id === currentUser.id ? channel.user2 : channel.user1;

      return {
        id: channel.id,
        user1_id: channel.user1_id,
        user2_id: channel.user2_id,
        created_at: channel.created_at,
        otherUser: otherUserData ? {
          id: otherUserData.id,
          username: otherUserData.username,
          avatar: otherUserData.avatar_url,
          joinedAt: '',
          max_wpm: otherUserData.max_wpm,
          orbit_points: otherUserData.orbit_points,
          last_active: otherUserData.last_active,
          stats: {
            tasksCompleted: otherUserData.tasks_completed || 0,
            tasksForfeited: otherUserData.tasks_forfeited || 0,
            streakDays: 0
          }
        } : undefined
      };
    });

    set({ dmChannels: mappedChannels });
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
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch Messages Error:', error);
      return;
    }

    set(state => ({
      messages: { ...state.messages, [channelId]: data || [] }
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

  sendMessage: async (channelId: string, content: string, attachmentFile?: File) => {
    const { currentUser } = get();
    if (!currentUser) return;

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
      created_at: new Date().toISOString()
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
        attachment_type: attachmentType
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
        .then(({ data: channel }) => {
          if (channel) {
            // Recipient is the other user (not the sender)
            const recipientId = channel.user1_id === currentUser.id
              ? channel.user2_id
              : channel.user1_id;

            // Create notification for the recipient
            supabase
              .from('notifications')
              .insert({
                recipient_id: recipientId,
                sender_id: currentUser.id,
                type: 'dm',
                title: `New message from ${currentUser.username}`,
                content: content.length > 50 ? content.substring(0, 50) + '...' : content,
                link_url: `#comms?channel=${channelId}`,
                metadata: {
                  channel_id: channelId,
                  message_id: data.id
                }
              })
              .then(() => {
                console.log('✅ DM notification created');
              })
              .catch((err) => {
                console.error('❌ Failed to create DM notification:', err);
              });
          }
        });
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: currentUser.id,
        emoji
      });

    if (error) {
      console.error('Add Reaction Error:', error);
    }
  },

  removeReaction: async (reactionId: string) => {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', reactionId);

    if (error) {
      console.error('Remove Reaction Error:', error);
    }
  },

  setTyping: (channelId: string, isTyping: boolean) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const channelName = `typing:${channelId}`;

    if (isTyping) {
      // Send a broadcast event that user is typing
      const channel = supabase.channel(channelName);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUser.id, typing: true }
          });
        }
      });
    } else {
      // Send a broadcast event that user stopped typing
      const channel = supabase.channel(channelName);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUser.id, typing: false }
          });
        }
      });
    }
  },

  setActiveChannel: (channelId: string | null) => {
    set({ activeChannelId: channelId });

    // Fetch messages when opening a channel
    if (channelId) {
      get().fetchMessages(channelId);

      // Subscribe to typing indicators for this channel
      const typingChannel = supabase.channel(`typing:${channelId}`);
      typingChannel
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          const { user_id, typing } = payload.payload;
          const currentTyping = get().typingUsers;

          if (typing) {
            // Add user to typing list
            set({
              typingUsers: {
                ...currentTyping,
                [channelId]: [...(currentTyping[channelId] || []), user_id].filter(
                  (id, idx, arr) => arr.indexOf(id) === idx // dedupe
                )
              }
            });
          } else {
            // Remove user from typing list
            set({
              typingUsers: {
                ...currentTyping,
                [channelId]: (currentTyping[channelId] || []).filter(id => id !== user_id)
              }
            });
          }
        })
        .subscribe();
    }
  },

  toggleCommsPanel: () => {
    set(state => ({ commsPanelOpen: !state.commsPanelOpen }));
  },

  // ============================================
  // PHASE 3: TRAINING ACTIONS
  // ============================================

  fetchChallenges: async () => {
    const { data, error } = await supabase
      .from('typing_challenges')
      .select('*')
      .order('difficulty', { ascending: true });

    if (error) {
      console.error('Fetch Challenges Error:', error);
      return;
    }

    set({ typingChallenges: data || [] });
  },

  startChallenge: (challengeId: string) => {
    const challenge = get().typingChallenges.find(c => c.id === challengeId);
    set({ activeChallenge: challenge || null });
  },

  submitSession: async (challengeId: string | null, wpm: number, accuracy: number, errorCount: number) => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Calculate points earned: (WPM * Accuracy) / 10
    // This rewards both speed and accuracy
    const pointsEarned = Math.floor((wpm * accuracy) / 10);

    // Insert session
    await supabase.from('typing_sessions').insert({
      user_id: currentUser.id,
      challenge_id: challengeId,
      wpm,
      accuracy,
      error_count: errorCount
    });

    // Award points for the race
    if (pointsEarned > 0) {
      const currentPoints = currentUser.orbit_points ?? currentUser.points ?? get().orbitPoints;
      const newPoints = currentPoints + pointsEarned;

      await supabase
        .from('profiles')
        .update({ orbit_points: newPoints })
        .eq('id', currentUser.id);

      set(state => ({
        currentUser: state.currentUser ? {
          ...state.currentUser,
          orbit_points: newPoints,
          points: newPoints
        } : null,
        orbitPoints: newPoints
      }));
    }

    // Update max_wpm if this is a new record
    if (wpm > (currentUser.max_wpm || 0)) {
      await supabase
        .from('profiles')
        .update({ max_wpm: wpm })
        .eq('id', currentUser.id);

      set(state => ({
        currentUser: state.currentUser ? {
          ...state.currentUser,
          max_wpm: wpm
        } : null
      }));
    }

    // Refresh recent sessions
    await get().fetchRecentSessions();

    // Return points earned so UI can show it
    return pointsEarned;
  },

  syncTypingStats: async (keyStats: Record<string, { errors: number; presses: number }>) => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Batch upsert per-key stats
    const upsertPromises = Object.entries(keyStats).map(([key, stats]) =>
      supabase.from('typing_stats').upsert({
        user_id: currentUser.id,
        key_char: key,
        error_count: stats.errors,
        total_presses: stats.presses
      }, {
        onConflict: 'user_id,key_char'
      })
    );

    await Promise.all(upsertPromises);

    // Update local heatmap
    const heatmap: Record<string, KeyStat> = {};
    Object.entries(keyStats).forEach(([key, stats]) => {
      heatmap[key] = {
        errors: stats.errors,
        presses: stats.presses,
        accuracy: stats.presses > 0 ? ((stats.presses - stats.errors) / stats.presses) * 100 : 100
      };
    });

    set({ typingHeatmap: heatmap });
  },

  fetchTypingHeatmap: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('typing_stats')
      .select('*')
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('Fetch Typing Heatmap Error:', error);
      return;
    }

    const heatmap: Record<string, KeyStat> = {};
    (data || []).forEach(stat => {
      heatmap[stat.key_char] = {
        errors: stat.error_count,
        presses: stat.total_presses,
        accuracy: stat.total_presses > 0
          ? ((stat.total_presses - stat.error_count) / stat.total_presses) * 100
          : 100
      };
    });

    set({ typingHeatmap: heatmap });
  },

  fetchRecentSessions: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('typing_sessions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Fetch Recent Sessions Error:', error);
      return;
    }

    set({ recentSessions: data || [] });
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
  }
}));
