import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  tactical: ['🎯', '⚡', '🔥', '💫', '✨', '🚀', '💥', '⭐'],
  status: ['👍', '👎', '👀', '💯', '🎉', '❤️', '😂', '😮'],
  signals: ['📡', '🛰️', '📊', '🔔', '⚠️', '✅', '❌', '🔒']
};

export default function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={pickerRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute z-50 bg-slate-900 border border-cyan-500/40 rounded-xl p-3 shadow-2xl shadow-cyan-900/30 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)'
        }}
      >
        {/* Glitch effect overlay */}
        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '10px 10px'
          }} />
        </div>

        <div className="relative space-y-3">
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis], categoryIndex) => (
            <div key={category}>
              <p className="text-cyan-400 text-xs font-mono uppercase tracking-wider mb-2 px-1">
                {category}
              </p>
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji, index) => (
                  <motion.button
                    key={emoji}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (categoryIndex * emojis.length + index) * 0.01 }}
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelect(emoji)}
                    className="
                      w-10 h-10 flex items-center justify-center
                      text-2xl rounded-lg
                      bg-slate-800/50 hover:bg-cyan-500/20
                      border border-transparent hover:border-cyan-500/50
                      transition-all duration-200
                      shadow-lg hover:shadow-cyan-500/20
                    "
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Corner accent */}
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/50 rounded-bl-xl" />
      </motion.div>
    </AnimatePresence>
  );
}
