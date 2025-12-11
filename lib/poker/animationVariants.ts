// =============================================
// POKER ANIMATION VARIANTS
// =============================================
// Framer Motion animation variant definitions for all poker animations

import { Variants } from 'framer-motion';
import { POKER_ANIMATIONS } from './animationConstants';
import { DealTarget, Position } from './types';

// =============================================
// CARD DEALING VARIANTS
// =============================================

export const cardDealVariants: Variants = {
  initial: {
    x: 0,
    y: 0,
    scale: 0.8,
    rotate: 0,
    opacity: 0
  },
  dealing: (custom: DealTarget) => ({
    x: custom.x,
    y: custom.y,
    scale: 1,
    rotate: [0, 360 * POKER_ANIMATIONS.CARD_DEAL_ROTATIONS, 720], // Multiple rotations
    opacity: 1,
    transition: {
      duration: POKER_ANIMATIONS.CARD_DEAL_DURATION / 1000,
      ease: POKER_ANIMATIONS.EASING_BOUNCE,
      rotate: {
        duration: POKER_ANIMATIONS.CARD_DEAL_DURATION / 1000,
        ease: 'linear'
      }
    }
  }),
  dealt: {
    scale: 1,
    opacity: 1
  }
};

// =============================================
// COMMUNITY CARD REVEAL VARIANTS
// =============================================

export const communityCardVariants: Variants = {
  hidden: {
    rotateY: 180,
    scale: 0.8,
    opacity: 0
  },
  reveal: (index: number) => ({
    rotateY: 0,
    scale: 1,
    opacity: 1,
    transition: {
      delay: index * (POKER_ANIMATIONS.CARD_DEAL_STAGGER / 1000),
      duration: POKER_ANIMATIONS.CARD_FLIP_DURATION / 1000,
      ease: 'easeOut'
    }
  })
};

// =============================================
// HOLE CARD REVEAL VARIANTS (Showdown)
// =============================================

export const holeCardRevealVariants: Variants = {
  hidden: {
    rotateY: 180,
    scale: 0.95,
    opacity: 0.7
  },
  reveal: (staggerIndex: number) => ({
    rotateY: 0,
    scale: 1,
    opacity: 1,
    transition: {
      delay: staggerIndex * (POKER_ANIMATIONS.CARD_DEAL_STAGGER / 1000),
      duration: POKER_ANIMATIONS.CARD_FLIP_DURATION / 1000,
      ease: 'easeOut'
    }
  })
};

// =============================================
// CHIP MOVEMENT VARIANTS
// =============================================

export const chipStackVariants: Variants = {
  initial: {
    x: 0,
    y: 0,
    scale: 1
  },
  toPot: (target: Position) => ({
    x: [0, target.x / 2, target.x],
    y: [0, -POKER_ANIMATIONS.CHIP_ARC_HEIGHT, target.y], // Arc motion
    scale: [1, 0.9, 0.7],
    transition: {
      duration: POKER_ANIMATIONS.CHIP_MOVE_DURATION / 1000,
      ease: POKER_ANIMATIONS.EASING_SMOOTH
    }
  }),
  toWinner: (target: Position) => ({
    x: [0, target.x / 2, target.x],
    y: [0, -POKER_ANIMATIONS.CHIP_ARC_HEIGHT - 10, target.y],
    scale: [0.7, 1, 1],
    transition: {
      duration: (POKER_ANIMATIONS.CHIP_MOVE_DURATION + 200) / 1000,
      ease: POKER_ANIMATIONS.EASING_BOUNCE
    }
  })
};

// =============================================
// ACTION FEEDBACK VARIANTS
// =============================================

export const actionFeedbackVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
    y: 0
  },
  show: {
    scale: [0, 1.2, 1],
    opacity: [0, 1, 1, 0],
    y: [0, -10, -20, -POKER_ANIMATIONS.ACTION_BADGE_FLOAT_DISTANCE],
    transition: {
      duration: POKER_ANIMATIONS.ACTION_FEEDBACK_DURATION / 1000,
      times: [0, 0.2, 0.8, 1]
    }
  }
};

