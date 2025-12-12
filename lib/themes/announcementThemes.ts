// Announcement Theme System - Support for seasonal, event-based, and custom themes

export type ParticleType = 'snow' | 'confetti' | 'sparkles' | 'bubbles' | 'hearts' | 'stars' | 'none';

export interface AnnouncementTheme {
  id: string;
  name: string;
  description: string;

  // Color Palette
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundGradient?: string;
    text: string;
    textSecondary: string;
    border: string;
  };

  // Particle Effects
  particles: {
    enabled: boolean;
    type: ParticleType;
    density: number; // 0-100
    colors: string[];
    size: 'small' | 'medium' | 'large';
  };

  // Typography
  typography: {
    fontFamily?: string;
    fontWeight?: number;
    letterSpacing?: string;
  };

  // Visual Effects
  effects: {
    glow: boolean;
    blur: boolean;
    pattern?: 'dots' | 'grid' | 'waves' | 'none';
    borderStyle: 'solid' | 'gradient' | 'dashed' | 'glow';
    shadow: 'none' | 'soft' | 'dramatic' | 'neon';
  };

  // Animation
  animation: {
    entrance: 'slide' | 'fade' | 'bounce' | 'zoom' | 'flip';
    duration: number; // milliseconds
    easing: 'ease' | 'spring' | 'linear';
  };
}

// ============================================
// PRESET THEMES
// ============================================

