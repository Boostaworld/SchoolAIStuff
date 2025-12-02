/**
 * TrainingDemo.example.tsx
 *
 * Example implementation showing how to integrate all three Training components
 * into a complete typing training interface for Orbit OS.
 *
 * This demonstrates the full workflow:
 * 1. User selects a challenge from ChallengeSelector
 * 2. TypingTerminal loads with the selected challenge
 * 3. User completes the challenge (stats synced to DB)
 * 4. TypingHeatmap displays updated performance metrics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChallengeSelector, TypingTerminal, TypingHeatmap } from './index';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Keyboard, Target, Trophy, ArrowLeft } from 'lucide-react';

type ViewMode = 'selector' | 'typing' | 'heatmap';

export const TrainingDemo: React.FC = () => {
  const {
    typingChallenges,
    activeChallenge,
    startChallenge,
    fetchChallenges,
    fetchTypingHeatmap
  } = useOrbitStore();

  const [viewMode, setViewMode] = useState<ViewMode>('selector');

  // Initialize challenges on mount
  useEffect(() => {
    fetchChallenges();
    fetchTypingHeatmap();
  }, []);

  // Handle challenge selection
  const handleChallengeSelect = (challengeId: string) => {
    startChallenge(challengeId);
    setViewMode('typing');
  };

  // Handle challenge completion
  const handleChallengeComplete = () => {
    // Stats are already synced by TypingTerminal
    // Return to selector after brief delay
    setTimeout(() => {
      setViewMode('selector');
    }, 100);
  };

  // Handle navigation
  const handleBackToSelector = () => {
    setViewMode('selector');
  };

  const handleShowHeatmap = () => {
    setViewMode('heatmap');
  };

  return (
    <div className="w-full h-screen bg-slate-950 overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)]" />

      {/* Header Navigation */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 p-6 border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Keyboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-mono">TRAINING SIMULATOR</h1>
              <p className="text-sm text-slate-500 font-mono">
                {viewMode === 'selector' && 'SELECT CHALLENGE'}
                {viewMode === 'typing' && 'ACTIVE SESSION'}
                {viewMode === 'heatmap' && 'PERFORMANCE ANALYSIS'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewMode !== 'selector' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToSelector}
                className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 font-mono text-sm flex items-center gap-2 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                BACK
              </motion.button>
            )}

            {viewMode !== 'heatmap' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShowHeatmap}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-violet-400 font-mono text-sm flex items-center gap-2 hover:border-violet-400 transition-colors"
              >
                <Target className="w-4 h-4" />
                HEATMAP
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 w-full h-[calc(100vh-88px)] overflow-auto">
        <AnimatePresence mode="wait">
          {/* Challenge Selector View */}
          {viewMode === 'selector' && (
            <motion.div
              key="selector"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-7xl mx-auto p-8"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white font-mono">MISSION BRIEFING</h2>
                  </div>
                  <p className="text-slate-400 text-sm font-mono">
                    Select a typing challenge to improve your terminal velocity.
                    Each session tracks your WPM, accuracy, and per-key errors for heatmap analysis.
                  </p>
                </motion.div>
              </div>

              <ChallengeSelector
                challenges={typingChallenges}
                onSelect={handleChallengeSelect}
              />
            </motion.div>
          )}

          {/* Typing Terminal View */}
          {viewMode === 'typing' && activeChallenge && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full"
            >
              <TypingTerminal
                challenge={activeChallenge}
                onComplete={handleChallengeComplete}
              />
            </motion.div>
          )}

          {/* Heatmap View */}
          {viewMode === 'heatmap' && (
            <motion.div
              key="heatmap"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-7xl mx-auto p-8"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-bold text-white font-mono">PERFORMANCE ANALYSIS</h2>
                  </div>
                  <p className="text-slate-400 text-sm font-mono">
                    Your keystroke heatmap shows accuracy per key. Focus on red keys to improve your typing precision.
                  </p>
                </motion.div>
              </div>

              <TypingHeatmap />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-[scan_8s_linear_infinite]" />
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
};

export default TrainingDemo;
