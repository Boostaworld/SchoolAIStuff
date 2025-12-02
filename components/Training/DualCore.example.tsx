/**
 * DUAL-CORE TYPING ECOSYSTEM - USAGE EXAMPLE
 *
 * This file demonstrates how to integrate all four visual components:
 * 1. VelocityTerminal - Neon racing arena
 * 2. AcademyDashboard - Calm analysis hub
 * 3. RewardAnimation - Key-to-Coin sequence
 * 4. DualModeSelector - Mode toggle with stats
 *
 * Design Philosophy:
 * - VELOCITY: Neon cyberpunk (cyan/violet), high energy, cursor-lock input
 * - ACADEMY: Zen minimalism (slate/blue), professional, analytical
 * - Both modes use framer-motion for smooth transitions
 * - Responsive layouts built with CSS Grid and Flexbox
 */

import React, { useState } from 'react';
import VelocityTerminal from './VelocityTerminal';
import AcademyDashboard from './AcademyDashboard';
import RewardAnimation, { useRewardAnimation } from './RewardAnimation';
import DualModeSelector, { CompactModeToggle } from './DualModeSelector';
import { motion, AnimatePresence } from 'framer-motion';

type TrainingMode = 'velocity' | 'academy';

export default function DualCoreExample() {
  // Mode management
  const [currentMode, setCurrentMode] = useState<TrainingMode>('velocity');
  const [showModeSelector, setShowModeSelector] = useState(true);

  // Velocity state
  const [velocityActive, setVelocityActive] = useState(false);

  // Academy state
  const [academyActive, setAcademyActive] = useState(false);

  // Reward animation hook
  const { playReward, RewardAnimationComponent } = useRewardAnimation();

  // Mock data - replace with real data from your store/API
  const mockVelocityStats = {
    racesWon: 12,
    totalRaces: 25,
    winRate: 48,
    bestWPM: 87,
  };

  const mockAcademyStats = {
    drillsCompleted: 34,
    currentStreak: 5,
    avgAccuracy: 92.3,
    weakKeysRemaining: 3,
  };

  const mockKeyStats = [
    { key: 'Q', presses: 120, errors: 25, accuracy: 79.2 },
    { key: 'P', presses: 180, errors: 30, accuracy: 83.3 },
    { key: 'X', presses: 90, errors: 20, accuracy: 77.8 },
    { key: 'Z', presses: 100, errors: 15, accuracy: 85.0 },
    { key: 'A', presses: 300, errors: 10, accuracy: 96.7 },
    { key: 'S', presses: 280, errors: 8, accuracy: 97.1 },
    // Add more keys as needed
  ];

  const mockWeeklyAccuracy = [85.2, 87.1, 88.5, 90.2, 91.0, 92.3, 93.1];

  const mockNextDrill = {
    title: 'Precision Drill: Q, P, X Focus',
    targetKeys: ['Q', 'P', 'X'],
    difficulty: 3,
    estimatedTime: 5,
  };

  const mockChallengeText = 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!';

  // Handlers
  const handleModeChange = (mode: TrainingMode) => {
    setCurrentMode(mode);
    setVelocityActive(false);
    setAcademyActive(false);
  };

  const handleVelocityComplete = (results: {
    position: number;
    wpm: number;
    accuracy: number;
    timeMs: number;
  }) => {
    console.log('Race complete:', results);

    // Award points based on position
    const points = results.position === 1 ? 100 : results.position === 2 ? 75 : 50;
    playReward(points);

    // Close terminal after animation
    setTimeout(() => {
      setVelocityActive(false);
      setShowModeSelector(true);
    }, 5000);
  };

  const handleStartDrill = () => {
    console.log('Starting academy drill...');
    setAcademyActive(false); // Would navigate to drill interface
    // In real implementation, this would load the drill content and start session
  };

  const handleStartRace = () => {
    setShowModeSelector(false);
    setVelocityActive(true);
  };

  const handleViewAcademy = () => {
    setShowModeSelector(false);
    setAcademyActive(true);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Reward animation overlay (always rendered, triggers on playReward()) */}
      {RewardAnimationComponent}

      {/* Mode selector screen */}
      <AnimatePresence>
        {showModeSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-8"
          >
            <div>
              <DualModeSelector
                currentMode={currentMode}
                onModeChange={handleModeChange}
                stats={{
                  velocity: mockVelocityStats,
                  academy: mockAcademyStats,
                }}
              />

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4 mt-8">
                {currentMode === 'velocity' ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartRace}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-shadow"
                  >
                    START RACE
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleViewAcademy}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Open Academy Dashboard
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Velocity Terminal (full-screen racing interface) */}
      <AnimatePresence>
        {velocityActive && (
          <VelocityTerminal
            challengeText={mockChallengeText}
            challengeTitle="Lightning Sprint - 120 chars"
            botRanges={[45, 65, 80]} // WPM targets for 3 bots
            onComplete={handleVelocityComplete}
          />
        )}
      </AnimatePresence>

      {/* Academy Dashboard */}
      <AnimatePresence>
        {academyActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Compact mode toggle in top-right */}
            <div className="fixed top-4 right-4 z-50">
              <CompactModeToggle
                currentMode={currentMode}
                onModeChange={handleModeChange}
              />
            </div>

            {/* Back button */}
            <button
              onClick={() => {
                setAcademyActive(false);
                setShowModeSelector(true);
              }}
              className="fixed top-4 left-4 z-50 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              ← Back to Mode Select
            </button>

            <AcademyDashboard
              weeklyAccuracy={mockWeeklyAccuracy}
              keyStats={mockKeyStats}
              nextDrill={mockNextDrill}
              drillsCompleted={mockAcademyStats.drillsCompleted}
              avgAccuracy={mockAcademyStats.avgAccuracy}
              avgLatency={145} // ms between keystrokes
              onStartDrill={handleStartDrill}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * INTEGRATION NOTES:
 *
 * 1. VelocityTerminal:
 *    - Full-screen overlay when racing
 *    - Cursor-lock typing (no backspace)
 *    - Real-time bot interpolation
 *    - Trigger reward animation on completion
 *
 * 2. AcademyDashboard:
 *    - Full-page layout with stats, chart, and heatmap
 *    - Load real typing_stats data for heatmap
 *    - Use AI service to generate next drill
 *
 * 3. RewardAnimation:
 *    - Global overlay component
 *    - Use useRewardAnimation() hook for easy integration
 *    - Trigger via playReward(amount)
 *
 * 4. DualModeSelector:
 *    - Shows mode-specific stats
 *    - Smooth transitions between modes
 *    - Can use CompactModeToggle for in-UI switching
 *
 * COLOR PALETTE (Orbit OS):
 * - Velocity: cyan-400 (#22d3ee), violet-500 (#8b5cf6), pink-500 (#ec4899)
 * - Academy: blue-500 (#3b82f6), slate-800 (#1e293b), emerald-500 (#10b981)
 * - Background: slate-950 (#020617), slate-900 (#0f172a)
 *
 * ACCESSIBILITY:
 * - All interactive elements have ARIA labels
 * - Keyboard navigation supported
 * - Motion respects prefers-reduced-motion (add media query if needed)
 * - Color contrast meets WCAG AA standards
 */
