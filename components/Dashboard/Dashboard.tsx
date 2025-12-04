import React, { useEffect, useState } from 'react';
import { Nebula } from '../Trails/Nebula';
import { OracleWidget } from '../Oracle/OracleWidget';
import { HordeFeed } from '../Horde/HordeFeed';
import { TaskBoard } from './TaskBoard';
import { PublicTaskMarketplace } from './PublicTaskMarketplace';
import { IntelPanel } from '../Intel/IntelPanel';
import { OperativeSearchPanel } from '../Operative/OperativeSearchPanel';
import { EditIdentityModal } from '../Registry/EditIdentityModal';
import { CreateActionModal } from './CreateActionModal';
import { LayoutGrid, Database, Users, Bell, LogOut, Edit3, Plus, MessageSquare, Map, Zap, Flag, Coins, Shield, Menu, X, Sparkles, Microscope, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import { useOrbitStore } from '../../store/useOrbitStore';
import { AnimatePresence, motion } from 'framer-motion';
import CommsPanel from '../Social/CommsPanel';
import ConstellationMap from '../Social/ConstellationMap';
import UnreadDMBanner from '../Social/UnreadDMBanner';
import { TypingTerminal } from '../Training/TypingTerminal';
import { TypingHeatmap } from '../Training/TypingHeatmap';
import EnhancedChallengeSelector from '../Training/EnhancedChallengeSelector';
import { CategorySelector } from '../Training/CategorySelector';
import { BlackMarket } from '../Economy/BlackMarket';
import { NotificationTray } from '../Notifications/NotificationTray';
import { PassiveMiner } from '../Economy/PassiveMiner';
import { TheVault } from '../Economy/TheVault';
import { GodModePanel } from '../Admin/GodModePanel';
import { ResearchLab } from '../Research/ResearchLab';
import CommsPage from '../Social/CommsPage';
import { ScheduleTimer } from '../Schedule/ScheduleTimer';
import { ScheduleView } from '../Schedule/ScheduleView';

import RacingTerminal from '../Training/RacingTerminal';
import { TypingChallenge } from '../../types';
import { useToast } from '../Shared/ToastManager';
import { CoinAnimation } from '../Shared/CoinAnimation';
import { WRITING_FALLBACK_CHALLENGES } from '../Training/writingFallbacks';

type ViewState = 'dashboard' | 'intel' | 'registry' | 'notifications' | 'comms' | 'constellation' | 'training' | 'race' | 'economy' | 'research' | 'admin' | 'marketplace' | 'schedule';

const defaultRaceChallenge: TypingChallenge = {
  id: 'race-demo',
  title: 'Orbit Sprint',
  text_content: 'The swift fox jumps over starlit dunes while engines hum and neon trails streak across the horizon.',
  category: 'Speed Training',
  difficulty: 'Medium',
  length_type: 'Sprint',
  created_at: new Date().toISOString()
};

export const Dashboard: React.FC = () => {
  const toast = useToast();
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeRaceChallenge, setActiveRaceChallenge] = useState<TypingChallenge | null>(null);
  const [raceResults, setRaceResults] = useState<{ position: number; wpm: number; accuracy: number; time: number } | null>(null);
  const [botRanges, setBotRanges] = useState<number[]>([35, 55, 75]);
  const [raceStats, setRaceStats] = useState({ avgWPM: 0, avgAccuracy: 0, maxWPM: 0, raceCount: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [raceCategory, setRaceCategory] = useState<'code' | 'prose'>('prose');
  const [trainingCategory, setTrainingCategory] = useState<'code' | 'prose'>('prose');
  const [activeCoinAnimation, setActiveCoinAnimation] = useState<{
    amount: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [localTrainingChallenge, setLocalTrainingChallenge] = useState<TypingChallenge | null>(null);
  const [generatedArticles, setGeneratedArticles] = useState<TypingChallenge[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const {
    currentUser,
    orbitPoints,
    logout,
    commsPanelOpen,
    typingChallenges,
    activeChallenge,
    startChallenge,
    fetchChallenges,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    updateOrbitPoints,
    fetchNotifications
  } = useOrbitStore();
  const isAdminUser = currentUser?.is_admin;

  // Hash-based navigation for shareable tabs (comms, research, intel)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1); // Remove #
      const shareableTabs: ViewState[] = ['comms', 'research', 'intel'];

      if (hash && shareableTabs.includes(hash as ViewState)) {
        setActiveView(hash as ViewState);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  // Update hash when activeView changes (for shareable tabs only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shareableTabs: ViewState[] = ['comms', 'research', 'intel'];

    if (shareableTabs.includes(activeView)) {
      window.location.hash = activeView;
    } else {
      // Clear hash for local tabs
      if (window.location.hash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    }
  }, [activeView]);
  const addCounts = React.useCallback((challenge: TypingChallenge) => {
    const wordCount = challenge.text_content.trim().split(/\s+/).length;
    return {
      ...challenge,
      word_count: wordCount,
      char_count: challenge.text_content.length
    };
  }, []);
  const normalizedFallbackChallenges = React.useMemo(() => WRITING_FALLBACK_CHALLENGES.map(addCounts), [addCounts]);
  const normalizedStoreChallenges = React.useMemo(() => typingChallenges.map(addCounts), [typingChallenges, addCounts]);
  const trainingCategoriesPriority = React.useMemo(
    () => ['Science', 'ELA', 'Reading', 'Literature', 'History', 'Health', 'Economics', 'Technology', 'Article', 'Creative'],
    []
  );
  const trainingChallenges = React.useMemo(() => {
    const proseCount = normalizedStoreChallenges.filter(ch =>
      trainingCategoriesPriority.includes((ch.category || '').trim())
    ).length;
    const shouldPadWithProse = proseCount < 4;
    const merged = shouldPadWithProse
      ? [...normalizedStoreChallenges, ...normalizedFallbackChallenges, ...generatedArticles]
      : [...normalizedStoreChallenges, ...generatedArticles];
    const seen = new Set<string>();
    return merged.filter(challenge => {
      const key = `${challenge.title}-${challenge.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [normalizedFallbackChallenges, normalizedStoreChallenges, trainingCategoriesPriority, generatedArticles]);

  // Filter training challenges by selected category
  const filteredTrainingChallenges = React.useMemo(() => {
    const codeCategories = ['Programming'];
    const proseCategories = [
      'Science',
      'ELA',
      'Reading',
      'Literature',
      'History',
      'Health',
      'Economics',
      'Technology',
      'Article',
      'Creative'
    ];

    return trainingChallenges.filter(challenge => {
      if (trainingCategory === 'code') {
        return codeCategories.includes(challenge.category || '');
      } else {
        return proseCategories.includes(challenge.category || '');
      }
    });
  }, [trainingChallenges, trainingCategory]);

  const activeTrainingChallenge = activeChallenge || localTrainingChallenge;

  const handleTrainingSelect = React.useCallback((challengeId: string) => {
    const chosen = filteredTrainingChallenges.find(ch => ch.id === challengeId);
    if (!chosen) return;

    const existsInStore = typingChallenges.some(ch => ch.id === challengeId);
    if (existsInStore) {
      startChallenge(challengeId);
      setLocalTrainingChallenge(null);
    } else {
      setLocalTrainingChallenge(chosen);
    }
  }, [startChallenge, filteredTrainingChallenges, typingChallenges]);

  const handleGenerateArticles = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const { generateMultipleArticleExcerpts } = await import('../../lib/ai/gemini');
      const articles = await generateMultipleArticleExcerpts(5);

      const challenges: TypingChallenge[] = articles.map((article, idx) => ({
        id: `generated-${Date.now()}-${idx}`,
        title: article.title,
        text_content: article.excerpt,
        category: article.category,
        difficulty: article.difficulty,
        length_type: article.excerpt.split(/\s+/).length < 50 ? 'Sprint' : 'Medium',
        created_at: new Date().toISOString(),
        is_custom: true,
        word_count: article.excerpt.split(/\s+/).length,
        char_count: article.excerpt.length,
      }));

      setGeneratedArticles(challenges);
      toast.success(`Generated ${challenges.length} fresh article excerpts!`, {
        description: 'Topics: ' + challenges.map(c => c.category).join(', '),
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error generating articles:', error);
      toast.error('Failed to generate articles', {
        description: error.message || 'Please try again',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  // Fetch users for constellation map
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase.from('profiles').select('*');

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
            joinedAt: p.created_at,
            max_wpm: p.max_wpm,
            orbit_points: p.orbit_points,
            stats: {
              tasksCompleted: p.tasks_completed || 0,
              tasksForfeited: p.tasks_forfeited || 0,
              streakDays: 0
            }
          })));
        }
      } catch (err) {
        console.error('❌ Constellation Map - Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch race stats for stats display
  const loadRaceStats = React.useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('typing_sessions')
        .select('wpm, accuracy, completed_at')
        .eq('user_id', currentUser.id)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch race stats:', error);
        return;
      }

      if (data && data.length > 0) {
        const totalWPM = data.reduce((sum, s) => sum + (s.wpm || 0), 0);
        const totalAccuracy = data.reduce((sum, s) => sum + (s.accuracy || 0), 0);
        const maxWPM = Math.max(...data.map(s => s.wpm || 0));

        setRaceStats({
          avgWPM: Math.round(totalWPM / data.length),
          avgAccuracy: Math.round(totalAccuracy / data.length),
          maxWPM: maxWPM,
          raceCount: data.length
        });
      } else {
        setRaceStats({ avgWPM: 0, avgAccuracy: 0, maxWPM: 0, raceCount: 0 });
      }
    } catch (err) {
      console.error('Error fetching race stats:', err);
    }
  }, [currentUser?.id]);

  React.useEffect(() => {
    loadRaceStats();
  }, [loadRaceStats]);

  // Fetch challenges on mount
  React.useEffect(() => {
    if (typingChallenges.length === 0) {
      fetchChallenges();
    }
  }, [typingChallenges.length, fetchChallenges]);

  return (
    <div className="relative w-full h-screen flex">
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
          "fixed lg:relative h-full border-r border-slate-800 bg-slate-950/95 backdrop-blur-md z-40 flex flex-col items-center py-6 gap-6 transition-all duration-300",
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
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowCreateModal(true);
                setIsSidebarOpen(false);
              }}
              className="w-full lg:w-12 lg:h-12 mb-6 rounded-xl bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center justify-center lg:justify-center gap-3 lg:gap-0 py-3 lg:py-0 relative group"
              title="DEPLOY SYSTEM"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity" />
              <Plus className="w-7 h-7 stroke-[3]" />
              <span className="lg:hidden text-sm font-mono font-bold">DEPLOY SYSTEM</span>
              <span className="hidden lg:block absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
            </motion.button>

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
              title="Command Dashboard"
            >
              <LayoutGrid className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Dashboard</span>
            </button>

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
              title="Public Contracts"
            >
              <Briefcase className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Marketplace</span>
            </button>

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
              title="Schedule"
            >
              <Clock className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Schedule</span>
            </button>

            <button
              onClick={() => {
                setActiveView('intel');
                setIsSidebarOpen(false);
              }}
              className={clsx(
                "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                activeView === 'intel'
                  ? "bg-slate-800 text-cyan-400 border-slate-700 shadow-lg shadow-cyan-900/20"
                  : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
              )}
              title="Intel Research"
            >
              <Database className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Intel</span>
            </button>

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
              title="Operative Registry"
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Registry</span>
            </button>

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
              title="Constellation Map"
            >
              <Map className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Constellation</span>
            </button>

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
              title="Secure Comms"
            >
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Comms</span>
            </button>

            {/* TRAINING/RACE/ECONOMY BUTTONS REMOVED - See git history to restore */}
            {/* <button
              onClick={() => {
                setActiveView('economy');
                setIsSidebarOpen(false);
              }}
              className={clsx(
                "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 lg:justify-center",
                activeView === 'economy'
                  ? "bg-slate-800 text-yellow-400 border-slate-700 shadow-lg shadow-yellow-900/20"
                  : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
              )}
              title="Economy Hub"
            >
              <Coins className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Economy</span>
            </button> */}

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
              title="Research Lab"
            >
              <Microscope className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Research Lab</span>
            </button>

            {isAdminUser && (
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
                title="God Mode"
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="lg:hidden text-sm font-mono">God Mode</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveView('notifications');
                setIsSidebarOpen(false);
              }}
              className={clsx(
                "w-full lg:w-auto p-3 rounded-xl border transition-all duration-300 relative flex items-center gap-3 lg:justify-center",
                activeView === 'notifications'
                  ? "bg-slate-800 text-cyan-400 border-slate-700 shadow-lg shadow-cyan-900/20"
                  : "bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300"
              )}
              title="Notifications"
            >
              <Bell className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Notifications</span>
              <span className="absolute top-2 right-2 lg:top-2 lg:right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
          </nav>

          <div className="flex flex-col items-center gap-4 mb-2 px-4 lg:px-0 w-full">
            <button
              onClick={() => {
                setShowEditModal(true);
                setIsSidebarOpen(false);
              }}
              className="w-full lg:w-auto flex lg:block items-center gap-3 relative group p-2 lg:p-0 rounded-xl lg:rounded-full hover:bg-slate-900 lg:hover:bg-transparent transition-colors"
              title="Edit Profile"
            >
              <img src={currentUser?.avatar} alt="Me" className="w-8 h-8 rounded-full border border-slate-600 group-hover:border-violet-500 transition-colors flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono text-slate-300">{currentUser?.username}</span>
              <div className="hidden lg:flex absolute inset-0 bg-slate-950/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
                <Edit3 className="w-4 h-4 text-violet-400" />
              </div>
            </button>
            <button
              onClick={logout}
              className="w-full lg:w-auto p-3 text-slate-600 hover:text-red-400 transition-colors flex items-center gap-3 lg:justify-center rounded-xl lg:rounded-none hover:bg-slate-900 lg:hover:bg-transparent"
              title="Logout"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="lg:hidden text-sm font-mono">Logout</span>
            </button>
          </div>
        </aside>
      </>

      {/* Schedule Timer (Fixed at top, z-50) */}
      <ScheduleTimer />

      {/* Main Content Area */}
      <main className="flex-1 z-10 flex flex-col h-full overflow-hidden relative">
        {/* Heads Up Display */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-3 md:px-6 shrink-0 z-40">
          <div className="flex items-center gap-2 md:gap-6">
            {/* Hamburger Menu Button - Always visible for navigation */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <h1 className="text-base md:text-lg font-bold text-white tracking-widest">ORBIT OS</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase hidden sm:block">
                OPERATIVE: {currentUser?.username}
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
          </div>

          <NotificationTray />
        </header>

        {/* View Switcher */}
        <div className="flex-1 overflow-hidden relative">
          {activeView === 'dashboard' && (
            <div className="absolute inset-0 p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-300">
              {/* Left: Tasks (5 cols on desktop, full width on mobile) */}
              <div className="lg:col-span-5 h-auto lg:h-full overflow-hidden">
                <TaskBoard />
              </div>

              {/* Middle: Horde (3 cols on desktop, full width on mobile) */}
              <div className="lg:col-span-3 h-auto lg:h-full overflow-hidden lg:pt-12">
                <HordeFeed />
              </div>

              {/* Right: Oracle (4 cols on desktop, full width on mobile) */}
              <div className="lg:col-span-4 h-auto lg:h-full overflow-hidden space-y-4">
                <OracleWidget />
              </div>
            </div>
          )}

          {activeView === 'marketplace' && (
            <div className="absolute inset-0 overflow-hidden animate-in fade-in duration-300">
              <PublicTaskMarketplace />
            </div>
          )}

          {activeView === 'intel' && (
            <div className="absolute inset-0 p-3 md:p-6 overflow-hidden animate-in fade-in duration-300">
              <IntelPanel />
            </div>
          )}

          {activeView === 'registry' && (
            <div className="absolute inset-0 p-3 md:p-6 overflow-hidden animate-in fade-in duration-300">
              <OperativeSearchPanel />
            </div>
          )}

          {activeView === 'constellation' && (
            <div className="absolute inset-0 p-3 md:p-6 overflow-y-auto animate-in fade-in duration-300">
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
            <div className="absolute inset-0 p-3 md:p-6 overflow-hidden animate-in fade-in duration-300">
              <div className="h-full">
                <CommsPage />
              </div>
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
            <div className="absolute inset-0 p-3 md:p-6 overflow-y-auto animate-in fade-in duration-300">
              {/* Economy Hub content goes here */}
              <p className="text-slate-400">Economy Hub content goes here.</p>
            </div>
          )}

          {activeView === 'research' && (
            <div className="absolute inset-0 overflow-hidden animate-in fade-in duration-300">
              <ResearchLab />
            </div>
          )}

          {activeView === 'admin' && isAdminUser && (
            <div className="absolute inset-0 p-3 md:p-6 overflow-y-auto animate-in fade-in duration-300">
              <GodModePanel />
            </div>
          )}

          {activeView === 'schedule' && (
            <div className="absolute inset-0 p-3 md:p-6 overflow-y-auto animate-in fade-in duration-300">
              <ScheduleView />
            </div>
          )}

          {activeView === 'notifications' && (
            <div className="absolute inset-0 p-3 md:p-6 overflow-y-auto animate-in fade-in duration-300">
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

      {/* Coin Animation */}
      {activeCoinAnimation && (
        <CoinAnimation
          {...activeCoinAnimation}
          onComplete={() => setActiveCoinAnimation(null)}
        />
      )}
    </div>
  );
};
