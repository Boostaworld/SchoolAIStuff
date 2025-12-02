/**
 * Type definitions for ChallengeSelector component
 *
 * This file provides complete type safety for the component
 * and can be imported separately if needed.
 */

import { TypingChallenge } from '../../types';

/**
 * Main component props
 */
export interface ChallengeSelectorProps {
  /** Array of typing challenges to display in the grid */
  challenges: TypingChallenge[];

  /** Callback function invoked when a challenge is selected */
  onSelect: (challengeId: string) => void;
}

/**
 * Individual challenge card props
 */
export interface ChallengeCardProps {
  /** Challenge data object */
  challenge: TypingChallenge;

  /** Selection callback */
  onSelect: (challengeId: string) => void;

  /** Card index for stagger animation calculation */
  index: number;
}

/**
 * Difficulty configuration type
 */
export interface DifficultyConfig {
  /** Emoji icon displayed in badge */
  icon: string;

  /** Tailwind color name (emerald, amber, rose) */
  color: 'emerald' | 'amber' | 'rose';

  /** RGBA string for glow effect */
  glow: string;

  /** RGB string for border color */
  border: string;
}

/**
 * Complete difficulty configuration mapping
 */
export type DifficultyConfigMap = {
  [K in TypingChallenge['difficulty']]: DifficultyConfig;
};

/**
 * Framer Motion animation variants for cards
 */
export interface CardAnimationVariants {
  hidden: {
    opacity: number;
    y: number;
    scale: number;
  };
  visible: {
    opacity: number;
    y: number;
    scale: number;
    transition: {
      duration: number;
      ease: number[] | string;
    };
  };
}

/**
 * Animation timing configuration
 */
export interface AnimationConfig {
  /** Card entrance animation duration in seconds */
  entranceDuration: number;

  /** Hover animation duration in seconds */
  hoverDuration: number;

  /** Stagger delay between cards in seconds */
  staggerDelay: number;

  /** Custom easing curve for entrance animation */
  entranceEase: [number, number, number, number];
}

/**
 * Theme color tokens
 */
export interface ThemeColors {
  /** Primary cyan data stream color */
  primary: string;

  /** Bright cyan for titles */
  primaryBright: string;

  /** Violet accent color */
  accent: string;

  /** Card background gradient start */
  backgroundStart: string;

  /** Card background gradient end */
  backgroundEnd: string;

  /** Border color with opacity */
  border: string;

  /** Hover border color */
  borderHover: string;
}

/**
 * Component style configuration
 */
export interface StyleConfig {
  /** Grid gap on desktop */
  gridGapDesktop: string;

  /** Grid gap on mobile */
  gridGapMobile: string;

  /** Card padding */
  cardPadding: string;

  /** Mobile breakpoint in pixels */
  breakpoint: number;

  /** Border radius */
  borderRadius: string;

  /** Backdrop blur amount */
  backdropBlur: string;
}

// Default configurations (exported for testing/customization)

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  entranceDuration: 0.5,
  hoverDuration: 0.25,
  staggerDelay: 0.08,
  entranceEase: [0.23, 1, 0.32, 1],
};

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: 'rgb(6, 182, 212)',
  primaryBright: 'rgb(103, 232, 249)',
  accent: 'rgb(139, 92, 246)',
  backgroundStart: 'rgba(15, 23, 42, 0.7)',
  backgroundEnd: 'rgba(30, 41, 59, 0.5)',
  border: 'rgba(6, 182, 212, 0.3)',
  borderHover: 'rgba(6, 182, 212, 0.6)',
};

export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  gridGapDesktop: '1.5rem',
  gridGapMobile: '1rem',
  cardPadding: '1.75rem',
  breakpoint: 768,
  borderRadius: '8px',
  backdropBlur: '16px',
};

/**
 * Type guard to check if a difficulty is valid
 */
export function isValidDifficulty(
  difficulty: string
): difficulty is TypingChallenge['difficulty'] {
  return ['Easy', 'Medium', 'Hard'].includes(difficulty);
}

/**
 * Helper to generate truncated preview text
 */
export function generatePreview(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Helper to calculate animation delay for staggered entrance
 */
export function calculateStaggerDelay(
  index: number,
  baseDelay: number = DEFAULT_ANIMATION_CONFIG.staggerDelay
): number {
  return index * baseDelay;
}
