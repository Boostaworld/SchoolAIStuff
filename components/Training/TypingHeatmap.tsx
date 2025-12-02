import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOrbitStore } from '../../store/useOrbitStore';
import { KeyStat } from '../../types';
import { TrendingDown, TrendingUp, Zap } from 'lucide-react';

// Standard QWERTY keyboard layout
const KEYBOARD_LAYOUT = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];

export const TypingHeatmap: React.FC = () => {
  const { typingHeatmap } = useOrbitStore();

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const stats = Object.values(typingHeatmap);
    if (stats.length === 0) return { avgAccuracy: 100, totalPresses: 0, totalErrors: 0 };

    const totalPresses = stats.reduce((sum, s) => sum + s.presses, 0);
    const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);
    const avgAccuracy = totalPresses > 0 ? ((totalPresses - totalErrors) / totalPresses) * 100 : 100;

    return { avgAccuracy: Math.round(avgAccuracy), totalPresses, totalErrors };
  }, [typingHeatmap]);

  // Get weakest keys (highest error rate)
  const weakestKeys = useMemo(() => {
    return Object.entries(typingHeatmap)
      .filter(([_, stat]) => stat.presses >= 3) // Only keys with enough data
      .sort((a, b) => a[1].accuracy - b[1].accuracy)
      .slice(0, 5);
  }, [typingHeatmap]);

  // Get strongest keys (highest accuracy)
  const strongestKeys = useMemo(() => {
    return Object.entries(typingHeatmap)
      .filter(([_, stat]) => stat.presses >= 3)
      .sort((a, b) => b[1].accuracy - a[1].accuracy)
      .slice(0, 5);
  }, [typingHeatmap]);

  // Get color based on accuracy
  const getKeyColor = (accuracy: number): string => {
    if (accuracy >= 95) return 'from-emerald-500 to-teal-500';
    if (accuracy >= 85) return 'from-cyan-500 to-blue-500';
    if (accuracy >= 75) return 'from-amber-500 to-orange-500';
    if (accuracy >= 60) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-rose-600';
  };

  const getKeyGlow = (accuracy: number): string => {
    if (accuracy >= 95) return 'shadow-[0_0_15px_rgba(16,185,129,0.4)]';
    if (accuracy >= 85) return 'shadow-[0_0_15px_rgba(6,182,212,0.3)]';
    if (accuracy >= 75) return 'shadow-[0_0_15px_rgba(245,158,11,0.3)]';
    if (accuracy >= 60) return 'shadow-[0_0_15px_rgba(249,115,22,0.3)]';
    return 'shadow-[0_0_15px_rgba(239,68,68,0.4)]';
  };

  const getKeyBorder = (accuracy: number): string => {
    if (accuracy >= 95) return 'border-emerald-500/50';
    if (accuracy >= 85) return 'border-cyan-500/50';
    if (accuracy >= 75) return 'border-amber-500/50';
    if (accuracy >= 60) return 'border-orange-500/50';
    return 'border-red-500/50';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full space-y-8"
    >
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-slate-500 uppercase font-mono">Total Keystrokes</span>
          </div>
          <p className="text-4xl font-bold text-cyan-400 font-mono">{overallStats.totalPresses}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-slate-500 uppercase font-mono">Avg Accuracy</span>
          </div>
          <p className="text-4xl font-bold text-emerald-400 font-mono">{overallStats.avgAccuracy}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-sm text-slate-500 uppercase font-mono">Total Errors</span>
          </div>
          <p className="text-4xl font-bold text-red-400 font-mono">{overallStats.totalErrors}</p>
        </motion.div>
      </div>

      {/* Keyboard Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-8 rounded-2xl bg-slate-900/30 border border-slate-700/50 backdrop-blur-md"
      >
        <h3 className="text-lg font-bold text-white font-mono mb-6 flex items-center gap-2">
          <span className="text-cyan-400">⌨</span> KEYSTROKE HEATMAP
        </h3>

        <div className="space-y-3 max-w-4xl mx-auto">
          {KEYBOARD_LAYOUT.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-2 justify-center">
              {/* Row offset for realistic keyboard layout */}
              <div style={{ width: `${rowIdx * 20}px` }} />

              {row.map((key, keyIdx) => {
                const stat = typingHeatmap[key];
                const accuracy = stat?.accuracy ?? 100;
                const hasData = stat && stat.presses > 0;

                return (
                  <motion.div
                    key={keyIdx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + rowIdx * 0.1 + keyIdx * 0.02 }}
                    whileHover={{ scale: 1.1, zIndex: 10 }}
                    className="relative group"
                  >
                    <div
                      className={`
                        w-12 h-12 rounded-lg font-mono font-bold flex items-center justify-center
                        border transition-all duration-300 cursor-pointer
                        ${hasData
                          ? `bg-gradient-to-br ${getKeyColor(accuracy)} ${getKeyGlow(accuracy)} ${getKeyBorder(accuracy)} text-white`
                          : 'bg-slate-800/30 border-slate-700/30 text-slate-600'
                        }
                      `}
                    >
                      {key.toUpperCase()}
                    </div>

                    {/* Tooltip */}
                    {hasData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      >
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Key:</span>
                            <span className="text-white font-bold">{key}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Accuracy:</span>
                            <span className={`font-bold ${accuracy >= 85 ? 'text-emerald-400' : accuracy >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                              {Math.round(accuracy)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Presses:</span>
                            <span className="text-cyan-400">{stat.presses}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Errors:</span>
                            <span className="text-red-400">{stat.errors}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}

          {/* Spacebar */}
          <div className="flex justify-center mt-3">
            <div style={{ width: '40px' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              className="relative group"
            >
              {(() => {
                const stat = typingHeatmap[' '];
                const accuracy = stat?.accuracy ?? 100;
                const hasData = stat && stat.presses > 0;

                return (
                  <>
                    <div
                      className={`
                        w-96 h-12 rounded-lg font-mono font-bold flex items-center justify-center
                        border transition-all duration-300 cursor-pointer
                        ${hasData
                          ? `bg-gradient-to-br ${getKeyColor(accuracy)} ${getKeyGlow(accuracy)} ${getKeyBorder(accuracy)} text-white`
                          : 'bg-slate-800/30 border-slate-700/30 text-slate-600'
                        }
                      `}
                    >
                      SPACE
                    </div>

                    {hasData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      >
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Accuracy:</span>
                            <span className={`font-bold ${accuracy >= 85 ? 'text-emerald-400' : accuracy >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                              {Math.round(accuracy)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Presses:</span>
                            <span className="text-cyan-400">{stat.presses}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Errors:</span>
                            <span className="text-red-400">{stat.errors}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-teal-500" />
            <span className="text-slate-500">95%+ Perfect</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-500 to-blue-500" />
            <span className="text-slate-500">85-94% Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-500 to-orange-500" />
            <span className="text-slate-500">75-84% Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-red-500 to-rose-600" />
            <span className="text-slate-500">&lt;75% Weak</span>
          </div>
        </div>
      </motion.div>

      {/* Weakest & Strongest Keys */}
      <div className="grid grid-cols-2 gap-6">
        {/* Weakest Keys */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0 }}
          className="p-6 rounded-xl bg-red-500/5 border border-red-500/20 backdrop-blur-sm"
        >
          <h4 className="text-sm font-bold text-red-400 font-mono mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            FOCUS KEYS (Weakest)
          </h4>
          <div className="space-y-2">
            {weakestKeys.length > 0 ? (
              weakestKeys.map(([key, stat], idx) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + idx * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-red-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center font-bold text-white text-sm">
                      {key === ' ' ? '⎵' : key.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{stat.presses} presses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-400 font-mono">{Math.round(stat.accuracy)}%</p>
                    <p className="text-xs text-slate-600">{stat.errors} errors</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-slate-600 text-sm text-center py-4">No data yet. Start typing!</p>
            )}
          </div>
        </motion.div>

        {/* Strongest Keys */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.0 }}
          className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-sm"
        >
          <h4 className="text-sm font-bold text-emerald-400 font-mono mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            MASTERED KEYS (Strongest)
          </h4>
          <div className="space-y-2">
            {strongestKeys.length > 0 ? (
              strongestKeys.map(([key, stat], idx) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + idx * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-emerald-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white text-sm">
                      {key === ' ' ? '⎵' : key.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{stat.presses} presses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400 font-mono">{Math.round(stat.accuracy)}%</p>
                    <p className="text-xs text-slate-600">{stat.errors} errors</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-slate-600 text-sm text-center py-4">No data yet. Start typing!</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
