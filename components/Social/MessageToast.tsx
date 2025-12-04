import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

export interface MessageToastProps {
  isVisible: boolean;
  senderUsername: string;
  senderAvatar?: string;
  messagePreview: string;
  onDismiss: () => void;
  onClick: () => void;
}

/**
 * Toast notification for incoming DMs
 * Matches the style of AI response toasts with smooth animations
 */
export const MessageToast: React.FC<MessageToastProps> = ({
  isVisible,
  senderUsername,
  senderAvatar,
  messagePreview,
  onDismiss,
  onClick
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-20 right-4 z-[10000] max-w-sm w-full"
        >
          <div
            onClick={onClick}
            className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-500/20 overflow-hidden cursor-pointer hover:border-cyan-400/60 transition-all"
          >
            {/* Holographic overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: `
                  linear-gradient(135deg,
                    rgba(6, 182, 212, 0.15) 0%,
                    transparent 50%,
                    rgba(6, 182, 212, 0.15) 100%
                  )
                `
              }}
            />

            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent)',
                filter: 'blur(8px)'
              }}
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }}
            />

            <div className="relative p-4 flex items-start gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-cyan-500/50 flex-shrink-0 shadow-lg shadow-cyan-500/30">
                {senderAvatar ? (
                  <img
                    src={senderAvatar}
                    alt={senderUsername}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-cyan-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                    New Message
                  </span>
                </div>
                <p className="text-sm font-semibold text-cyan-100 font-mono mb-1">
                  {senderUsername}
                </p>
                <p className="text-xs text-cyan-300/80 font-mono line-clamp-2">
                  {messagePreview}
                </p>
              </div>

              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-800/50 transition-colors group"
              >
                <X className="w-4 h-4 text-cyan-500/60 group-hover:text-cyan-400" />
              </button>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
