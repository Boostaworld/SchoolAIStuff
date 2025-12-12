import React, { useEffect, useRef, useState } from 'react';
import { ImageGenPanel } from '../ImageGen/ImageGenPanel';

// ... existing imports ...
import { Nebula } from '../Trails/Nebula';
import { OracleWidget } from '../Oracle/OracleWidget';
import { HordeFeed } from '../Horde/HordeFeed';
import { TaskBoard } from './TaskBoard';
import { PublicTaskMarketplace } from './PublicTaskMarketplace';
import { IntelPanel } from '../Intel/IntelPanel';
import { OperativeSearchPanel } from '../Operative/OperativeSearchPanel';
import { EditIdentityModal } from '../Registry/EditIdentityModal';
import { CreateActionModal } from './CreateActionModal';
import { Tooltip } from '../Shared/Tooltip';
import { LayoutGrid, Database, Users, Bell, LogOut, Edit3, Plus, MessageSquare, Map, Zap, Flag, Coins, Shield, Menu, X, Sparkles, Microscope, Briefcase, Clock, Gamepad2, Headphones } from 'lucide-react';
import clsx from 'clsx';
import { useOrbitStore } from '../../store/useOrbitStore';
import { AnimatePresence, motion } from 'framer-motion';
import CommsPanel from '../Social/CommsPanel';
import ConstellationMap from '../Social/ConstellationMap';
import UnreadDMBanner from '../Social/UnreadDMBanner';

import { BlackMarket } from '../Economy/BlackMarket';
import { NotificationTray } from '../Notifications/NotificationTray';
import { ChangelogButton } from '../Announcements/ChangelogButton';
import { PassiveMiner } from '../Economy/PassiveMiner';
import { TheVault } from '../Economy/TheVault';
import { GodModePanel } from '../Admin/GodModePanel';
import { UnifiedResearchLab } from '../Research/UnifiedResearchLab';
import CommsPage from '../Social/CommsPage';
import { SupportInbox } from '../Social/SupportInbox';
import { ScheduleTimer } from '../Schedule/ScheduleTimer';
import { ScheduleView } from '../Schedule/ScheduleView';
import { GamesHub } from '../Games/GamesHub';
import { isWithinPeriod } from '../../lib/utils/schedule';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '../Shared/KeyboardShortcutsModal';
import { logNavigate } from '../../lib/utils/actionTrail';
import { ReportPill } from '../Shared/ReportPill';



type ViewState = 'dashboard' | 'registry' | 'notifications' | 'comms' | 'support' | 'constellation' | 'economy' | 'research' | 'admin' | 'marketplace' | 'schedule' | 'games' | 'imagegen';