export const ANNOUNCEMENT_THEMES: Record<string, AnnouncementTheme> = {
  // Clean, modern default
  default: {
    id: 'default',
    name: 'Default',
    description: 'Clean and modern',
    colors: {
      primary: '#06B6D4',
      secondary: '#0891B2',
      accent: '#22D3EE',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      text: '#FFFFFF',
      textSecondary: '#CBD5E1',
      border: '#22D3EE'
    },
    particles: {
      enabled: false,
      type: 'none',
      density: 0,
      colors: [],
      size: 'small'
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.02em'
    },
    effects: {
      glow: true,
      blur: false,
      pattern: 'none',
      borderStyle: 'gradient',
      shadow: 'soft'
    },
    animation: {
      entrance: 'slide',
      duration: 400,
      easing: 'spring'
    }
  },

  // Christmas / Winter
  christmas: {
    id: 'christmas',
    name: 'Winter Wonderland',
    description: 'Festive holiday theme with snow',
    colors: {
      primary: '#3B82F6',
      secondary: '#1D4ED8',
      accent: '#F0F9FF',
      background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #3B82F6 100%)',
      backgroundGradient: 'radial-gradient(circle at 20% 80%, rgba(239, 246, 255, 0.1) 0%, transparent 50%)',
      text: '#F0F9FF',
      textSecondary: '#BFDBFE',
      border: '#60A5FA'
    },
    particles: {
      enabled: true,
      type: 'snow',
      density: 50,
      colors: ['#FFFFFF', '#E0F2FE', '#BAE6FD'],
      size: 'medium'
    },
    typography: {
      fontFamily: '"Bricolage Grotesque", "Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.03em'
    },
    effects: {
      glow: true,
      blur: true,
      pattern: 'dots',
      borderStyle: 'glow',
      shadow: 'dramatic'
    },
    animation: {
      entrance: 'bounce',
      duration: 600,
      easing: 'spring'
    }
  },

  // Birthday / Celebration
  celebration: {
    id: 'celebration',
    name: 'Celebration',
    description: 'Vibrant party vibes with confetti',
    colors: {
      primary: '#F59E0B',
      secondary: '#D97706',
      accent: '#FDE047',
      background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F59E0B 100%)',
      backgroundGradient: 'radial-gradient(circle at 50% 50%, rgba(253, 224, 71, 0.2) 0%, transparent 70%)',
      text: '#FFFFFF',
      textSecondary: '#FEF3C7',
      border: '#FDE047'
    },
    particles: {
      enabled: true,
      type: 'confetti',
      density: 80,
      colors: ['#F59E0B', '#EC4899', '#8B5CF6', '#FDE047', '#3B82F6'],
      size: 'large'
    },
    typography: {
      fontFamily: '"Cabinet Grotesk", "Inter", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.04em'
    },
    effects: {
      glow: true,
      blur: false,
      pattern: 'none',
      borderStyle: 'gradient',
      shadow: 'neon'
    },
    animation: {
      entrance: 'bounce',
      duration: 800,
      easing: 'spring'
    }
  },

  // Urgent / Alert
  alert: {
    id: 'alert',
    name: 'Urgent Alert',
    description: 'High-priority warning',
    colors: {
      primary: '#DC2626',
      secondary: '#991B1B',
      accent: '#FEE2E2',
      background: 'linear-gradient(135deg, #450A0A 0%, #7F1D1D 100%)',
      backgroundGradient: 'radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.3) 0%, transparent 70%)',
      text: '#FFFFFF',
      textSecondary: '#FECACA',
      border: '#EF4444'
    },
    particles: {
      enabled: true,
      type: 'sparkles',
      density: 30,
      colors: ['#DC2626', '#EF4444', '#FECACA'],
      size: 'small'
    },
    typography: {
      fontFamily: '"Space Grotesk", "Inter", monospace',
      fontWeight: 700,
      letterSpacing: '0.05em'
    },
    effects: {
      glow: true,
      blur: false,
      pattern: 'grid',
      borderStyle: 'glow',
      shadow: 'dramatic'
    },
    animation: {
      entrance: 'zoom',
      duration: 300,
      easing: 'ease'
    }
  },

  // Success
  success: {
    id: 'success',
    name: 'Success',
    description: 'Positive achievement celebration',
    colors: {
      primary: '#10B981',
      secondary: '#059669',
      accent: '#D1FAE5',
      background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
      backgroundGradient: 'radial-gradient(circle at 70% 30%, rgba(16, 185, 129, 0.2) 0%, transparent 60%)',
      text: '#ECFDF5',
      textSecondary: '#A7F3D0',
      border: '#34D399'
    },
    particles: {
      enabled: true,
      type: 'sparkles',
      density: 40,
      colors: ['#10B981', '#34D399', '#6EE7B7'],
      size: 'medium'
    },
    typography: {
      fontFamily: '"General Sans", "Inter", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    effects: {
      glow: true,
      blur: false,
      pattern: 'none',
      borderStyle: 'gradient',
      shadow: 'soft'
    },
    animation: {
      entrance: 'fade',
      duration: 500,
      easing: 'spring'
    }
  },

  // Mystery / Dark
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic Mystery',
    description: 'Deep space vibes',
    colors: {
      primary: '#8B5CF6',
      secondary: '#6D28D9',
      accent: '#C4B5FD',
      background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)',
      backgroundGradient: 'radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.2) 0%, transparent 60%)',
      text: '#F5F3FF',
      textSecondary: '#DDD6FE',
      border: '#A78BFA'
    },
    particles: {
      enabled: true,
      type: 'stars',
      density: 60,
      colors: ['#8B5CF6', '#EC4899', '#F0ABFC', '#C4B5FD'],
      size: 'small'
    },
    typography: {
      fontFamily: '"Satoshi", "Inter", sans-serif',
      fontWeight: 500,
      letterSpacing: '0.02em'
    },
    effects: {
      glow: true,
      blur: true,
      pattern: 'dots',
      borderStyle: 'glow',
      shadow: 'neon'
    },
    animation: {
      entrance: 'fade',
      duration: 700,
      easing: 'ease'
    }
  },

  // Valentine's Day
  valentine: {
    id: 'valentine',
    name: 'Love & Romance',
    description: 'Sweet Valentine theme',
    colors: {
      primary: '#EC4899',
      secondary: '#DB2777',
      accent: '#FBCFE8',
      background: 'linear-gradient(135deg, #831843 0%, #BE185D 50%, #EC4899 100%)',
      backgroundGradient: 'radial-gradient(circle at 40% 40%, rgba(244, 114, 182, 0.3) 0%, transparent 50%)',
      text: '#FCE7F3',
      textSecondary: '#FBCFE8',
      border: '#F472B6'
    },
    particles: {
      enabled: true,
      type: 'hearts',
      density: 50,
      colors: ['#EC4899', '#F472B6', '#FBCFE8', '#FFF1F2'],
      size: 'medium'
    },
    typography: {
      fontFamily: '"Fraunces", "Georgia", serif',
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    effects: {
      glow: true,
      blur: true,
      pattern: 'none',
      borderStyle: 'gradient',
      shadow: 'soft'
    },
    animation: {
      entrance: 'bounce',
      duration: 600,
      easing: 'spring'
    }
  },

  // Minimal Elegant
  elegant: {
    id: 'elegant',
    name: 'Elegant Minimal',
    description: 'Refined and sophisticated',
    colors: {
      primary: '#111827',
      secondary: '#374151',
      accent: '#D1D5DB',
      background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
      text: '#111827',
      textSecondary: '#6B7280',
      border: '#9CA3AF'
    },
    particles: {
      enabled: false,
      type: 'none',
      density: 0,
      colors: [],
      size: 'small'
    },
    typography: {
      fontFamily: '"Söhne", "Inter", sans-serif',
      fontWeight: 400,
      letterSpacing: '0.01em'
    },
    effects: {
      glow: false,
      blur: false,
      pattern: 'none',
      borderStyle: 'solid',
      shadow: 'none'
    },
    animation: {
      entrance: 'fade',
      duration: 400,
      easing: 'ease'
    }
  },

  // Retro Gaming
  retro: {
    id: 'retro',
    name: 'Retro Gaming',
    description: 'Nostalgic 8-bit vibes',
    colors: {
      primary: '#F97316',
      secondary: '#EA580C',
      accent: '#FED7AA',
      background: 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 50%, #7C2D12 100%)',
      backgroundGradient: 'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 4px)',
      text: '#FFF7ED',
      textSecondary: '#FDBA74',
      border: '#FB923C'
    },
    particles: {
      enabled: true,
      type: 'sparkles',
      density: 35,
      colors: ['#F97316', '#FB923C', '#FED7AA', '#22D3EE'],
      size: 'large'
    },
    typography: {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontWeight: 400,
      letterSpacing: '0.1em'
    },
    effects: {
      glow: true,
      blur: false,
      pattern: 'grid',
      borderStyle: 'solid',
      shadow: 'neon'
    },
    animation: {
      entrance: 'zoom',
      duration: 300,
      easing: 'linear'
    }
  }
};

// Helper function to get theme by ID
export function getTheme(themeId: string): AnnouncementTheme {
  return ANNOUNCEMENT_THEMES[themeId] || ANNOUNCEMENT_THEMES.default;
}

// Helper function to apply theme CSS variables
export function applyThemeVariables(theme: AnnouncementTheme): Record<string, string> {
  return {
    '--announcement-primary': theme.colors.primary,
    '--announcement-secondary': theme.colors.secondary,
    '--announcement-accent': theme.colors.accent,
    '--announcement-background': theme.colors.background,
    '--announcement-text': theme.colors.text,
    '--announcement-text-secondary': theme.colors.textSecondary,
    '--announcement-border': theme.colors.border,
    '--announcement-font-family': theme.typography.fontFamily || 'inherit',
    '--announcement-font-weight': String(theme.typography.fontWeight || 400),
    '--announcement-letter-spacing': theme.typography.letterSpacing || 'normal'
  };
}
