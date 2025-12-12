"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bug, Settings, Calendar, ArrowUpCircle, ChevronRight } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import type { Announcement } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatDistanceToNow } from 'date-fns';

const categoryIcons: Record<Announcement['category'], any> = {
  feature: Sparkles,
  fix: Bug,
  system: Settings,
  event: Calendar,
  update: ArrowUpCircle
};

const categoryLabels: Record<Announcement['category'], string> = {
  feature: 'Feature',
  fix: 'Fix',
  system: 'System',
  event: 'Event',
  update: 'Update'
};

const categoryColors: Record<Announcement['category'], { text: string; bg: string; border: string }> = {
  feature: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  fix: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  system: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  event: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  update: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' }
};

export function ChangelogModal() {
  const isModalOpen = useOrbitStore((s) => s.announcements.isModalOpen);
  const activeAnnouncementId = useOrbitStore((s) => s.announcements.activeAnnouncementId);
  const announcements = useOrbitStore((s) => s.announcements.list);
  const selectedCategories = useOrbitStore((s) => s.announcements.selectedCategories);
  const pagination = useOrbitStore((s) => s.announcements.pagination);
  const isLoading = useOrbitStore((s) => s.announcements.isLoading);

  const closeChangelogModal = useOrbitStore((s) => s.closeChangelogModal);
  const toggleCategory = useOrbitStore((s) => s.toggleCategory);
  const loadMoreAnnouncements = useOrbitStore((s) => s.loadMoreAnnouncements);

  const detailPaneRef = useRef<HTMLDivElement>(null);
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

  if (!isModalOpen) return null;

  const selectedAnnouncement = selectedId
    ? announcements.find(a => a.id === selectedId) || announcements[0]
    : announcements[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeChangelogModal}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-6xl h-[85vh] bg-slate-900 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-700"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h2 id="changelog-title" className="text-2xl font-bold text-white">
              Changelog
            </h2>
            <button
              onClick={closeChangelogModal}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-slate-800/50 border-r border-slate-700 flex flex-col">
              {/* Category Filters */}
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Filter by Category</h3>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(categoryLabels) as Announcement['category'][]).map((category) => {
                    const Icon = categoryIcons[category];
                    const colors = categoryColors[category];
                    const isSelected = selectedCategories.includes(category);

                    return (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? `${colors.bg} ${colors.text} border ${colors.border}`
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 border border-transparent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {categoryLabels[category]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Announcements List */}
              <div className="flex-1 overflow-y-auto">
                {announcements.length === 0 && !isLoading && (
                  <div className="p-6 text-center text-slate-400">
                    No announcements found
                  </div>
                )}

                {announcements.map((announcement, index) => {
                  const Icon = categoryIcons[announcement.category];
                  const colors = categoryColors[announcement.category];
                  const isActive = selectedId === announcement.id;

                  return (
                    <motion.button
                      key={announcement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedId(announcement.id)}
                      className={`w-full p-4 text-left border-b border-slate-700/50 transition-colors ${
                        isActive
                          ? 'bg-slate-700/50 border-l-2 border-l-cyan-500'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {announcement.is_pinned && (
                              <span className="px-1.5 py-0.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded">
                                PINNED
                              </span>
                            )}
                            {announcement.version && (
                              <span className="text-xs font-mono text-slate-400">
                                v{announcement.version}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-white mb-1 truncate">
                            {announcement.title}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {isActive && (
                          <ChevronRight className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {/* Load More Button */}
                {pagination.hasMore && (
                  <button
                    onClick={loadMoreAnnouncements}
                    disabled={isLoading}
                    className="w-full p-4 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:bg-slate-700/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </div>
            </div>

            {/* Detail Pane */}
            <div
              ref={detailPaneRef}
              className="flex-1 overflow-y-auto p-6"
            >
              {selectedAnnouncement ? (
                <motion.div
                  key={selectedAnnouncement.id}
                  id={`announcement-${selectedAnnouncement.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Hero Image */}
                  {selectedAnnouncement.hero_image_url && (
                    <img
                      src={selectedAnnouncement.hero_image_url}
                      alt={selectedAnnouncement.title}
                      className="w-full h-64 object-cover rounded-lg mb-6"
                    />
                  )}

                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedAnnouncement.version && (
                        <span className="px-2 py-1 text-sm font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded">
                          v{selectedAnnouncement.version}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-sm font-medium rounded ${
                        categoryColors[selectedAnnouncement.category].bg
                      } ${categoryColors[selectedAnnouncement.category].text}`}>
                        {categoryLabels[selectedAnnouncement.category]}
                      </span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {selectedAnnouncement.title}
                    </h1>
                    <p className="text-sm text-slate-400">
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="prose prose-invert prose-slate max-w-none">
                    <MarkdownRenderer content={selectedAnnouncement.content} />
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Select an announcement to view details
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
