import React from 'react';
import { motion } from 'framer-motion';
import { Code2, BookOpen } from 'lucide-react';
import clsx from 'clsx';

interface CategorySelectorProps {
  selected: 'code' | 'prose';
  onChange: (category: 'code' | 'prose') => void;
  className?: string;
}

export function CategorySelector({ selected, onChange, className }: CategorySelectorProps) {
  return (
    <div className={clsx("flex gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800", className)}>
      {/* CODE Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onChange('code')}
        className={clsx(
          "flex-1 p-4 rounded-lg font-mono transition-all duration-300 relative overflow-hidden",
          selected === 'code'
            ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 border-2 border-violet-500/50 text-violet-300 shadow-lg shadow-violet-900/30"
            : "bg-slate-800/30 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600"
        )}
      >
        {/* Animated background glow for selected state */}
        {selected === 'code' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        <div className="relative z-10">
          <Code2 className="w-6 h-6 mx-auto mb-2" />
          <div className="text-sm font-bold tracking-wider">CODE</div>
          <div className="text-xs text-slate-500 mt-1">
            Functions, syntax, snippets
          </div>
        </div>

        {/* Corner accent */}
        {selected === 'code' && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
        )}
      </motion.button>

      {/* PROSE Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onChange('prose')}
        className={clsx(
          "flex-1 p-4 rounded-lg font-mono transition-all duration-300 relative overflow-hidden",
          selected === 'prose'
            ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-900/30"
            : "bg-slate-800/30 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600"
        )}
      >
        {/* Animated background glow for selected state */}
        {selected === 'prose' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        <div className="relative z-10">
          <BookOpen className="w-6 h-6 mx-auto mb-2" />
          <div className="text-sm font-bold tracking-wider">PROSE</div>
          <div className="text-xs text-slate-500 mt-1">
            Articles, stories, excerpts
          </div>
        </div>

        {/* Corner accent */}
        {selected === 'prose' && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </motion.button>
    </div>
  );
}
