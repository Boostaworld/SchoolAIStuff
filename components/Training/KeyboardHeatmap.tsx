"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface KeyStat {
  errors: number;
  presses: number;
  accuracy: number;
}

interface KeyboardHeatmapProps {
  heatmap: Record<string, KeyStat>;
}

interface KeyData {
  char: string;
  width?: number; // relative width multiplier
}

// Keyboard layout definition
const KEYBOARD_LAYOUT: KeyData[][] = [
  [
    { char: '`' }, { char: '1' }, { char: '2' }, { char: '3' },
    { char: '4' }, { char: '5' }, { char: '6' }, { char: '7' },
    { char: '8' }, { char: '9' }, { char: '0' }, { char: '-' },
    { char: '=' }
  ],
  [
    { char: 'Q' }, { char: 'W' }, { char: 'E' }, { char: 'R' },
    { char: 'T' }, { char: 'Y' }, { char: 'U' }, { char: 'I' },
    { char: 'O' }, { char: 'P' }, { char: '[' }, { char: ']' }
  ],
  [
    { char: 'A' }, { char: 'S' }, { char: 'D' }, { char: 'F' },
    { char: 'G' }, { char: 'H' }, { char: 'J' }, { char: 'K' },
    { char: 'L' }, { char: ';' }, { char: '\'' }
  ],
  [
    { char: 'Z' }, { char: 'X' }, { char: 'C' }, { char: 'V' },
    { char: 'B' }, { char: 'N' }, { char: 'M' }, { char: ',' },
    { char: '.' }, { char: '/' }
  ],
  [
    { char: 'SPACE', width: 8 }
  ]
];

// Get color styling based on accuracy
const getKeyColors = (accuracy: number | undefined) => {
  if (accuracy === undefined) {
    return {
      bg: 'bg-slate-800/40',
      border: 'border-slate-700/60',
      glow: 'shadow-slate-700/0',
      text: 'text-slate-400',
      pulseColor: 'slate'
    };
  }

  if (accuracy >= 90) {
    return {
      bg: 'bg-green-500/30',
      border: 'border-green-500/50',
      glow: 'shadow-green-500/50',
      text: 'text-green-400',
      pulseColor: 'green'
    };
  }

  if (accuracy >= 75) {
    return {
      bg: 'bg-yellow-500/30',
      border: 'border-yellow-500/50',
      glow: 'shadow-yellow-500/50',
      text: 'text-yellow-400',
      pulseColor: 'yellow'
    };
  }

  if (accuracy >= 50) {
    return {
      bg: 'bg-orange-500/30',
      border: 'border-orange-500/50',
      glow: 'shadow-orange-500/50',
      text: 'text-orange-400',
      pulseColor: 'orange'
    };
  }

  return {
    bg: 'bg-red-500/30',
    border: 'border-red-500/50',
    glow: 'shadow-red-500/50',
    text: 'text-red-400',
    pulseColor: 'red'
  };
};

