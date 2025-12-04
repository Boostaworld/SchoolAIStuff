/**
 * VIP Badge Utility
 * Provides gradient glowing badge styles for admins and AI+ users
 */

import React from 'react';
import { Crown, Sparkles } from 'lucide-react';

export interface BadgeStyle {
  nameClasses: string;
  badgeIcon?: React.ReactNode;
  glowClasses: string;
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

  // Admin users get gold gradient with crown
  if (user.is_admin) {
    return {
      nameClasses: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent font-bold',
      badgeIcon: React.createElement(Crown, {
        className: 'w-4 h-4 text-amber-400',
        fill: 'currentColor'
      }),
      glowClasses: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse',
    };
  }

  // AI+ users get cyan gradient with sparkles
  if (user.can_customize_ai) {
    return {
      nameClasses: 'bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-semibold',
      badgeIcon: React.createElement(Sparkles, {
        className: 'w-3.5 h-3.5 text-cyan-400'
      }),
      glowClasses: 'drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]',
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
  if (user.is_admin) return 'ADMIN';
  if (user.can_customize_ai) return 'AI+';
  return null;
}
