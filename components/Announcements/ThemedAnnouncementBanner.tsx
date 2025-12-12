"use client";

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import { getTheme, applyThemeVariables, type AnnouncementTheme } from '@/lib/themes/announcementThemes';
import { ParticleEffects } from './ParticleEffects';

export function ThemedAnnouncementBanner() {
  const activeBanner = useOrbitStore((s) => s.announcements.activeBanner);
  const dismissBanner = useOrbitStore((s) => s.dismissBanner);
  const openChangelogModal = useOrbitStore((s) => s.openChangelogModal);
  const fetchActiveBanner = useOrbitStore((s) => s.fetchActiveBanner);

  useEffect(() => {
    fetchActiveBanner();
  }, [fetchActiveBanner]);

  // TODO: Re-enable theme customization later
  // Cached theme logic for future use:
  // const customTheme: AnnouncementTheme = useMemo(() => {
  //   if (!activeBanner) return getTheme('default');
  //   if (activeBanner.custom_theme) return activeBanner.custom_theme as AnnouncementTheme;
  //   return getTheme(activeBanner.theme_id || 'default');
  // }, [activeBanner]);

  // Force default theme for all announcements for now
  const theme: AnnouncementTheme = useMemo(() => {
    return getTheme('default');
  }, []);

  if (!activeBanner) return null;

  const handleViewDetails = () => {
    openChangelogModal(activeBanner.id);
    dismissBanner(activeBanner.id);
  };

  const handleDismiss = () => {
    dismissBanner(activeBanner.id);
  };

  const themeVars = applyThemeVariables(theme);

  // Animation variants based on theme
  const getEntranceAnimation = () => {
    switch (theme.animation.entrance) {
      case 'slide':
        return { initial: { y: -100, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -100, opacity: 0 } };
      case 'fade':
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
      case 'bounce':
        return { initial: { y: -100, scale: 0.8, opacity: 0 }, animate: { y: 0, scale: 1, opacity: 1 }, exit: { y: -100, scale: 0.8, opacity: 0 } };
      case 'zoom':
        return { initial: { scale: 0.5, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.5, opacity: 0 } };
      case 'flip':
        return { initial: { rotateX: -90, opacity: 0 }, animate: { rotateX: 0, opacity: 1 }, exit: { rotateX: 90, opacity: 0 } };
      default:
        return { initial: { y: -100, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -100, opacity: 0 } };
    }
  };

  const getTransition = () => {
    if (theme.animation.easing === 'spring') {
      return { type: 'spring', stiffness: 300, damping: 25, duration: theme.animation.duration / 1000 };
    }
    return { duration: theme.animation.duration / 1000, ease: theme.animation.easing };
  };

  const animationConfig = getEntranceAnimation();

  // Background pattern SVG
  const renderPattern = () => {
    if (!theme.effects.pattern || theme.effects.pattern === 'none') return null;

    if (theme.effects.pattern === 'dots') {
      return (
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
      );
    }

    if (theme.effects.pattern === 'grid') {
      return (
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      );
    }

    if (theme.effects.pattern === 'waves') {
      return (
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" preserveAspectRatio="none">
            <path d="M0,20 Q25,10 50,20 T100,20" stroke="currentColor" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <path d="M0,40 Q25,30 50,40 T100,40" stroke="currentColor" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      );
    }

    return null;
  };

  // Shadow styles
  const getShadowClass = () => {
    switch (theme.effects.shadow) {
      case 'soft':
        return 'shadow-lg';
      case 'dramatic':
        return 'shadow-2xl';
      case 'neon':
        return 'shadow-2xl';
      default:
        return '';
    }
  };

  const getShadowStyle = () => {
    if (theme.effects.shadow === 'neon') {
      return { boxShadow: `0 0 30px ${theme.colors.primary}80, 0 0 60px ${theme.colors.primary}40` };
    }
    return {};
  };

  return (
    <AnimatePresence>
      {activeBanner && (
        <motion.div
          {...animationConfig}
          transition={getTransition()}
          className={`fixed top-0 left-0 right-0 z-[9999] ${getShadowClass()}`}
          style={{
            background: theme.colors.background,
            ...themeVars,
            ...getShadowStyle()
          }}
        >
          {/* Background Gradient Overlay */}
          {theme.colors.backgroundGradient && (
            <div
              className="absolute inset-0"
              style={{ background: theme.colors.backgroundGradient }}
            />
          )}

          {/* Pattern */}
          {renderPattern()}

          {/* Particle Effects */}
          {theme.particles.enabled && (
            <ParticleEffects
              type={theme.particles.type}
              density={theme.particles.density}
              colors={theme.particles.colors}
              size={theme.particles.size}
            />
          )}

          {/* Border */}
          {theme.effects.borderStyle === 'gradient' && (
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent}, ${theme.colors.primary})`
              }}
            />
          )}
          {theme.effects.borderStyle === 'glow' && (
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{
                background: theme.colors.border,
                boxShadow: `0 0 20px ${theme.colors.border}`,
                filter: 'blur(1px)'
              }}
            />
          )}
          {theme.effects.borderStyle === 'solid' && (
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: theme.colors.border }}
            />
          )}

          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <motion.div
                className="flex-shrink-0"
                animate={theme.effects.glow ? {
                  filter: [
                    `drop-shadow(0 0 8px ${theme.colors.accent})`,
                    `drop-shadow(0 0 16px ${theme.colors.accent})`,
                    `drop-shadow(0 0 8px ${theme.colors.accent})`
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles
                  className="w-7 h-7 sm:w-8 sm:h-8"
                  style={{ color: theme.colors.accent }}
                />
              </motion.div>

              {/* Text Content */}
              <div
                className="flex-1 min-w-0"
                style={{
                  fontFamily: theme.typography.fontFamily,
                  fontWeight: theme.typography.fontWeight,
                  letterSpacing: theme.typography.letterSpacing
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <h3
                    className="text-base sm:text-lg font-bold truncate"
                    style={{
                      color: theme.colors.text,
                      textShadow: theme.effects.glow ? `0 0 20px ${theme.colors.accent}60` : 'none'
                    }}
                  >
                    {activeBanner.title}
                  </h3>
                  {activeBanner.summary && (
                    <p
                      className="text-sm truncate"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      {activeBanner.summary}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.button
                  onClick={handleViewDetails}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-sm font-bold rounded-lg transition-all"
                  style={{
                    background: theme.colors.primary,
                    color: theme.colors.text,
                    boxShadow: theme.effects.glow ? `0 4px 14px ${theme.colors.primary}60` : 'none'
                  }}
                >
                  View Details
                </motion.button>
                <motion.button
                  onClick={handleDismiss}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: `${theme.colors.primary}20`,
                    color: theme.colors.textSecondary
                  }}
                  aria-label="Dismiss banner"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Blur effect */}
          {theme.effects.blur && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