// =============================================
// WINNER GLOW VARIANTS
// =============================================

export const winnerGlowVariants: Variants = {
  idle: {
    boxShadow: '0 0 0 rgba(250, 204, 21, 0)'
  },
  pulsing: {
    boxShadow: [
      '0 0 20px rgba(250, 204, 21, 0.5)',
      '0 0 40px rgba(250, 204, 21, 0.8)',
      '0 0 20px rgba(250, 204, 21, 0.5)'
    ],
    transition: {
      duration: POKER_ANIMATIONS.TURN_INDICATOR_PULSE / 1000,
      repeat: 3,
      ease: 'easeInOut'
    }
  }
};

// =============================================
// FOLD ANIMATION VARIANTS
// =============================================

export const foldCardVariants: Variants = {
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1
  },
  folding: {
    opacity: [1, 0.5, 0],
    y: [0, 20, 40],
    rotateX: [0, 45, 90],
    scale: [1, 0.9, 0.8],
    transition: {
      duration: POKER_ANIMATIONS.FOLD_ANIMATION_DURATION / 1000,
      ease: 'easeIn'
    }
  }
};

// =============================================
// TURN INDICATOR VARIANTS
// =============================================

export const turnIndicatorVariants: Variants = {
  inactive: {
    scale: 1,
    opacity: 0
  },
  active: {
    scale: POKER_ANIMATIONS.TURN_GLOW_SCALE,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  }
};

// =============================================
// WINNER BANNER VARIANTS
// =============================================

export const winnerBannerVariants: Variants = {
  hidden: {
    y: -100,
    opacity: 0,
    scale: 0.8
  },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      ...POKER_ANIMATIONS.SPRING_BALANCED,
      delay: POKER_ANIMATIONS.CELEBRATION_BANNER_DELAY / 1000
    }
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: {
      duration: 0.3
    }
  }
};

// =============================================
// POT COUNT-UP VARIANTS
// =============================================

export const potCountUpVariants: Variants = {
  initial: {
    scale: 1
  },
  updating: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.4,
      times: [0, 0.5, 1]
    }
  }
};

// =============================================
// CONFETTI PARTICLE VARIANTS
// =============================================

export const confettiParticleVariants: Variants = {
  initial: (index: number) => ({
    x: 0,
    y: 0,
    rotate: 0,
    opacity: 1,
    scale: Math.random() * 0.5 + 0.5
  }),
  explode: (index: number) => {
    const angle = (index / 20) * Math.PI * 2;
    const distance = 100 + Math.random() * 100;
    return {
      x: Math.cos(angle) * distance,
      y: [
        0,
        -50 - Math.random() * 100,
        Math.sin(angle) * distance + 200
      ], // Arc upward then fall
      rotate: Math.random() * 720 - 360,
      opacity: [1, 1, 0],
      transition: {
        duration: 1.5 + Math.random() * 0.5,
        ease: 'easeOut',
        delay: POKER_ANIMATIONS.CELEBRATION_CONFETTI_DELAY / 1000
      }
    };
  }
};

// =============================================
// CHIP RAIN VARIANTS (for winner celebration)
// =============================================

export const chipRainVariants: Variants = {
  initial: (index: number) => ({
    y: -50,
    x: (Math.random() - 0.5) * 200, // Random horizontal spread
    opacity: 0,
    rotate: 0
  }),
  falling: (index: number) => ({
    y: 100,
    opacity: [0, 1, 1, 0],
    rotate: Math.random() * 360,
    transition: {
      duration: 1,
      delay: POKER_ANIMATIONS.CELEBRATION_CHIPS_DELAY / 1000 + (index * 0.05),
      ease: 'easeIn'
    }
  })
};
