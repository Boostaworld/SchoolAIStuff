import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

export interface PersistentBannerData {
  id: string;
  senderUsername: string;
  senderAvatar?: string;
  messagePreview: string;
  timestamp: string;
  channelId: string;
}

export interface PersistentMessageBannerProps {
  banners: PersistentBannerData[];
  onDismiss: (bannerId: string) => void;
  onBannerClick: (channelId: string) => void;
}

const BANNER_AUTO_DISMISS_TIME = 120000; // 2 minutes in milliseconds

/**
 * Persistent message banner that appears at the top of the page
 * Shows a dismissible banner for each unread message notification
 * Auto-dismisses after 2 minutes
 */
export const PersistentMessageBanner: React.FC<PersistentMessageBannerProps> = ({
  banners,
  onDismiss,
  onBannerClick
}) => {
  // Auto-dismiss banners after 2 minutes
  useEffect(() => {
    if (banners.length === 0) return;

    const timers = banners.map(banner => {
      return setTimeout(() => {
        onDismiss(banner.id);
      }, BANNER_AUTO_DISMISS_TIME);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [banners, onDismiss]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-[9999] pointer-events-none">
      <div className="container mx-auto px-4 space-y-2 pointer-events-auto">
        <AnimatePresence>
          {banners.map((banner) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative"
            >
              <div
                onClick={() => onBannerClick(banner.channelId)}
                className="relative bg-gradient-to-r from-cyan-900/95 via-slate-900/95 to-cyan-900/95 backdrop-blur-xl border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/30 overflow-hidden cursor-pointer hover:border-cyan-400/70 transition-all group"
              >
                {/* Animated glow effect */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.4), transparent 70%)'
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                </div>

                <div className="relative p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-cyan-500/50 flex-shrink-0 shadow-lg shadow-cyan-500/30">
                    {banner.senderAvatar ? (
                      <img
                        src={banner.senderAvatar}
                        alt={banner.senderUsername}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MessageCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-bold text-cyan-100 font-mono">
                        {banner.senderUsername}
                      </span>
                      <span className="text-xs text-cyan-400/60 font-mono">
                        messaged you at {formatTime(banner.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-cyan-300/80 font-mono mt-1 line-clamp-1 sm:line-clamp-2">
                      {banner.messagePreview}
                    </p>
                    <p className="text-xs text-cyan-400/60 font-mono mt-1.5 group-hover:text-cyan-400 transition-colors">
                      Click to view conversation →
                    </p>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(banner.id);
                    }}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/20 border border-transparent hover:border-red-500/50 transition-all group/btn"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-5 h-5 text-cyan-500/60 group-hover/btn:text-red-400" />
                  </button>
                </div>

                {/* Bottom accent line with countdown */}
                <motion.div
                  className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: BANNER_AUTO_DISMISS_TIME / 1000, ease: 'linear' }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
