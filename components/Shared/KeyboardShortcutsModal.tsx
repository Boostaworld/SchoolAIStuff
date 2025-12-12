import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command, Keyboard } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
  cmd?: boolean;
  ctrl?: boolean;
  shift?: boolean;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { key: '1-9', description: 'Switch between tabs', category: 'Navigation', cmd: true },
  { key: 'N', description: 'Create New Task', category: 'Actions', cmd: true },
  { key: 'M', description: 'Toggle Messages', category: 'Actions', cmd: true },
  { key: '/', description: 'Show Keyboard Shortcuts', category: 'Help', cmd: true },
  { key: '?', description: 'Show Keyboard Shortcuts', category: 'Help', shift: true },
];

const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
  if (!acc[shortcut.category]) {
    acc[shortcut.category] = [];
  }
  acc[shortcut.category].push(shortcut);
  return acc;
}, {} as Record<string, Shortcut[]>);

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
              {/* Scanline effect */}
              <div
                className="absolute inset-0 pointer-events-none opacity-5"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.3) 2px, rgba(6, 182, 212, 0.3) 4px)'
                }}
              />

              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none" />

              {/* Header */}
              <div className="relative border-b border-cyan-500/20 p-6 bg-gradient-to-r from-cyan-500/10 to-violet-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Keyboard className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-cyan-300 font-mono tracking-wider">
                      KEYBOARD SHORTCUTS
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-2 text-cyan-500/60 text-sm font-mono">
                  Press {isMac ? 'Cmd' : 'Ctrl'} + / or ? to toggle this panel
                </p>
              </div>

              {/* Content */}
              <div className="relative p-6 max-h-[60vh] overflow-y-auto">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category} className="mb-8 last:mb-0">
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 to-transparent" />
                      <h3 className="text-sm font-mono text-cyan-400 tracking-wider uppercase">
                        {category}
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/20 to-transparent" />
                    </div>

                    {/* Shortcuts List */}
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-900/40 border border-cyan-500/10 rounded-lg hover:border-cyan-500/30 hover:bg-slate-900/60 transition-all group"
                        >
                          <span className="text-slate-300 font-mono text-sm">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-2">
                            {shortcut.cmd && (
                              <kbd className="px-2 py-1 bg-slate-800/80 border border-cyan-500/30 rounded text-cyan-300 text-xs font-mono shadow-lg group-hover:border-cyan-400/50 transition-colors">
                                {isMac ? '⌘' : 'Ctrl'}
                              </kbd>
                            )}
                            {shortcut.shift && (
                              <kbd className="px-2 py-1 bg-slate-800/80 border border-cyan-500/30 rounded text-cyan-300 text-xs font-mono shadow-lg group-hover:border-cyan-400/50 transition-colors">
                                ⇧
                              </kbd>
                            )}
                            <kbd className="px-2 py-1 bg-slate-800/80 border border-cyan-500/30 rounded text-cyan-300 text-xs font-mono shadow-lg group-hover:border-cyan-400/50 transition-colors min-w-[2rem] text-center">
                              {shortcut.key}
                            </kbd>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Footer Tip */}
                <div className="mt-8 p-4 bg-gradient-to-r from-cyan-500/5 to-violet-500/5 border border-cyan-500/20 rounded-lg">
                  <p className="text-xs text-cyan-400/70 font-mono text-center">
                    💡 Pro tip: Most shortcuts work globally across the app
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
