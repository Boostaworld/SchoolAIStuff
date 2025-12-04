/**
 * VIP Badge Utility
 * Provides gradient glowing badge styles for admins and AI+ users
 */

import React from 'react';
import { Crown, Sparkles, Brain, ShieldCheck } from 'lucide-react';

export interface BadgeStyle {
  nameClasses: string;
  badgeIcon?: React.ReactNode;
  glowClasses: string;
  badgeContainerClasses?: string;
  badgeLabel?: string;
}

export interface UserBadgeInput {
  is_admin?: boolean;
  can_customize_ai?: boolean;
}

/**
 * Returns styling classes and icons for user badges
 * Priority: Admin > AI+ > Default
 */
export function getUserBadgeStyle(user: UserBadgeInput | undefined | null): BadgeStyle {
  if (!user) {
    return {
      nameClasses: 'text-slate-200',
      glowClasses: '',
    };
  }

  // Admin users (OWNER)
  if (user.is_admin) {
    return {
      // Animated Gold Gradient for Name
      nameClasses: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent font-bold tracking-wide',

      // Badge Pill Styling
      badgeContainerClasses: 'bg-amber-950/30 border border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]',
      badgeLabel: 'OWNER',
      badgeIcon: React.createElement(Crown, {
        className: 'w-3 h-3 text-amber-400',
        fill: 'currentColor'
      }),

      // Glow effect
      glowClasses: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    };
  }

  // AI+ users (PREMIUM)
  if (user.can_customize_ai) {
    return {
      // Animated Aurora Gradient for Name
      nameClasses: 'bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent font-semibold',

      // Badge Pill Styling
      badgeContainerClasses: 'bg-slate-900/50 border border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]',
      badgeLabel: 'AI+',
      badgeIcon: React.createElement(Brain, {
        className: 'w-3 h-3 text-cyan-400'
      }),

      // Glow effect
      glowClasses: 'drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]',
    };
  }

  // Default users - no badge
  return {
    nameClasses: 'text-slate-200',
    glowClasses: '',
  };
}

/**
 * Checks if user has any VIP status
 */
export function hasVIPStatus(user: UserBadgeInput | undefined | null): boolean {
  return !!(user?.is_admin || user?.can_customize_ai);
}

/**
 * Gets a short badge label for display (e.g., "ADMIN", "AI+", null)
 */
export function getBadgeLabel(user: UserBadgeInput | undefined | null): string | null {
  if (!user) return null;
  if (user.is_admin) return 'OWNER';
  if (user.can_customize_ai) return 'AI+';
  return null;
}
