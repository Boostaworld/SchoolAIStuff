"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bug, Settings, Calendar, ArrowUpCircle, ChevronRight } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import type { Announcement } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatDistanceToNow } from 'date-fns';
import { getTheme, applyThemeVariables } from '@/lib/themes/announcementThemes';
import { ParticleEffects } from './ParticleEffects';

const categoryIcons: Record<Announcement['category'], any> = {
  feature: Sparkles,
  fix: Bug,
  system: Settings,
  event: Calendar,
  update: ArrowUpCircle
};

export function ThemedChangelogModal() {
  const isModalOpen = useOrbitStore((s) => s.announcements.isModalOpen);
  const activeAnnouncementId = useOrbitStore((s) => s.announcements.activeAnnouncementId);
  const announcements = useOrbitStore((s) => s.announcements.list);
  const selectedCategories = useOrbitStore((s) => s.announcements.selectedCategories);
  const pagination = useOrbitStore((s) => s.announcements.pagination);
  const isLoading = useOrbitStore((s) => s.announcements.isLoading);

  const closeChangelogModal = useOrbitStore((s) => s.closeChangelogModal);
  const toggleCategory = useOrbitStore((s) => s.toggleCategory);
  const loadMoreAnnouncements = useOrbitStore((s) => s.loadMoreAnnouncements);

  const [selectedId, setSelectedId] = React.useState<string | null>(activeAnnouncementId);

  useEffect(() => {
    if (activeAnnouncementId && isModalOpen) {
      setSelectedId(activeAnnouncementId);
      setTimeout(() => {
        const element = document.getElementById(`announcement-${activeAnnouncementId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [activeAnnouncementId, isModalOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChangelogModal();
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, closeChangelogModal]);

  const selectedAnnouncement = useMemo(() => {
    return selectedId
      ? announcements.find(a => a.id === selectedId) || announcements[0]
      : announcements[0];
  }, [selectedId, announcements]);

  const activeTheme = useMemo(() => {
    if (!selectedAnnouncement) return getTheme('default');
    if (selectedAnnouncement.custom_theme) return selectedAnnouncement.custom_theme;
    return getTheme(selectedAnnouncement.theme_id || 'default');
  }, [selectedAnnouncement]);

  if (!isModalOpen) return null;

  const themeVars = applyThemeVariables(activeTheme);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeChangelogModal}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            background: activeTheme.colors.background,
            borderColor: activeTheme.colors.border,
            borderWidth: '2px',
            ...themeVars
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Background effects */}
          {activeTheme.colors.backgroundGradient && (
            <div className="absolute inset-0" style={{ background: activeTheme.colors.backgroundGradient }} />
          )}

          {/* Particles */}
          {activeTheme.particles.enabled && (
            <ParticleEffects
              type={activeTheme.particles.type}
              density={activeTheme.particles.density}
              colors={activeTheme.particles.colors}
              size={activeTheme.particles.size}
              containerClassName="rounded-2xl"
            />
          )}

          {/* Header */}
          <div
            className="relative flex items-center justify-between px-6 py-5 border-b"
            style={{
              borderColor: activeTheme.colors.border,
              fontFamily: activeTheme.typography.fontFamily
            }}
          >
            <h2
              className="text-3xl font-bold"
              style={{
                color: activeTheme.colors.text,
                fontWeight: activeTheme.typography.fontWeight,
                letterSpacing: activeTheme.typography.letterSpacing
              }}
            >
              Changelog
            </h2>
            <motion.button
              onClick={closeChangelogModal}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-xl transition-all"
              style={{
                background: `${activeTheme.colors.primary}20`,
                color: activeTheme.colors.textSecondary
              }}
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>

          {/* Body */}
          <div className="relative flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div
              className="w-80 border-r flex flex-col overflow-hidden"
              style={{
                background: `${activeTheme.colors.primary}10`,
                borderColor: activeTheme.colors.border
              }}
            >
              {/* Category Filters */}
              <div className="p-4 border-b" style={{ borderColor: activeTheme.colors.border }}>
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: activeTheme.colors.textSecondary }}>
                  Filter
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(categoryIcons) as Announcement['category'][]).map((category) => {
                    const Icon = categoryIcons[category];
                    const isSelected = selectedCategories.includes(category);

                    return (
                      <motion.button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                        style={{
                          background: isSelected ? activeTheme.colors.primary : `${activeTheme.colors.primary}20`,
                          color: isSelected ? activeTheme.colors.text : activeTheme.colors.textSecondary,
                          border: `1px solid ${isSelected ? activeTheme.colors.accent : 'transparent'}`
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {category}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {announcements.map((announcement, index) => {
                  const Icon = categoryIcons[announcement.category];
                  const isActive = selectedId === announcement.id;
                  const announcementTheme = announcement.custom_theme || getTheme(announcement.theme_id || 'default');

                  return (
                    <motion.button
                      key={announcement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedId(announcement.id)}
                      className={`w-full p-4 text-left border-b transition-all ${
                        isActive ? 'border-l-4' : ''
                      }`}
                      style={{
                        background: isActive ? `${announcementTheme.colors.primary}20` : 'transparent',
                        borderColor: isActive ? announcementTheme.colors.accent : `${activeTheme.colors.border}50`,
                        borderLeftColor: isActive ? announcementTheme.colors.accent : 'transparent'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: announcementTheme.colors.primary }} />
                        <div className="flex-1 min-w-0">
                          {announcement.is_pinned && (
                            <span className="inline-block px-2 py-0.5 mb-1 text-xs font-bold rounded" style={{ background: activeTheme.colors.accent, color: activeTheme.colors.background }}>
                              PINNED
                            </span>
                          )}
                          <h4 className="text-sm font-bold mb-1 truncate" style={{ color: activeTheme.colors.text }}>
                            {announcement.title}
                          </h4>
                          <p className="text-xs" style={{ color: activeTheme.colors.textSecondary }}>
                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {isActive && <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: announcementTheme.colors.accent }} />}
                      </div>
                    </motion.button>
                  );
                })}

                {pagination.hasMore && (
                  <button
                    onClick={loadMoreAnnouncements}
                    disabled={isLoading}
                    className="w-full p-4 text-sm font-bold transition-all disabled:opacity-50"
                    style={{ color: activeTheme.colors.accent }}
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </div>
            </div>

            {/* Detail Pane */}
            <div className="flex-1 overflow-y-auto p-8 relative">
              {selectedAnnouncement ? (
                <motion.div
                  key={selectedAnnouncement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {selectedAnnouncement.hero_image_url && (
                    <img
                      src={selectedAnnouncement.hero_image_url}
                      alt={selectedAnnouncement.title}
                      className="w-full h-72 object-cover rounded-xl mb-6 shadow-lg"
                    />
                  )}

                  <div className="mb-6">
                    <h1 className="text-4xl font-bold mb-3" style={{ color: activeTheme.colors.text, fontFamily: activeTheme.typography.fontFamily }}>
                      {selectedAnnouncement.title}
                    </h1>
                    <p className="text-sm" style={{ color: activeTheme.colors.textSecondary }}>
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="prose-custom max-w-none">
                    <MarkdownRenderer content={selectedAnnouncement.content} />
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ color: activeTheme.colors.textSecondary }}>
                  Select an announcement
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
