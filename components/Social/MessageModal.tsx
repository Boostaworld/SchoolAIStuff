/**
 * Message Modal for Long Messages
 * Opens when messages exceed 10 lines for better readability
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  timestamp: string;
  senderUsername?: string;
  senderAvatar?: string;
  isSelf: boolean;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  content,
  timestamp,
  senderUsername,
  senderAvatar,
  isSelf
}) => {
  if (!isOpen) return null;

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] z-50"
          >
            <div className="bg-slate-950/98 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-900/20 overflow-hidden">
              {/* Header */}
              <div className="border-b border-cyan-500/20 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!isSelf && senderAvatar && (
                    <img
                      src={senderAvatar}
                      alt={senderUsername}
                      className="w-10 h-10 rounded-full border-2 border-cyan-500/30"
                    />
                  )}
                  <div>
                    {!isSelf && senderUsername && (
                      <p className="text-cyan-300 font-mono font-semibold">
                        {senderUsername}
                      </p>
                    )}
                    <p className="text-cyan-500/60 text-xs font-mono">
                      {formatTimestamp(timestamp)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors group"
                >
                  <X className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div className="bg-slate-900/30 rounded-xl p-6 border border-cyan-500/20">
                  <MarkdownRenderer content={content} className="text-base leading-relaxed" />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
