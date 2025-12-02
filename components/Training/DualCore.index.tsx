// Dual-Core Typing Ecosystem - Component Exports
// Built with framer-motion, CSS Grid, and cyberpunk/zen aesthetics

export { default as VelocityTerminal } from './VelocityTerminal';
export { default as AcademyDashboard } from './AcademyDashboard';
export { default as RewardAnimation, KeyToCoinSequence, useRewardAnimation } from './RewardAnimation';
export { default as DualModeSelector, CompactModeToggle } from './DualModeSelector';

// Type exports for convenience
export type TrainingMode = 'velocity' | 'academy';

export interface VelocityTerminalProps {
  challengeText: string;
  challengeTitle: string;
  botRanges: number[];
  onComplete: (results: {
    position: number;
    wpm: number;
    accuracy: number;
    timeMs: number;
  }) => void;
}

export interface AcademyDashboardProps {
  weeklyAccuracy: number[];
  keyStats: Array<{
    key: string;
    presses: number;
    errors: number;
    accuracy: number;
  }>;
  nextDrill: {
    title: string;
    targetKeys: string[];
    difficulty: number;
    estimatedTime: number;
  };
  drillsCompleted: number;
  avgAccuracy: number;
  avgLatency: number;
  onStartDrill: () => void;
}

export interface DualModeSelectorProps {
  currentMode: TrainingMode;
  onModeChange: (mode: TrainingMode) => void;
  stats: {
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
  };
}