export const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const {
    currentUser,
    orbitPoints,
    logout,
    commsPanelOpen,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    updateOrbitPoints,
    fetchNotifications,
    schedule,
    activeChannelId
  } = useOrbitStore();
  const isAdminUser = currentUser?.isAdmin;

  // Measure HUD height and expose as CSS variable for downstream layouts
  useEffect(() => {
    const updateHudHeight = () => {
      if (headerRef.current) {
        const h = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--orbit-hud-height', `${h}px`);
      }
    };
    updateHudHeight();
    window.addEventListener('resize', updateHudHeight);
    return () => window.removeEventListener('resize', updateHudHeight);
  }, []);

  // Hash-based navigation for shareable tabs (comms, research, intel)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromHash = () => {
      const hash = window.location.hash.slice(1); // Remove #
      const [view, param] = hash.split('/');
      // shareableTabs = views that support deep linking (e.g. #comms/123, #games/poker_game=123)
      const shareableTabs: ViewState[] = ['comms', 'support', 'research', 'imagegen', 'games'];

      if (view && shareableTabs.includes(view as ViewState)) {
        setActiveView(view as ViewState);
        // Log navigation for action trail (bug report context)
        logNavigate(view);

        // Handle deep linking for comms
        if (view === 'comms' && param) {
          // We need to import setActiveChannel from store, but we have it in the hook above
          // However, we can't use the hook value inside this closure if it's stale, 
          // but since this effect runs once, we should use the store directly or ensure we have access.
          // The useOrbitStore hook provides setActiveChannel.
          // Let's use the one from the hook, but we need to make sure it's available.
          // Actually, better to use the store's getState() if we were outside a component, 
          // but here we are inside. Let's just use the function from the hook.
          // Wait, `setActiveChannel` is stable from zustand.
          useOrbitStore.getState().setActiveChannel(param);
        }
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  // Update hash when activeView changes (for shareable tabs only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shareableTabs: ViewState[] = ['comms', 'support', 'research', 'imagegen', 'games'];

    if (shareableTabs.includes(activeView)) {
      if (activeView === 'comms') {
        // Preserve channel ID if present
        const currentHash = window.location.hash.slice(1);
        const [_, param] = currentHash.split('/');
        // If we have a param in the URL, keep it. 
        // OR if we have an active channel in the store, use that.
        // But we can't easily access store state here without adding it to dependency array, 
        // which might cause loops.
        // Safer approach: If the current hash starts with comms/ and we are in comms view, don't overwrite it with just 'comms'.
        if (!currentHash.startsWith('comms/')) {
          // Only set to 'comms' if it's not already a deep link
          window.location.hash = activeView;
        }
      } else {
        window.location.hash = activeView;
      }
    } else {
      // Clear hash for local tabs
      if (window.location.hash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    }
  }, [activeView]);

  // Update hash when activeChannelId changes (while in comms view)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeView !== 'comms') return;

    if (activeChannelId) {
      // Update URL to include channel ID
      window.location.hash = `comms/${activeChannelId}`;
    } else {
      // No channel selected, just show comms
      window.location.hash = 'comms';
    }
  }, [activeChannelId, activeView]);
  // Fetch users for constellation map
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        // Optimized fetch: Get top 200 active users (by points) for the map instead of everyone
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, orbit_points, tasks_completed, tasks_forfeited, is_admin, can_customize_ai')
          .order('orbit_points', { ascending: false })
          .limit(200);

        if (error) {
          console.error('❌ Constellation Map - Failed to fetch profiles:', error);
          return;
        }

        console.log(`✅ Constellation Map - Loaded ${data?.length || 0} profiles`);

        if (data) {
          setAllUsers(data.map((p: any) => ({
            id: p.id,
            username: p.username,
            avatar: p.avatar_url,
            orbit_points: p.orbit_points,
            stats: {
              tasksCompleted: p.tasks_completed || 0,
              tasksForfeited: p.tasks_forfeited || 0,
              streakDays: 0
            },
            isAdmin: p.is_admin,
            can_customize_ai: p.can_customize_ai
          })));
        }
      } catch (err) {
        console.error('❌ Constellation Map - Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Keyboard Shortcuts
  const { toggleCommsPanel } = useOrbitStore();
  useKeyboardShortcuts([
    // Navigation shortcuts (Cmd/Ctrl + 1-9)
    { key: '1', cmd: true, callback: () => setActiveView('dashboard'), description: 'Go to Dashboard', category: 'Navigation' },
    { key: '2', cmd: true, callback: () => setActiveView('marketplace'), description: 'Go to Marketplace', category: 'Navigation' },
    { key: '3', cmd: true, callback: () => setActiveView('schedule'), description: 'Go to Schedule', category: 'Navigation' },
    { key: '4', cmd: true, callback: () => setActiveView('registry'), description: 'Go to User Directory', category: 'Navigation' },
    { key: '5', cmd: true, callback: () => setActiveView('constellation'), description: 'Go to Online Users', category: 'Navigation' },
    { key: '6', cmd: true, callback: () => setActiveView('comms'), description: 'Go to Messages', category: 'Navigation' },
    { key: '7', cmd: true, callback: () => setActiveView('research'), description: 'Go to AI Assistant', category: 'Navigation' },
    { key: '8', cmd: true, callback: () => setActiveView('games'), description: 'Go to Games', category: 'Navigation' },
    { key: '9', cmd: true, callback: () => setActiveView('imagegen'), description: 'Go to AI Images', category: 'Navigation' },

    // Action shortcuts
    { key: 'n', cmd: true, callback: () => setShowCreateModal(true), description: 'Create New Task', category: 'Actions' },
    { key: 'm', cmd: true, callback: () => toggleCommsPanel(), description: 'Toggle Messages Panel', category: 'Actions' },

    // Help shortcuts
    { key: '/', cmd: true, callback: () => setShowKeyboardShortcuts(true), description: 'Show Keyboard Shortcuts', category: 'Help' },
    { key: '?', shift: true, callback: () => setShowKeyboardShortcuts(true), description: 'Show Keyboard Shortcuts', category: 'Help' },
  ]);

  return (
    <div className="relative w-full min-h-dvh flex" style={{ minHeight: '100dvh' }}>
      <Nebula />

      {/* Sidebar - Hidden on desktop during race, but accessible via mobile hamburger */}
      <>
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside className={clsx(
          "fixed lg:relative min-h-screen border-r border-slate-800 bg-slate-950/95 backdrop-blur-md z-40 flex flex-col items-center py-6 gap-6 transition-all duration-300",
          "w-64 lg:w-20",
          // On mobile: always toggleable via hamburger. On desktop: hide during race
          activeView === 'race'
            ? "lg:-translate-x-full" + (isSidebarOpen ? " translate-x-0" : " -translate-x-full")
            : isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="flex items-center justify-between w-full px-4 lg:justify-center lg:px-0">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <LayoutGrid className="text-white w-6 h-6" />
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 flex flex-col gap-4 w-full items-center mt-8 px-4 lg:px-0">
            {/* DEPLOY BUTTON - HIGH CONTRAST */}
            <Tooltip content="Create New Task" position="right">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowCreateModal(true);
                  setIsSidebarOpen(false);
                }}
                className="w-full lg:w-12 lg:h-12 mb-6 rounded-xl bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center lg:justify-center gap-3 lg:gap-0 py-3 lg:py-0 relative group"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity" />
                <Plus className="w-7 h-7 stroke-[3]" />
                <span className="lg:hidden text-sm font-mono font-bold">CREATE NEW</span>
                <span className="hidden lg:block absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
              </motion.button>
            </Tooltip>

            {/* CORE SECTION */}
            <div className="hidden lg:block w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mb-2" />

            <Tooltip content="Dashboard - Your home base for tasks and activity" position="right">
              <button
                onClick={() => {
                  setActiveView('dashboard');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'dashboard'
                    ? "bg-slate-800 text-violet-400 border-slate-700 shadow-lg shadow-violet-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <LayoutGrid className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Dashboard</span>
              </button>
            </Tooltip>

            <Tooltip content="Marketplace - Browse and accept public tasks from other users" position="right">
              <button
                onClick={() => {
                  setActiveView('marketplace');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'marketplace'
                    ? "bg-slate-800 text-amber-400 border-slate-700 shadow-lg shadow-amber-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Briefcase className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Marketplace</span>
              </button>
            </Tooltip>

            <Tooltip content="Schedule - View and manage your daily schedule" position="right">
              <button
                onClick={() => {
                  setActiveView('schedule');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'schedule'
                    ? "bg-slate-800 text-purple-400 border-slate-700 shadow-lg shadow-purple-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Clock className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Schedule</span>
              </button>
            </Tooltip>

            {/* Intel tab removed - consolidated into ResearchLab */}

            {/* SOCIAL SECTION */}
            <div className="hidden lg:block w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent my-2" />

            <Tooltip content="User Directory - Search for users and view profiles" position="right">
              <button
                onClick={() => {
                  setActiveView('registry');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'registry'
                    ? "bg-slate-800 text-cyan-400 border-slate-700 shadow-lg shadow-cyan-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">User Directory</span>
              </button>
            </Tooltip>

            <Tooltip content="Online Users - See who's online right now" position="right">
              <button
                onClick={() => {
                  setActiveView('constellation');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'constellation'
                    ? "bg-slate-800 text-cyan-400 border-slate-700 shadow-lg shadow-cyan-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Map className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Online Users</span>
              </button>
            </Tooltip>

            <Tooltip content="Messages - Send and receive direct messages" position="right">
              <button
                onClick={() => {
                  setActiveView('comms');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center relative",
                  activeView === 'comms'
                    ? "bg-slate-800 text-cyan-400 border-slate-700 shadow-lg shadow-cyan-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Messages</span>
              </button>
            </Tooltip>

            <Tooltip content="Support Inbox - View your bug reports and suggestions" position="right">
              <button
                onClick={() => {
                  setActiveView('support');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'support'
                    ? "bg-slate-800 text-amber-400 border-slate-700 shadow-lg shadow-amber-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Headphones className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Support</span>
              </button>
            </Tooltip>

            {/* TRAINING/RACE/ECONOMY BUTTONS REMOVED - See git history to restore */}

            {/* AI TOOLS SECTION */}
            <div className="hidden lg:block w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent my-2" />

            <Tooltip content="AI Assistant - Chat with AI, get research help, and more" position="right">
              <button
                onClick={() => {
                  setActiveView('research');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'research'
                    ? "bg-slate-800 text-cyan-400 border-slate-700 shadow-lg shadow-cyan-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Microscope className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">AI Assistant</span>
              </button>
            </Tooltip>

            <Tooltip content="AI Images - Generate and edit images using AI" position="right">
              <button
                onClick={() => {
                  setActiveView('imagegen');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'imagegen'
                    ? "bg-slate-800 text-pink-400 border-slate-700 shadow-lg shadow-pink-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">AI Images</span>
              </button>
            </Tooltip>

            {/* GAMES SECTION */}
            <div className="hidden lg:block w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent my-2" />

            <Tooltip content="Games - Play poker and other multiplayer games" position="right">
              <button
                onClick={() => {
                  setActiveView('games');
                  setIsSidebarOpen(false);
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                  activeView === 'games'
                    ? "bg-slate-800 text-pink-400 border-slate-700 shadow-lg shadow-pink-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Gamepad2 className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Games</span>
              </button>
            </Tooltip>

            {/* SYSTEM SECTION */}
            <div className="hidden lg:block w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent my-2" />

            {isAdminUser && (
              <Tooltip content="God Mode - Admin panel for user management and permissions" position="right">
                <button
                  onClick={() => {
                    setActiveView('admin');
                    setIsSidebarOpen(false);
                  }}
                  className={clsx(
                    "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                    activeView === 'admin'
                      ? "bg-slate-800 text-red-400 border-slate-700 shadow-lg shadow-red-900/20"
                      : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                  )}
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span className="lg:hidden text-sm font-mono">Admin Panel</span>
                </button>
              </Tooltip>
            )}

            <Tooltip content="Notifications - View all your notifications and updates" position="right">
              <button
                onClick={() => {
                  setActiveView('notifications');
                  setIsSidebarOpen(false);
                  markAllNotificationsRead();
                }}
                className={clsx(
                  "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 relative flex items-center gap-3 lg:justify-center",
                  activeView === 'notifications'
                    ? "bg-slate-800 text-cyan-400 border-slate-700 shadow-lg shadow-cyan-900/20"
                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
                )}
              >
                <Bell className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 lg:top-2 lg:right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </Tooltip>
          </nav>

          <div className="flex flex-col items-center gap-4 mb-2 px-4 lg:px-0 w-full">
            <Tooltip content="Edit Profile" position="right">
              <button
                onClick={() => {
                  setShowEditModal(true);
                  setIsSidebarOpen(false);
                }}
                className="w-full lg:w-auto flex lg:block items-center gap-3 relative group p-2 lg:p-0 rounded-xl lg:rounded-full hover:bg-slate-900 lg:hover:bg-transparent transition-colors"
              >
                <img src={currentUser?.avatar} alt="Me" className="w-8 h-8 rounded-full border border-slate-600 group-hover:border-violet-500 transition-colors flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono text-slate-300">{currentUser?.username}</span>
                <div className="hidden lg:flex absolute inset-0 bg-slate-950/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
                  <Edit3 className="w-4 h-4 text-violet-400" />
                </div>
              </button>
            </Tooltip>
            <Tooltip content="Logout" position="right">
              <button
                onClick={logout}
                className="w-full lg:w-auto p-3 text-slate-600 hover:text-red-400 transition-colors flex items-center gap-3 lg:justify-center rounded-xl lg:rounded-none hover:bg-slate-900 lg:hover:bg-transparent"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">Logout</span>
              </button>
            </Tooltip>
          </div>
        </aside>
      </>

      {/* Schedule Timer (Fixed at top, z-50) */}


      {/* Main Content Area */}
      <main className="flex-1 z-10 flex flex-col overflow-hidden relative" style={{ height: '100dvh', maxHeight: '100dvh' }}>
        {/* Heads Up Display */}
        <header
          ref={headerRef}
          className="min-h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex flex-wrap items-center gap-2 md:gap-4 px-3 md:px-6 shrink-0 z-40 py-2"
        >
          <div className="flex items-center gap-2 md:gap-6">
            {/* Hamburger Menu Button - Always visible for navigation */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <h1 className="text-sm md:text-lg font-bold text-white tracking-widest">ORBIT OS</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase hidden md:block">
                USER: {currentUser?.username}
              </p>
            </div>
            <motion.button
              data-balance-counter
              onClick={() => setActiveView('economy')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 md:gap-3 bg-slate-900/70 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-slate-800 shadow-inner hover:border-yellow-500/50 transition-all cursor-pointer"
              title="Open Economy Hub"
            >
              <span className="hidden md:inline text-[10px] text-violet-400 font-mono uppercase tracking-wider">Orbit Points</span>
              <span className="text-base md:text-lg font-bold text-violet-300 font-mono">{orbitPoints}</span>
              <Coins className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
            </motion.button>

            {/* Schedule Timer */}
            <ScheduleTimer />
          </div>

          <div className="flex-1" />

          <ReportPill />
          <ChangelogButton />
          <NotificationTray />
        </header>

        {/* View Switcher - Scrollable content area */}
        <div className="flex-1 overflow-y-auto relative">
          {activeView === 'dashboard' && (
            <div className="p-3 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 animate-in fade-in duration-300 min-h-full">
              {/* Left: Tasks (5 cols on desktop, full width on mobile) */}
              <div className="xl:col-span-5 lg:col-span-6 col-span-12">
                <TaskBoard />
              </div>

              {/* Middle: Horde (3 cols on desktop, full width on mobile) */}
              <div className="xl:col-span-3 lg:col-span-6 col-span-12 xl:pt-12">
                <HordeFeed />
              </div>

              {/* Right: Oracle (4 cols on desktop, full width on mobile) */}
              <div className="xl:col-span-4 lg:col-span-12 col-span-12 space-y-4">
                <OracleWidget />
              </div>
            </div>
          )}

          {activeView === 'marketplace' && (
            <div className="animate-in fade-in duration-300">
              <PublicTaskMarketplace />
            </div>
          )}

          {activeView === 'imagegen' && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300">
              <ImageGenPanel />
            </div>
          )}

          {activeView === 'registry' && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300">
              <OperativeSearchPanel />
            </div>
          )}

          {activeView === 'constellation' && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-cyan-400 font-mono tracking-wider mb-2">
                  CONSTELLATION MAP
                </h2>
                <p className="text-cyan-500/60 text-xs md:text-sm font-mono">
                  OPERATIVE NETWORK // REAL-TIME PRESENCE
                </p>
              </div>
              <ConstellationMap users={allUsers} />
            </div>
          )}

          {activeView === 'comms' && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300 h-full">
              <CommsPage />
            </div>
          )}

          {activeView === 'support' && (
            <div className="animate-in fade-in duration-300 h-full">
              <SupportInbox />
            </div>
          )}

          {/* TRAINING & RACE VIEWS TEMPORARILY DISABLED - Uncomment to re-enable */}
          {/* Full training and race view content commented out - see lines 663-1018 for code */}
          {/*
          {activeView === 'training' && (
            <div className="absolute inset-0 p-3 md:p-6 overflow-y-auto animate-in fade-in duration-300">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-violet-400 font-mono tracking-wider mb-2">
                  VELOCITY TRAINING
                </h2>
                <p className="text-violet-500/60 text-xs md:text-sm font-mono">
                  TYPING CHALLENGES // WPM OPTIMIZATION
                </p>
              </div>

              {!activeTrainingChallenge ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <CategorySelector
                      selected={trainingCategory}
                      onChange={setTrainingCategory}
                      className="flex-1"
                    />

                    {trainingCategory === 'prose' && (
                      <motion.button
                        onClick={handleGenerateArticles}
                        disabled={isGenerating}
                        whileHover={{ scale: isGenerating ? 1 : 1.02 }}
                        whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                        className={`
                          group relative px-5 py-3 rounded-lg font-mono text-sm
                          transition-all duration-300 overflow-hidden
                          ${isGenerating
                            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40 cursor-wait'
                            : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/20'
                          }
                        `}
                      >
                        <div className={`
                          absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0
                          ${isGenerating ? 'animate-shimmer' : ''}
                        `} />

                        <div className="relative flex items-center gap-2">
                          {isGenerating ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Sparkles className="w-4 h-4 text-amber-400" />
                              </motion.div>
                              <span className="text-amber-300">Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition-colors" />
                              <span className="text-amber-300 group-hover:text-amber-200 transition-colors">
                                Generate Fresh Articles
                              </span>
                            </>
                          )}
                        </div>
                      </motion.button>
                    )}
                  </div>

                  <EnhancedChallengeSelector
                    challenges={filteredTrainingChallenges}
                    onSelect={handleTrainingSelect}
                  />

                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-cyan-400 font-mono mb-4">
                      PERFORMANCE HEATMAP
                    </h3>
                    <TypingHeatmap />
                  </div>

                  <div className="mt-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-cyan-300 font-mono">Race Arena</h4>
                        <p className="text-slate-500 text-sm font-mono">Ready for a head-to-head sprint? Open the dedicated race page.</p>
                      </div>
                      <button
                        onClick={() => setActiveView('race')}
                        className="px-4 py-2 bg-cyan-500 text-slate-950 rounded-lg font-mono text-sm hover:bg-cyan-400 transition-colors"
                      >
                        Go to Race
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/60 border border-violet-500/30 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs text-violet-400 font-mono">VELOCITY PRACTICE ACTIVE</p>
                      <p className="text-sm text-slate-400 font-mono">{activeTrainingChallenge.title}</p>
                    </div>
                    <button
                      onClick={() => {
                        startChallenge('');
                        setLocalTrainingChallenge(null);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-lg text-red-300 font-mono text-sm hover:bg-red-500/30 transition-all"
                    >
                      Exit Practice
                    </button>
                  </div>

                  <TypingTerminal
                    challenge={activeTrainingChallenge}
                    onComplete={() => {
                      startChallenge('');
                      setLocalTrainingChallenge(null);
                    }}
                  />
                </div>
              )}
            </div>
          )}
          */}

          {activeView === 'economy' && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300">
              {/* Economy Hub content goes here */}
              <p className="text-slate-400">Economy Hub content goes here.</p>
            </div>
          )}

          {activeView === 'research' && (
            <div className="animate-in fade-in duration-300 h-full">
              <UnifiedResearchLab />
            </div>
          )}

          {activeView === 'admin' && isAdminUser && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300">
              <GodModePanel />
            </div>
          )}

          {activeView === 'schedule' && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300">
              <ScheduleView />
            </div>
          )}

          {activeView === 'games' && (
            <div className="animate-in fade-in duration-300 h-full">
              <GamesHub />
            </div>
          )}

          {activeView === 'notifications' && (
            <div className="p-3 md:p-6 animate-in fade-in duration-300">
              <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-cyan-400 font-mono tracking-wider mb-2">
                    NOTIFICATION CENTER
                  </h2>
                  <p className="text-cyan-500/60 text-sm font-mono">
                    SYSTEM ALERTS // MESSAGE INBOX
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
                    <span className="text-sm font-mono text-slate-300 uppercase tracking-wider">All Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsRead()}
                        className="text-xs text-cyan-400 hover:text-cyan-200 font-mono transition-colors"
                      >
                        MARK ALL READ
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-12 text-center text-slate-600">
                        <Bell className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                        <p className="text-lg font-mono text-slate-500 mb-2">No notifications</p>
                        <p className="text-sm text-slate-600 font-mono">You're all caught up, Operative.</p>
                      </div>
                    ) : (
                      notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={clsx(
                            "p-4 hover:bg-slate-800/50 transition-colors cursor-pointer",
                            !n.is_read && "bg-cyan-950/10"
                          )}
                        >
                          <div className="flex gap-4 items-start">
                            <div className={clsx(
                              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                              n.is_read ? "bg-slate-700" : "bg-cyan-400 animate-pulse"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className={clsx(
                                "text-sm mb-1",
                                n.is_read ? "text-slate-400" : "text-slate-200 font-medium"
                              )}>
                                {n.content?.message || n.content || 'System Update'}
                              </p>
                              {n.link_url && (
                                <a
                                  href={n.link_url}
                                  className="text-xs text-cyan-400 hover:text-cyan-300 underline decoration-dotted hover:decoration-solid font-mono"
                                >
                                  → View Details
                                </a>
                              )}
                              <p className="text-[10px] text-slate-600 font-mono mt-2">
                                {new Date(n.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!n.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNotificationRead(n.id);
                                }}
                                className="text-xs text-cyan-500 hover:text-cyan-300 font-mono px-2 py-1 rounded border border-cyan-800 hover:border-cyan-600 transition-colors"
                              >
                                MARK READ
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Unread DM Alert Banner */}
      <UnreadDMBanner />

      {/* Floating Comms Panel */}
      {commsPanelOpen && <CommsPanel />}

      {/* Edit Identity Modal */}
      <AnimatePresence>
        {showEditModal && (
          <EditIdentityModal onClose={() => setShowEditModal(false)} />
        )}
      </AnimatePresence>

      {/* Create Action Modal (DEPLOY SYSTEM) */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateActionModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

    </div>
  );
};
