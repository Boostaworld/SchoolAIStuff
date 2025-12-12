"use client";

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Sparkles, Bug, Settings, Calendar, ArrowUpCircle } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';
import type { Announcement } from '@/types';

const categoryIcons: Record<Announcement['category'], any> = {
  feature: Sparkles,
  fix: Bug,
  system: Settings,
  event: Calendar,
  update: ArrowUpCircle
};

const categoryColors: Record<Announcement['category'], string> = {
  feature: 'text-cyan-400',
  fix: 'text-green-400',
  system: 'text-amber-400',
  event: 'text-purple-400',
  update: 'text-blue-400'
};

export function AnnouncementBanner() {
  const activeBanner = useOrbitStore((s) => s.announcements.activeBanner);
  const dismissBanner = useOrbitStore((s) => s.dismissBanner);
  const openChangelogModal = useOrbitStore((s) => s.openChangelogModal);
  const fetchActiveBanner = useOrbitStore((s) => s.fetchActiveBanner);

  useEffect(() => {
    fetchActiveBanner();
  }, [fetchActiveBanner]);

  if (!activeBanner) return null;

  const Icon = categoryIcons[activeBanner.category];
  const colorClass = categoryColors[activeBanner.category];

  const handleViewDetails = () => {
    openChangelogModal(activeBanner.id);
    dismissBanner(activeBanner.id);
  };

  const handleDismiss = () => {
    dismissBanner(activeBanner.id);
  };

  return (
    <AnimatePresence>
      {activeBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-2 border-cyan-500 shadow-lg shadow-cyan-500/20"
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Category Icon */}
              <div className="flex-shrink-0">
                <Icon className={`w-6 h-6 ${colorClass}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {activeBanner.title}
                  </h3>
                  {activeBanner.summary && (
                    <p className="text-sm text-slate-300 truncate">
                      {activeBanner.summary}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleViewDetails}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
