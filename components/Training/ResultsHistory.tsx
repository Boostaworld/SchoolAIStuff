import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Clock, Target, Zap, Calendar } from 'lucide-react';
import { TypingHistory } from '../../types';
import { useOrbitStore } from '../../store/useOrbitStore';

export default function ResultsHistory() {
  const { currentUser } = useOrbitStore();
  const [history, setHistory] = useState<TypingHistory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [selectedPeriod, currentUser]);

  const fetchHistory = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const { supabase } = await import('../../lib/supabase');

      // Calculate date filter
      const now = new Date();
      let dateFilter: Date | null = null;

      if (selectedPeriod === 'today') {
        dateFilter = new Date(now.setHours(0, 0, 0, 0));
      } else if (selectedPeriod === 'week') {
        dateFilter = new Date(now.setDate(now.getDate() - 7));
      } else if (selectedPeriod === 'month') {
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
      }

      let query = supabase
        .from('typing_history')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (dateFilter) {
        query = query.gte('completed_at', dateFilter.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    totalSessions: history.length,
    avgWPM: history.length > 0 ? Math.round(history.reduce((sum, h) => sum + h.wpm, 0) / history.length) : 0,
    avgAccuracy: history.length > 0 ? Math.round(history.reduce((sum, h) => sum + h.accuracy, 0) / history.length) : 0,
    bestWPM: history.length > 0 ? Math.max(...history.map(h => h.wpm)) : 0,
    totalTime: history.reduce((sum, h) => sum + h.time_elapsed, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
          TRAINING HISTORY
        </h2>
        <p className="text-slate-500 font-mono text-sm">YOUR PERFORMANCE ARCHIVE</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month', 'all'] as const).map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
              selectedPeriod === period
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/50'
                : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            {period.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-slate-900/50 border border-cyan-500/30 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-500 font-mono uppercase">Sessions</span>
          </div>
          <div className="text-3xl font-black text-cyan-400 font-mono">{stats.totalSessions}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-slate-900/50 border border-violet-500/30 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-500 font-mono uppercase">Avg WPM</span>
          </div>
          <div className="text-3xl font-black text-violet-400 font-mono">{stats.avgWPM}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-slate-900/50 border border-emerald-500/30 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-500 font-mono uppercase">Accuracy</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{stats.avgAccuracy}%</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-slate-900/50 border border-amber-500/30 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500 font-mono uppercase">Best WPM</span>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">{stats.bestWPM}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-slate-900/50 border border-pink-500/30 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-slate-500 font-mono uppercase">Total Time</span>
          </div>
          <div className="text-3xl font-black text-pink-400 font-mono">{Math.round(stats.totalTime / 60)}m</div>
        </motion.div>
      </div>

      {/* History List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 font-mono">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-mono">No sessions found</p>
              <p className="text-slate-600 text-sm">Complete challenges to build your history</p>
            </div>
          ) : (
            history.map((session, idx) => {
              const date = new Date(session.completed_at);
              const isToday = date.toDateString() === new Date().toDateString();
              const timeStr = isToday
                ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-4 bg-slate-900/50 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-200 mb-1 group-hover:text-cyan-400 transition-colors">
                        {session.challenge_title}
                      </h4>
                      <p className="text-sm text-slate-500 font-mono line-clamp-1">
                        {session.challenge_text.slice(0, 80)}...
                      </p>
                    </div>

                    <div className="flex items-center gap-6 ml-6">
                      {/* WPM */}
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono mb-1">WPM</div>
                        <div className="text-2xl font-black text-violet-400 font-mono">
                          {Math.round(session.wpm)}
                        </div>
                      </div>

                      {/* Accuracy */}
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono mb-1">ACC</div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                          {Math.round(session.accuracy)}%
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono mb-1">TIME</div>
                        <div className="text-lg font-bold text-slate-400 font-mono">
                          {Math.round(session.time_elapsed)}s
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono mb-1">DATE</div>
                        <div className="text-sm font-bold text-slate-400 font-mono">
                          {timeStr}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
      `}</style>
    </div>
  );
}
