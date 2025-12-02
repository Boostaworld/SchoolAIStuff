import React from 'react';
import { motion } from 'framer-motion';
import { Zap, GraduationCap, Trophy, Target, TrendingUp, Award } from 'lucide-react';

type TrainingMode = 'velocity' | 'academy';

interface ModeStats {
  velocity: {
    racesWon: number;
    totalRaces: number;
    winRate: number;
    bestWPM: number;
  };
  academy: {
    drillsCompleted: number;
    currentStreak: number;
    avgAccuracy: number;
    weakKeysRemaining: number;
  };
}

interface DualModeSelectorProps {
  currentMode: TrainingMode;
  onModeChange: (mode: TrainingMode) => void;
  stats: ModeStats;
}

export default function DualModeSelector({
  currentMode,
  onModeChange,
  stats,
}: DualModeSelectorProps) {
  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      {/* Mode toggle */}
      <div className="relative bg-slate-900/50 rounded-2xl p-2 backdrop-blur-sm border border-slate-700">
        <div className="grid grid-cols-2 gap-2 relative">
          {/* Sliding background indicator */}
          <motion.div
            className="absolute inset-y-2 w-[calc(50%-0.25rem)] rounded-xl"
            initial={false}
            animate={{
              x: currentMode === 'velocity' ? '0%' : '100%',
              backgroundColor:
                currentMode === 'velocity'
                  ? 'rgba(6, 182, 212, 0.15)'
                  : 'rgba(59, 130, 246, 0.15)',
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          />

          {/* Velocity mode button */}
          <motion.button
            onClick={() => onModeChange('velocity')}
            className={`relative z-10 px-8 py-6 rounded-xl font-bold text-lg transition-all ${
              currentMode === 'velocity'
                ? 'text-cyan-400 scale-105'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            whileHover={{ scale: currentMode === 'velocity' ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Zap
                className={`w-6 h-6 ${
                  currentMode === 'velocity' ? 'text-cyan-400' : 'text-slate-500'
                }`}
              />
              <span>VELOCITY</span>
            </div>
            <div
              className={`text-xs font-normal ${
                currentMode === 'velocity' ? 'text-cyan-500/70' : 'text-slate-600'
              }`}
            >
              Speed & Competition
            </div>
          </motion.button>

          {/* Academy mode button */}
          <motion.button
            onClick={() => onModeChange('academy')}
            className={`relative z-10 px-8 py-6 rounded-xl font-bold text-lg transition-all ${
              currentMode === 'academy'
                ? 'text-blue-500 scale-105'
                : 'text-slate-500 hover:text-slate-400'
            }`}
            whileHover={{ scale: currentMode === 'academy' ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <GraduationCap
                className={`w-6 h-6 ${
                  currentMode === 'academy' ? 'text-blue-500' : 'text-slate-500'
                }`}
              />
              <span>ACADEMY</span>
            </div>
            <div
              className={`text-xs font-normal ${
                currentMode === 'academy' ? 'text-blue-500/70' : 'text-slate-600'
              }`}
            >
              Precision & Analysis
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mode-specific stats */}
      <motion.div
        key={currentMode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mt-6"
      >
        {currentMode === 'velocity' ? (
          // Velocity stats - neon cyberpunk theme
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="p-6 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/30 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-cyan-400" />
                <div className="text-xs text-cyan-500/70 font-mono uppercase">Races Won</div>
              </div>
              <div className="text-3xl font-black text-cyan-400 font-mono">
                {stats.velocity.racesWon}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                of {stats.velocity.totalRaces} total
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-6 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/30 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-violet-400" />
                <div className="text-xs text-violet-500/70 font-mono uppercase">Win Rate</div>
              </div>
              <div className="text-3xl font-black text-violet-400 font-mono">
                {stats.velocity.winRate}%
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                {stats.velocity.winRate >= 50 ? 'Dominating' : 'Improving'}
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="p-6 bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/30 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-pink-400" />
                <div className="text-xs text-pink-500/70 font-mono uppercase">Best WPM</div>
              </div>
              <div className="text-3xl font-black text-pink-400 font-mono">
                {stats.velocity.bestWPM}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Personal record</div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="p-6 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                <div className="text-xs text-orange-500/70 font-mono uppercase">Rank</div>
              </div>
              <div className="text-3xl font-black text-orange-400 font-mono">
                {stats.velocity.racesWon > 10 ? 'PRO' : stats.velocity.racesWon > 5 ? 'ADV' : 'NOV'}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">Skill tier</div>
            </motion.div>
          </div>
        ) : (
          // Academy stats - calm professional theme
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-blue-600" />
                <div className="text-xs text-slate-600 font-medium uppercase">
                  Drills Completed
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats.academy.drillsCompleted}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total sessions</div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <div className="text-xs text-slate-600 font-medium uppercase">
                  Current Streak
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats.academy.currentStreak}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {stats.academy.currentStreak >= 7 ? 'On fire!' : 'Keep going'}
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-emerald-600" />
                <div className="text-xs text-slate-600 font-medium uppercase">Avg Accuracy</div>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats.academy.avgAccuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {stats.academy.avgAccuracy >= 95 ? 'Excellent' : 'Improving'}
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-cyan-600" />
                <div className="text-xs text-slate-600 font-medium uppercase">Weak Keys</div>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {stats.academy.weakKeysRemaining}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {stats.academy.weakKeysRemaining === 0 ? 'All mastered!' : 'To improve'}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Mode description */}
      <motion.div
        key={`description-${currentMode}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`mt-6 p-6 rounded-xl ${
          currentMode === 'velocity'
            ? 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20'
            : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
        }`}
      >
        {currentMode === 'velocity' ? (
          <div>
            <h3 className="text-lg font-bold text-cyan-400 mb-2 font-mono">VELOCITY MODE</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Race against AI bots in high-speed typing competitions. No backspace allowed - every
              keystroke counts. Build muscle memory through intense flow-state sessions. Perfect
              for pushing your WPM limits and earning rewards through competitive racing.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-xs text-cyan-400 font-mono">
                CURSOR LOCK
              </div>
              <div className="px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full text-xs text-violet-400 font-mono">
                REAL-TIME RACING
              </div>
              <div className="px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-xs text-pink-400 font-mono">
                NITRO STREAKS
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-blue-600 mb-2">Academy Mode</h3>
            <p className="text-slate-700 text-sm leading-relaxed">
              Surgical precision training with AI-generated drills targeting your weakest keys.
              Track rhythm, latency, and accuracy with detailed analytics. Build proper technique
              through personalized exercises designed to eliminate weak points and improve
              consistency.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="px-3 py-1 bg-blue-100 border border-blue-200 rounded-full text-xs text-blue-700 font-medium">
                BACKSPACE ALLOWED
              </div>
              <div className="px-3 py-1 bg-purple-100 border border-purple-200 rounded-full text-xs text-purple-700 font-medium">
                AI ANALYSIS
              </div>
              <div className="px-3 py-1 bg-emerald-100 border border-emerald-200 rounded-full text-xs text-emerald-700 font-medium">
                HEATMAP TRACKING
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Compact version for in-UI switching
export function CompactModeToggle({
  currentMode,
  onModeChange,
}: {
  currentMode: TrainingMode;
  onModeChange: (mode: TrainingMode) => void;
}) {
  return (
    <div className="inline-flex items-center p-1 bg-slate-900/50 rounded-lg border border-slate-700">
      <motion.div className="relative flex gap-1">
        {/* Sliding background */}
        <motion.div
          className="absolute inset-y-0.5 w-[calc(50%-0.125rem)] rounded-md"
          initial={false}
          animate={{
            x: currentMode === 'velocity' ? '0%' : '100%',
            backgroundColor:
              currentMode === 'velocity'
                ? 'rgba(6, 182, 212, 0.2)'
                : 'rgba(59, 130, 246, 0.2)',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        />

        <button
          onClick={() => onModeChange('velocity')}
          className={`relative z-10 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
            currentMode === 'velocity' ? 'text-cyan-400' : 'text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>VELOCITY</span>
          </div>
        </button>

        <button
          onClick={() => onModeChange('academy')}
          className={`relative z-10 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
            currentMode === 'academy' ? 'text-blue-500' : 'text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span>ACADEMY</span>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