// Individual key component
const KeyboardKey: React.FC<{
  keyData: KeyData;
  stat?: KeyStat;
  rowIndex: number;
  keyIndex: number;
}> = ({ keyData, stat, rowIndex, keyIndex }) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = getKeyColors(stat?.accuracy);
  const shouldPulse = stat && stat.accuracy < 50;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: rowIndex * 0.05 + keyIndex * 0.01,
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      }}
      style={{
        gridColumn: keyData.width ? `span ${keyData.width}` : 'span 1'
      }}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Key button */}
      <motion.button
        className={`
          relative w-full aspect-square rounded-lg
          ${colors.bg} ${colors.border} ${colors.text}
          border-2 backdrop-blur-sm
          font-mono font-bold text-sm
          transition-all duration-300
          flex items-center justify-center
          overflow-hidden
          ${shouldPulse ? 'animate-pulse-glow' : ''}
        `}
        whileHover={{
          scale: 1.05,
          boxShadow: `0 0 20px ${colors.glow.includes('slate') ? 'rgba(100, 116, 139, 0.3)' : 'currentColor'}`,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Key ${keyData.char}`}
      >
        {/* Scanning line effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent"
          initial={{ y: '-100%' }}
          animate={{ y: '200%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'linear'
          }}
        />

        {/* Key character */}
        <span className="relative z-10 select-none">
          {keyData.char === 'SPACE' ? '␣' : keyData.char}
        </span>

        {/* Corner accent */}
        {stat && (
          <motion.div
            className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${colors.bg}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          />
        )}

        {/* Glow effect on hover */}
        <motion.div
          className={`absolute inset-0 rounded-lg ${colors.border} opacity-0 blur-md`}
          animate={{
            opacity: isHovered ? 0.6 : 0
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && stat && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            {/* Tooltip content */}
            <div className="relative">
              {/* Glassmorphic card */}
              <div className="bg-slate-950/95 backdrop-blur-xl border-2 border-cyan-400/40 rounded-lg px-3 py-2 shadow-2xl shadow-cyan-500/20">
                {/* Data grid */}
                <div className="space-y-1 min-w-[140px]">
                  {/* Key name */}
                  <div className="text-center mb-1.5 pb-1.5 border-b border-cyan-400/30">
                    <span className="font-mono text-cyan-400 font-bold text-lg">
                      {keyData.char}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-mono">Accuracy:</span>
                    <span className={`${colors.text} text-xs font-mono font-bold`}>
                      {stat.accuracy.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-mono">Presses:</span>
                    <span className="text-cyan-400 text-xs font-mono font-bold">
                      {stat.presses}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-mono">Errors:</span>
                    <span className="text-red-400 text-xs font-mono font-bold">
                      {stat.errors}
                    </span>
                  </div>
                </div>

                {/* Scanline effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none"
                  animate={{ y: ['-100%', '200%'] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                />
              </div>

              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
                <div className="border-8 border-transparent border-t-cyan-400/40" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
                  <div className="border-[7px] border-transparent border-t-slate-950/95" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main component
export const KeyboardHeatmap: React.FC<KeyboardHeatmapProps> = ({ heatmap }) => {
  return (
    <div className="w-full">
      {/* Container with glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative rounded-2xl bg-slate-950/60 backdrop-blur-xl border-2 border-slate-800/80 p-6 shadow-2xl overflow-hidden"
      >
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-cyan-400/30 rounded-tl-2xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-cyan-400/30 rounded-br-2xl" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6 relative z-10"
        >
          <h3 className="text-2xl font-bold text-cyan-400 font-mono tracking-tight mb-2">
            KEYBOARD HEATMAP
          </h3>
          <p className="text-slate-400 text-sm font-mono">
            Key accuracy analysis / Color-coded performance metrics
          </p>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-wrap gap-4 mb-6 relative z-10"
        >
          {[
            { label: '90-100%', color: 'bg-green-500/30 border-green-500/50 text-green-400' },
            { label: '75-90%', color: 'bg-yellow-500/30 border-yellow-500/50 text-yellow-400' },
            { label: '50-75%', color: 'bg-orange-500/30 border-orange-500/50 text-orange-400' },
            { label: '<50%', color: 'bg-red-500/30 border-red-500/50 text-red-400' },
            { label: 'No data', color: 'bg-slate-800/40 border-slate-700/60 text-slate-400' }
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <div className={`w-4 h-4 rounded border-2 ${item.color}`} />
              <span className="text-xs font-mono text-slate-300">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Keyboard layout */}
        <div className="relative z-10 space-y-2">
          {KEYBOARD_LAYOUT.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${
                  rowIndex === 4 ? 8 : rowIndex === 0 ? 13 : rowIndex === 1 ? 12 : rowIndex === 2 ? 11 : 10
                }, minmax(0, 1fr))`,
                justifyItems: 'stretch'
              }}
            >
              {row.map((keyData, keyIndex) => {
                // Normalize key for lookup (handle space, convert to lowercase)
                const normalizedKey = keyData.char === 'SPACE' ? ' ' : keyData.char.toLowerCase();
                const stat = heatmap[normalizedKey] || heatmap[keyData.char];

                return (
                  <KeyboardKey
                    key={`${rowIndex}-${keyIndex}`}
                    keyData={keyData}
                    stat={stat}
                    rowIndex={rowIndex}
                    keyIndex={keyIndex}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Ambient glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* Custom styles for pulse animation */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 5px currentColor;
          }
          50% {
            box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default KeyboardHeatmap;
