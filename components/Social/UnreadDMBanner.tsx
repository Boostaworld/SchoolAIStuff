import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronRight, Zap } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { getTotalUnreadCount } from '../../lib/utils/notifications';

export default function UnreadDMBanner() {
  const { dmChannels, toggleCommsPanel, setActiveChannel, commsPanelOpen } = useOrbitStore();

  const totalUnread = getTotalUnreadCount(dmChannels);
  const shouldShow = totalUnread > 0 && !commsPanelOpen;

  const handleClick = () => {
    // Open comms panel
    toggleCommsPanel();

    // Auto-select first unread channel
    const firstUnreadChannel = dmChannels.find(c => (c.unreadCount || 0) > 0);
    if (firstUnreadChannel) {
      setActiveChannel(firstUnreadChannel.id);
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300
          }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] cursor-pointer group"
          onClick={handleClick}
        >
          {/* Glowing outer aura */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 rounded-full blur-2xl"
          />

          {/* Main banner container */}
          <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-orange-500/50 rounded-full shadow-2xl shadow-orange-500/30 overflow-hidden">
            {/* Animated background gradient */}
            <motion.div
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent"
            />

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(249, 115, 22, 0.2) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(249, 115, 22, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '10px 10px'
              }}
            />

            {/* Scanline effect */}
            <motion.div
              animate={{
                y: ['-100%', '200%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
              style={{ height: '30%' }}
            />

            {/* Content */}
            <div className="relative flex items-center gap-4 px-6 py-4">
              {/* Icon container */}
              <div className="relative">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                  className="relative"
                >
                  <MessageCircle className="w-6 h-6 text-orange-400" />

                  {/* Notification pulse */}
                  <motion.div
                    animate={{
                      scale: [0, 1.5, 1.5],
                      opacity: [0.8, 0, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                    className="absolute inset-0 bg-orange-400 rounded-full"
                  />
                </motion.div>

                {/* Lightning bolt accent */}
                <motion.div
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="absolute -top-1 -right-1"
                >
                  <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                </motion.div>
              </div>

              {/* Text content */}
              <div className="flex flex-col gap-0.5">
                <p className="text-orange-400 font-mono text-sm font-bold tracking-wider uppercase">
                  Incoming Transmission
                </p>
                <p className="text-orange-300/80 font-mono text-xs tracking-wide">
                  {totalUnread} unread message{totalUnread !== 1 ? 's' : ''} waiting
                </p>
              </div>

              {/* Unread count badge */}
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="flex items-center justify-center min-w-[36px] h-9 px-3 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-full border-2 border-orange-300/50 shadow-lg shadow-orange-500/50"
                >
                  <span className="text-white font-mono text-sm font-bold tracking-wider drop-shadow-lg">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                </motion.div>
              </div>

              {/* Arrow indicator */}
              <motion.div
                animate={{
                  x: [0, 4, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <ChevronRight className="w-5 h-5 text-orange-400" />
              </motion.div>
            </div>

            {/* Bottom glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
          </div>

          {/* Hover state glow enhancement */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-full blur-xl pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
