// =============================================
// POKER ANIMATION CONSTANTS
// =============================================
// Timing, easing, and configuration constants for all poker animations

export const POKER_ANIMATIONS = {
  // Duration constants (milliseconds)
  CARD_DEAL_DURATION: 600,
  CARD_DEAL_STAGGER: 150,
  CARD_FLIP_DURATION: 400,
  CHIP_MOVE_DURATION: 800,
  WINNER_CELEBRATION_DURATION: 3000,
  ACTION_FEEDBACK_DURATION: 1500,
  FOLD_ANIMATION_DURATION: 500,
  TURN_INDICATOR_PULSE: 1000,
  POT_COUNT_UP_DURATION: 800,

  // Easing curves (cubic-bezier values)
  EASING_BOUNCE: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  EASING_SMOOTH: [0.22, 1, 0.36, 1] as [number, number, number, number],
  EASING_ELASTIC: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],

  // Spring physics configurations
  SPRING_SNAPPY: {
    stiffness: 500,
    damping: 30
  },
  SPRING_BALANCED: {
    stiffness: 300,
    damping: 30
  },
  SPRING_SMOOTH: {
    stiffness: 260,
    damping: 20
  },
  SPRING_SOFT: {
    stiffness: 150,
    damping: 15
  },

  // Card rotation during deal
  CARD_DEAL_ROTATIONS: 2, // Number of full 360° spins

  // Chip animation arc height
  CHIP_ARC_HEIGHT: 30, // pixels

  // Winner celebration timings (offset delays)
  CELEBRATION_BANNER_DELAY: 0,
  CELEBRATION_CONFETTI_DELAY: 200,
  CELEBRATION_CHIPS_DELAY: 500,
  CELEBRATION_GLOW_DELAY: 300,

  // Action feedback
  ACTION_BADGE_FLOAT_DISTANCE: 40, // pixels upward

  // Turn indicator
  TURN_GLOW_SCALE: 1.1,

  // Performance
  GPU_ACCELERATION: {
    transform: 'translateZ(0)',
    willChange: 'transform, opacity'
  } as React.CSSProperties
};

// Animation priority levels (higher = runs first)
export const ANIMATION_PRIORITY = {
  DEAL: 10,
  REVEAL: 10,
  WIN: 10,
  BET: 8,
  FOLD: 7,
  ACTION_FEEDBACK: 5
};
