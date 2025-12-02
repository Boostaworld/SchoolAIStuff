import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { TypingChallenge } from '../../types';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Zap, Target, AlertCircle, Trophy, TrendingUp } from 'lucide-react';

interface TypingTerminalProps {
  challenge: TypingChallenge;
  onComplete: () => void;
}

export const TypingTerminal: React.FC<TypingTerminalProps> = ({ challenge, onComplete }) => {
  const { submitSession, syncTypingStats, currentUser } = useOrbitStore();

  // Core typing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [keyStats, setKeyStats] = useState<Record<string, { errors: number; presses: number }>>({});
  const [typedChars, setTypedChars] = useState<Array<{ char: string; correct: boolean }>>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Live stats
  const [currentWPM, setCurrentWPM] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);

  // Animation controls
  const shakeControls = useAnimation();
  const flashControls = useAnimation();
  const successControls = useAnimation();

  // Refs
  const textRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  // Calculate live WPM and accuracy
  useEffect(() => {
    if (!startTime || isComplete) return;

    const updateStats = () => {
      const elapsedMinutes = (performance.now() - startTime) / 60000;
      if (elapsedMinutes > 0) {
        const wpm = Math.round((correctChars / 5) / elapsedMinutes);
        setCurrentWPM(Math.max(0, wpm));
      }

      if (totalTyped > 0) {
        const accuracy = (correctChars / totalTyped) * 100;
        setCurrentAccuracy(Math.round(accuracy));
      }
    };

    const interval = setInterval(updateStats, 100);
    return () => clearInterval(interval);
  }, [startTime, correctChars, totalTyped, isComplete]);

  // Auto-scroll to keep cursor visible
  useEffect(() => {
    if (cursorRef.current && textRef.current) {
      const cursor = cursorRef.current;
      const container = textRef.current;
      const cursorRect = cursor.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (cursorRect.bottom > containerRect.bottom - 100) {
        cursor.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex]);

  // Error flash animation
  const triggerErrorFlash = useCallback(async () => {
    await flashControls.start({
      backgroundColor: ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0)'],
      transition: { duration: 0.3 }
    });
  }, [flashControls]);

  // Shake animation after 3 consecutive errors
  const triggerShake = useCallback(async () => {
    await shakeControls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    });
  }, [shakeControls]);

  // Success animation
  const triggerSuccess = useCallback(async () => {
    await successControls.start({
      scale: [1, 1.02, 1],
      backgroundColor: [
        'rgba(16, 185, 129, 0)',
        'rgba(16, 185, 129, 0.1)',
        'rgba(16, 185, 129, 0)'
      ],
      transition: { duration: 0.8 }
    });
  }, [successControls]);

  // Handle keypresses
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (isComplete) return;

    // Ignore modifier keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // Start timer on first keypress
    if (!startTime) {
      setStartTime(performance.now());
    }

    const expectedChar = challenge.text_content[currentIndex];
    const typedChar = e.key;

    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setTypedChars(prev => prev.slice(0, -1));
        // Note: Don't reduce totalTyped or stats, errors are permanent
      }
      return;
    }

    // Only process single characters
    if (typedChar.length !== 1) return;

    e.preventDefault();

    const isCorrect = typedChar === expectedChar;

    // Update key statistics
    setKeyStats(prev => ({
      ...prev,
      [expectedChar]: {
        errors: (prev[expectedChar]?.errors || 0) + (isCorrect ? 0 : 1),
        presses: (prev[expectedChar]?.presses || 0) + 1
      }
    }));

    // Update counters
    setTotalTyped(prev => prev + 1);

    if (isCorrect) {
      setCorrectChars(prev => prev + 1);
      setConsecutiveErrors(0);
      setTypedChars(prev => [...prev, { char: typedChar, correct: true }]);
      setCurrentIndex(prev => prev + 1);

      // Check if completed
      if (currentIndex + 1 >= challenge.text_content.length) {
        handleComplete();
      }
    } else {
      setErrorCount(prev => prev + 1);
      setConsecutiveErrors(prev => prev + 1);
      setTypedChars(prev => [...prev, { char: typedChar, correct: false }]);

      triggerErrorFlash();

      if (consecutiveErrors + 1 >= 3) {
        triggerShake();
      }
    }
  }, [currentIndex, challenge.text_content, startTime, isComplete, consecutiveErrors, triggerErrorFlash, triggerShake]);

  // Complete handler
  const handleComplete = async () => {
    if (!startTime) return;

    setIsComplete(true);
    triggerSuccess();

    const elapsedMinutes = (performance.now() - startTime) / 60000;
    const finalWPM = Math.round((correctChars + 1) / 5 / elapsedMinutes); // +1 for the last char
    const finalAccuracy = ((correctChars + 1) / (totalTyped + 1)) * 100;

    // Freeze stats at completion
    setCurrentWPM(finalWPM);
    setCurrentAccuracy(Math.round(finalAccuracy));
    setStartTime(null);

    // Submit session
    const submittedChallengeId = challenge.is_custom ? null : challenge.id;
    await submitSession(submittedChallengeId, finalWPM, Math.round(finalAccuracy), errorCount);

    // Sync typing stats for heatmap
    await syncTypingStats(keyStats);

    // Show results for 3 seconds, then call onComplete
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  // Keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Difficulty color
  const difficultyColor = {
    Easy: 'from-emerald-500 to-teal-500',
    Medium: 'from-amber-500 to-orange-500',
    Hard: 'from-red-500 to-rose-500'
  }[challenge.difficulty];

  const difficultyGlow = {
    Easy: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    Medium: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    Hard: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
  }[challenge.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full flex flex-col relative overflow-hidden"
    >
      {/* Error flash overlay */}
      <motion.div
        animate={flashControls}
        className="absolute inset-0 pointer-events-none z-50"
      />

      {/* Success overlay */}
      <motion.div
        animate={successControls}
        className="absolute inset-0 pointer-events-none z-50"
      />

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-[scan_8s_linear_infinite]" />
      </div>

      {/* Header - Challenge Info */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between p-6 border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${difficultyColor} ${difficultyGlow} font-mono font-bold text-sm uppercase tracking-wider text-white`}>
            {challenge.difficulty}
          </div>
          <h2 className="text-2xl font-bold text-white font-mono tracking-tight">
            {challenge.title}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50"
            whileHover={{ scale: 1.05 }}
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-lg font-bold text-cyan-400">{currentWPM}</span>
            <span className="text-xs text-slate-500 uppercase">WPM</span>
          </motion.div>

          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50"
            whileHover={{ scale: 1.05 }}
          >
            <Target className="w-4 h-4 text-violet-400" />
            <span className="font-mono text-lg font-bold text-violet-400">{currentAccuracy}%</span>
            <span className="text-xs text-slate-500 uppercase">ACC</span>
          </motion.div>

          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50"
            whileHover={{ scale: 1.05 }}
          >
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="font-mono text-lg font-bold text-red-400">{errorCount}</span>
            <span className="text-xs text-slate-500 uppercase">ERR</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-900/50 relative overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          initial={{ width: '0%' }}
          animate={{
            width: `${(currentIndex / challenge.text_content.length) * 100}%`,
            backgroundPosition: ['0% 0%', '100% 0%']
          }}
          transition={{
            width: { duration: 0.2 },
            backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' }
          }}
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>

      {/* Main typing area */}
      <motion.div
        animate={shakeControls}
        ref={textRef}
        className="flex-1 overflow-y-auto p-12 bg-slate-950/40 backdrop-blur-sm relative"
      >
        <div className="max-w-5xl mx-auto">
          {/* Terminal prompt */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-6 text-cyan-400 font-mono text-sm"
          >
            <span className="text-violet-500">{currentUser?.username}@orbit</span>
            <span className="text-slate-600">~</span>
            <span className="text-cyan-400">$</span>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-slate-500"
            >
              type_training.exe --challenge={challenge.id.slice(0, 8)}
            </motion.span>
          </motion.div>

          {/* Text display */}
          <div className="font-mono text-xl leading-loose tracking-wide">
            {challenge.text_content.split('').map((char, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;

              // Check if this char was typed incorrectly
              const wasIncorrect = typedChars[idx] && !typedChars[idx].correct;

              return (
                <motion.span
                  key={idx}
                  ref={isCurrent ? cursorRef : null}
                  className={`relative inline-block ${char === ' ' ? 'w-2' : ''}`}
                  initial={isFuture ? { opacity: 0.3 } : {}}
                  animate={isFuture ? { opacity: 0.3 } : {}}
                >
                  {/* Character */}
                  <span
                    className={`
                      ${isPast && !wasIncorrect ? 'text-emerald-400' : ''}
                      ${isPast && wasIncorrect ? 'text-red-400 line-through' : ''}
                      ${isCurrent ? 'text-white' : ''}
                      ${isFuture ? 'text-slate-600' : ''}
                      ${isCurrent ? 'bg-cyan-500/30 px-1 rounded' : ''}
                      transition-colors duration-150
                    `}
                  >
                    {char}
                  </span>

                  {/* Cursor glow */}
                  {isCurrent && (
                    <motion.span
                      className="absolute inset-0 bg-cyan-500/20 blur-sm -z-10 rounded"
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  )}

                  {/* Shake on error */}
                  <AnimatePresence>
                    {isPast && wasIncorrect && idx === currentIndex - 1 && (
                      <motion.span
                        initial={{ x: -3, opacity: 1 }}
                        animate={{ x: [0, -3, 3, -3, 3, 0], opacity: [1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 text-red-500"
                      >
                        {char}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
              );
            })}
          </div>

          {/* Completion message */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 backdrop-blur-md"
              >
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Trophy className="w-12 h-12 text-emerald-400" />
                  </motion.div>
                  <div>
                    <h3 className="text-3xl font-bold text-emerald-400 font-mono">CHALLENGE COMPLETE</h3>
                    <p className="text-slate-400 text-sm">Session synced to orbital database</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-slate-900/50 border border-cyan-500/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <span className="text-xs text-slate-500 uppercase">Final WPM</span>
                    </div>
                    <p className="text-3xl font-bold text-cyan-400 font-mono">{currentWPM}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-slate-900/50 border border-violet-500/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-violet-400" />
                      <span className="text-xs text-slate-500 uppercase">Accuracy</span>
                    </div>
                    <p className="text-3xl font-bold text-violet-400 font-mono">{currentAccuracy}%</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-xl bg-slate-900/50 border border-emerald-500/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs text-slate-500 uppercase">Score</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-400 font-mono">
                      {Math.round(currentWPM * (currentAccuracy / 100))}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer - Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 border-t border-slate-800/50 bg-slate-950/60 backdrop-blur-sm"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-slate-500 font-mono">
            <span>
              <span className="text-cyan-400">[ENTER]</span> to type
            </span>
            <span>
              <span className="text-violet-400">[BACKSPACE]</span> to correct
            </span>
            <span>
              <span className="text-emerald-400">[ESC]</span> to exit
            </span>
          </div>

          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 bg-emerald-400 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs text-slate-500 uppercase">System Active</span>
          </div>
        </div>
      </motion.div>

      {/* CSS for scanline animation */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </motion.div>
  );
};
