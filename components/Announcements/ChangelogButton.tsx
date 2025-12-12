"use client";

import { motion } from 'framer-motion';
import { Megaphone, Sparkles } from 'lucide-react';
import { useOrbitStore } from '@/store/useOrbitStore';

export function ChangelogButton() {
  const openChangelogModal = useOrbitStore((s) => s.openChangelogModal);
  const unreadCount = useOrbitStore((s) => {
    const dismissedIds = s.announcements.dismissedIds;
    const announcements = s.announcements.list;

    // Count announcements created in last 7 days that aren't dismissed
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return announcements.filter(a => {
      const createdAt = new Date(a.created_at);
      return createdAt > sevenDaysAgo && !dismissedIds.has(a.id);
    }).length;
  });

  return (
    <motion.button
      onClick={() => openChangelogModal()}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg transition-all"
    >
      <Sparkles className="w-5 h-5" />
      <span className="hidden sm:inline">What's New</span>
      <span className="sm:hidden">Updates</span>

      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-900"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </motion.button>
  );
}
