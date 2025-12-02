import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Zap, Flag, Trophy, ArrowLeft } from 'lucide-react';

interface VelocityTerminalProps {
  challengeText: string;
  challengeTitle: string;
  botRanges: number[]; // WPM targets for 3 bots
  onComplete: (results: {
    position: number;
    wpm: number;
    accuracy: number;
    timeMs: number;
  }) => void;
  onExit: () => void;
}

const BOT_PROFILES = [
  { name: 'NEXUS-01', color: 'from-red-500 to-orange-500', personality: 'aggressive' },
  { name: 'CIPHER-7', color: 'from-blue-500 to-cyan-500', personality: 'steady' },
  { name: 'QUANTUM-X', color: 'from-violet-500 to-purple-500', personality: 'cautious' },
];

export default function VelocityTerminal({
  challengeText,
  challengeTitle,
  botRanges,
  onComplete,
}: VelocityTerminalProps) {
  // Core state
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Race state
  const [countdown, setCountdown] = useState(3);
  const [raceStarted, setRaceStarted] = useState(false);
  const [botProgress, setBotProgress] = useState<number[]>([0, 0, 0]);
  const [streakCount, setStreakCount] = useState(0);
  const [errorFlash, setErrorFlash] = useState(false);
  const [currentErrorChar, setCurrentErrorChar] = useState<number | null>(null);
  const [finalPositions, setFinalPositions] = useState<Array<{ name: string; time: number; isUser: boolean }>>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const raceStartTimeRef = useRef<number | null>(null);

  // Calculated values
  const userProgress = (currentIndex / challengeText.length) * 100;
  const currentWPM = startTime
    ? Math.round((currentIndex / 5) / ((Date.now() - startTime) / 60000))
    : 0;

  // Countdown sequence
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!raceStarted) {
      setRaceStarted(true);
      raceStartTimeRef.current = Date.now();
      inputRef.current?.focus();
    }
  }, [countdown, raceStarted]);

  // Bot racing simulation - deterministic interpolation
  useEffect(() => {
    if (!raceStarted || isComplete || !raceStartTimeRef.current) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - raceStartTimeRef.current!;

      setBotProgress((prev) =>
        prev.map((_, idx) => {
          const targetWPM = botRanges[idx];
          const charsPerMinute = targetWPM * 5;
          const charsPerMs = charsPerMinute / 60000;

          // Add humanization: reaction delay + fatigue
          const reactionDelay = elapsed < 100 ? 0 : 1;
          const fatigue = elapsed > 30000 ? 0.92 : 1; // Slow down 8% after 30s
          const variance = 0.95 + Math.random() * 0.1; // 95-105% speed variance

          const progress = Math.min(
            100,
            (charsPerMs * elapsed * reactionDelay * fatigue * variance / challengeText.length) * 100
          );

          // Record finish time
          if (progress >= 100 && !finalPositions.find(p => p.name === BOT_PROFILES[idx].name)) {
            setFinalPositions(prev => [
              ...prev,
              { name: BOT_PROFILES[idx].name, time: elapsed, isUser: false }
            ]);
          }

          return progress;
        })
      );
    }, 50); // 20fps update

    return () => clearInterval(interval);
  }, [raceStarted, isComplete, botRanges, challengeText.length, finalPositions]);

  // Cursor-lock typing engine (no backspace, stop on error)
  const handleKeyPress = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!raceStarted || countdown > 0 || isComplete) return;

    const newInput = e.target.value;

    // Start timer on first keystroke
    if (!startTime && newInput.length > 0) {
      setStartTime(Date.now());
    }

    // CRITICAL: Cursor-lock mode - no backspace allowed
    if (newInput.length < userInput.length) {
      e.preventDefault();
      return;
    }

    const expectedChar = challengeText[currentIndex];
    const typedChar = newInput[newInput.length - 1];

    if (typedChar === expectedChar) {
      // Correct keystroke
      setUserInput(newInput);
      setCurrentIndex(currentIndex + 1);
      setStreakCount(streakCount + 1);

      // Check completion
      if (currentIndex + 1 === challengeText.length) {
        handleComplete();
      }
    } else {
      // ERROR: Mark character red, brief flash
      setErrors(errors + 1);
      setStreakCount(0);
      setCurrentErrorChar(currentIndex); // Mark this char as error
      setErrorFlash(true);
      setTimeout(() => {
        setErrorFlash(false);
        setCurrentErrorChar(null); // Clear after 300ms
      }, 300);
      // DO NOT advance cursor - user is stuck until they type correct key
    }
  };

  const handleComplete = () => {
    if (!startTime || isComplete) return;

    const timeMs = Date.now() - startTime;
    const wpm = Math.round((challengeText.length / 5) / (timeMs / 60000));
    const accuracy = currentIndex > 0
      ? Math.round(((currentIndex - errors) / currentIndex) * 100)
      : 100;

    setIsComplete(true);

    // Add user to final positions
    const newPositions = [
      ...finalPositions,
      { name: 'YOU', time: timeMs, isUser: true }
    ].sort((a, b) => a.time - b.time);

    setFinalPositions(newPositions);
    const position = newPositions.findIndex(p => p.isUser) + 1;

    setTimeout(() => {
      onComplete({ position, wpm, accuracy, timeMs });
    }, 4000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 z-50 overflow-hidden"
    >
      {/* Animated neon grid background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'slideGrid 15s linear infinite',
          }}
        />
      </div>

      {/* Error flash overlay - RED BONK (subtle) */}
      <AnimatePresence>
        {errorFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-red-500 z-40 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-9xl font-black text-red-400" style={{ fontFamily: 'monospace' }}>
                BONK
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-50"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, rotate: 10 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400"
              style={{ fontFamily: 'monospace' }}
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - WPM Counter + NITRO Indicator */}
      <div className="relative z-10 px-8 py-6 border-b border-cyan-500/30 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500"
              style={{ fontFamily: 'monospace' }}
            >
              VELOCITY ARENA
            </h1>
            <p className="text-cyan-500/70 text-sm font-mono mt-1">{challengeTitle}</p>
          </div>

          {/* Large WPM Counter */}
          <div className="flex items-center gap-4">
            <div className="px-6 py-4 bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <div className="text-xs text-cyan-500/70 font-mono mb-1">CURRENT SPEED</div>
              <motion.div
                className="text-5xl font-black text-cyan-400 font-mono"
                animate={{ scale: currentWPM > 0 ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 0.3, repeat: currentWPM > 0 ? Infinity : 0, repeatDelay: 1 }}
              >
                {currentWPM}
              </motion.div>
              <div className="text-xs text-cyan-500/70 font-mono text-center">WPM</div>
            </div>

            {/* NITRO Streak Indicator */}
            {streakCount >= 10 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-4 py-2 bg-gradient-to-r from-violet-500/20 to-pink-500/20 border-2 border-violet-500/50 rounded-lg shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="text-xs text-violet-300 font-mono">NITRO</div>
                    <div className="text-lg font-black text-violet-400 font-mono">{streakCount}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Exit Button */}
            <button
              onClick={onExit}
              className="px-6 py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/40 rounded-lg text-red-400 font-mono hover:bg-red-500/30 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              EXIT ARENA
            </button>
          </div>
        </div>
      </div>

      {/* Racing lanes */}
      <div className="relative z-10 px-8 py-6 space-y-4">
        {/* User lane - highlighted with neon glow */}
        <motion.div
          className="relative p-6 bg-slate-900/50 border-2 border-cyan-500/60 rounded-2xl backdrop-blur-sm"
          animate={{
            boxShadow: raceStarted
              ? '0 0 40px rgba(6,182,212,0.6), 0 0 80px rgba(139,92,246,0.3)'
              : '0 0 20px rgba(6,182,212,0.2)'
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xl font-black text-cyan-400 font-mono">YOU</div>
              <div className="text-xs text-slate-500 font-mono">HUMAN OPERATIVE</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-cyan-400 font-mono">{Math.round(userProgress)}%</div>
              <div className="text-xs text-slate-500 font-mono">PROGRESS</div>
            </div>
          </div>

          {/* Progress bar with animated gradient */}
          <div className="relative h-10 bg-slate-950 rounded-full overflow-hidden border border-cyan-500/30">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 flex items-center justify-end pr-3"
              initial={{ width: 0 }}
              animate={{ width: `${userProgress}%` }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {userProgress > 10 && (
                <motion.div
                  animate={{
                    x: [0, -3, 0],
                    scale: streakCount >= 10 ? [1, 1.2, 1] : 1
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: streakCount >= 10 ? 0.3 : 0.5
                  }}
                  className="text-white font-bold text-lg"
                >
                  ▶
                </motion.div>
              )}
            </motion.div>

            {/* Finish line */}
            <div className="absolute right-0 inset-y-0 w-2 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
          </div>
        </motion.div>

        {/* Bot lanes */}
        {botRanges.map((targetWPM, idx) => {
          const bot = BOT_PROFILES[idx];
          const progress = botProgress[idx];
          const isFinished = progress >= 100;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative p-6 bg-slate-900/30 border border-slate-700/50 rounded-2xl backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${bot.color} flex items-center justify-center shadow-lg`}>
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xl font-black text-slate-200 font-mono">{bot.name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    AI BOT • TARGET {targetWPM} WPM
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-300 font-mono">{Math.round(progress)}%</div>
                  <div className="text-xs text-slate-500 font-mono">PROGRESS</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-10 bg-slate-950 rounded-full overflow-hidden border border-slate-700/30">
                <motion.div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${bot.color} flex items-center justify-end pr-3`}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                >
                  {progress > 10 && (
                    <motion.div
                      animate={{ x: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="text-white font-bold text-lg"
                    >
                      ▶
                    </motion.div>
                  )}
                </motion.div>

                {/* Finish line */}
                <div className="absolute right-0 inset-y-0 w-2 bg-yellow-400" />

                {/* Finished flag */}
                {isFinished && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <Flag className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Typing input area */}
      <div
        className="relative z-10 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm p-8 absolute bottom-0 left-0 right-0"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="max-w-5xl mx-auto">
          <div className="p-6 bg-slate-950/60 border border-cyan-500/20 rounded-xl">
            <div className="leading-relaxed text-left font-mono text-lg text-slate-400">
              {challengeText.split('').map((char, idx) => {
                let colorClass = 'text-slate-700';

                if (idx < currentIndex) {
                  colorClass = 'text-emerald-400';
                } else if (idx === currentIndex) {
                  const isError = currentErrorChar === idx;
                  colorClass = isError
                    ? 'text-red-300 bg-red-500/50 px-1 rounded border-2 border-red-400 animate-pulse'
                    : 'text-cyan-300 bg-cyan-500/30 px-1 rounded animate-pulse';
                }

                return (
                  <span key={idx} className={`${colorClass} transition-colors duration-100`}>
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })}
            </div>

            <textarea
              ref={inputRef}
              value={userInput}
              onChange={handleKeyPress}
              disabled={!raceStarted || countdown > 0 || isComplete}
              className="absolute inset-0 opacity-0 pointer-events-auto"
              autoFocus
              aria-label="Velocity typing input"
            />
          </div>
        </div>
      </div>

      {/* Finish line celebration */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.7 }}
              className="text-center max-w-2xl"
            >
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <Trophy className={`w-32 h-32 mx-auto ${
                  finalPositions.findIndex(p => p.isUser) === 0 ? 'text-yellow-400' :
                  finalPositions.findIndex(p => p.isUser) === 1 ? 'text-slate-300' :
                  finalPositions.findIndex(p => p.isUser) === 2 ? 'text-orange-400' : 'text-slate-600'
                }`} />
              </motion.div>

              {/* Position announcement */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 mb-4"
                style={{ fontFamily: 'monospace' }}
              >
                {finalPositions.findIndex(p => p.isUser) === 0 ? '1ST PLACE!' :
                 finalPositions.findIndex(p => p.isUser) === 1 ? '2ND PLACE' :
                 finalPositions.findIndex(p => p.isUser) === 2 ? '3RD PLACE' :
                 `${finalPositions.findIndex(p => p.isUser) + 1}TH PLACE`}
              </motion.h1>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-4 mb-6"
              >
                <div className="p-6 bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl">
                  <div className="text-5xl font-black text-cyan-400 font-mono">{currentWPM}</div>
                  <div className="text-sm text-slate-400 font-mono mt-1">WPM</div>
                </div>
                <div className="p-6 bg-violet-500/10 border-2 border-violet-500/40 rounded-xl">
                  <div className="text-5xl font-black text-violet-400 font-mono">
                    {Math.round(((currentIndex - errors) / currentIndex) * 100)}%
                  </div>
                  <div className="text-sm text-slate-400 font-mono mt-1">ACCURACY</div>
                </div>
              </motion.div>

              {/* Final positions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-2"
              >
                {finalPositions.map((participant, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      participant.isUser
                        ? 'bg-cyan-500/20 border-2 border-cyan-500/60'
                        : 'bg-slate-800/50 border border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-slate-400 font-mono w-10">#{idx + 1}</div>
                      <div className="text-xl font-bold text-slate-200 font-mono">{participant.name}</div>
                    </div>
                    <div className="text-slate-400 font-mono">
                      {(participant.time / 1000).toFixed(2)}s
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animations */}
      <style>{`
        @keyframes slideGrid {
          0% { transform: translateY(0) translateX(0); }
          100% { transform: translateY(40px) translateX(40px); }
        }
      `}</style>
    </motion.div>
  );
}
