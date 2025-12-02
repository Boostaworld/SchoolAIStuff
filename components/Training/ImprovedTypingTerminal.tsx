import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Zap, XCircle, RotateCcw } from 'lucide-react';
import { TypingChallenge } from '../../types';
import { useOrbitStore } from '../../store/useOrbitStore';

interface ImprovedTypingTerminalProps {
  challenge: TypingChallenge;
  onComplete: (results: {
    wpm: number;
    accuracy: number;
    errorCount: number;
    timeElapsed: number;
  }) => void;
  onExit: () => void;
}

export default function ImprovedTypingTerminal({ challenge, onComplete, onExit }: ImprovedTypingTerminalProps) {
  const { submitSession, syncTypingStats } = useOrbitStore();

  // State
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [keyStats, setKeyStats] = useState<Record<string, { presses: number; errors: number }>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [shake, setShake] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const challengeText = challenge.text_content;

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Calculate WPM
  const calculateWPM = useCallback(() => {
    if (!startTime) return 0;
    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    const correctChars = currentIndex;
    return Math.round((correctChars / 5) / timeElapsed);
  }, [startTime, currentIndex]);

  // Calculate accuracy
  const calculateAccuracy = useCallback(() => {
    if (currentIndex === 0) return 100;
    return Math.round(((currentIndex - errors) / currentIndex) * 100);
  }, [currentIndex, errors]);

  // Handle key press
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;

    // Start timer on first keystroke
    if (!startTime && newInput.length > 0) {
      setStartTime(Date.now());
    }

    // Get the expected character at current position
    const expectedChar = challengeText[currentIndex];
    const typedChar = newInput[newInput.length - 1];

    // Track key stat
    if (typedChar) {
      setKeyStats(prev => ({
        ...prev,
        [typedChar]: {
          presses: (prev[typedChar]?.presses || 0) + 1,
          errors: prev[typedChar]?.errors || 0
        }
      }));
    }

    // Check if user is trying to correct (backspace/delete scenario)
    if (newInput.length < userInput.length) {
      // User deleted a character - allow it and update index
      setUserInput(newInput);
      setCurrentIndex(newInput.length);
      return;
    }

    // Check if typed character matches expected
    if (typedChar === expectedChar) {
      // Correct keystroke
      setUserInput(newInput);
      setCurrentIndex(currentIndex + 1);
      setConsecutiveErrors(0);

      // Check for completion
      if (currentIndex + 1 === challengeText.length) {
        handleCompletion();
      }
    } else {
      // Wrong keystroke
      setErrors(errors + 1);
      setConsecutiveErrors(consecutiveErrors + 1);

      // Update key error stat
      if (typedChar) {
        setKeyStats(prev => ({
          ...prev,
          [typedChar]: {
            presses: prev[typedChar]?.presses || 0,
            errors: (prev[typedChar]?.errors || 0) + 1
          }
        }));
      }

      // Trigger shake after 3 consecutive errors
      if (consecutiveErrors + 1 >= 3) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }

      // Allow user to continue typing (they can backspace to correct)
      // But don't advance the index
      setUserInput(newInput);
    }
  };

  // Handle completion
  const handleCompletion = () => {
    if (!startTime) return;

    const timeElapsed = (Date.now() - startTime) / 1000; // seconds
    const wpm = calculateWPM();
    const accuracy = calculateAccuracy();

    setIsComplete(true);

    // Sync stats
    syncTypingStats(keyStats);

    // Submit session
    submitSession(challenge.id, wpm, accuracy, errors);

    // Call parent callback
    setTimeout(() => {
      onComplete({ wpm, accuracy, errorCount: errors, timeElapsed });
    }, 3000);
  };

  // Restart
  const handleRestart = () => {
    setUserInput('');
    setCurrentIndex(0);
    setStartTime(null);
    setErrors(0);
    setKeyStats({});
    setIsComplete(false);
    setShake(false);
    setConsecutiveErrors(0);
    inputRef.current?.focus();
  };

  // Render challenge text with color coding
  const renderText = () => {
    return challengeText.split('').map((char, idx) => {
      let colorClass = 'text-slate-600'; // Untyped
      let bgClass = '';

      if (idx < currentIndex) {
        // Typed correctly
        colorClass = 'text-emerald-400';
      } else if (idx === currentIndex) {
        // Current character (cursor position)
        bgClass = 'bg-cyan-500/30 animate-pulse';
        colorClass = 'text-cyan-300';
      } else if (idx < userInput.length) {
        // Typed but incorrect
        colorClass = 'text-red-400 line-through';
      }

      return (
        <motion.span
          key={idx}
          className={`${colorClass} ${bgClass} transition-all duration-150 font-mono text-lg`}
          initial={idx < currentIndex ? { opacity: 0 } : {}}
          animate={{ opacity: 1 }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      );
    });
  };

  const currentWPM = calculateWPM();
  const currentAccuracy = calculateAccuracy();
  const progress = (currentIndex / challengeText.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 bg-slate-950 z-50 flex flex-col transition-transform ${shake ? 'animate-shake' : ''}`}
    >
      {/* Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0)_50%,rgba(6,182,212,0.03)_50%)] bg-[length:100%_4px] pointer-events-none animate-scan" />

      {/* Header Stats */}
      <div className="relative z-10 border-b border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* WPM */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-mono uppercase">WPM</div>
                <div className="text-2xl font-black text-cyan-400 font-mono">{currentWPM}</div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-mono uppercase">Accuracy</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">{currentAccuracy}%</div>
              </div>
            </div>

            {/* Errors */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-mono uppercase">Errors</div>
                <div className="text-2xl font-black text-red-400 font-mono">{errors}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 font-mono text-sm flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              RESTART
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 font-mono text-sm transition-all"
            >
              EXIT
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-slate-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Challenge Info */}
      <div className="px-8 py-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-cyan-400 font-mono">{challenge.title}</h2>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-slate-500 font-mono">
            {challenge.category?.toUpperCase() || 'STANDARD'}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            challenge.difficulty === 'Easy'
              ? 'bg-emerald-500 text-slate-950'
              : challenge.difficulty === 'Medium'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-red-500 text-white'
          }`}>
            {challenge.difficulty}
          </span>
        </div>
      </div>

      {/* Main typing area */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 overflow-auto">
        <div className="max-w-4xl w-full">
          <div className="p-8 bg-slate-900/30 border border-cyan-500/20 rounded-2xl backdrop-blur-sm relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 rounded-2xl pointer-events-none" />

            {/* Text display */}
            <div className="relative z-10 leading-loose text-left mb-6">
              {renderText()}
            </div>

            {/* Hidden input */}
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={handleInput}
              className="absolute opacity-0 pointer-events-none"
              autoFocus
            />

            {/* Instructions */}
            <div className="text-center text-slate-600 text-sm font-mono">
              {!startTime && 'START TYPING TO BEGIN'}
              {startTime && !isComplete && 'TYPE TO CONTINUE • BACKSPACE TO CORRECT'}
            </div>
          </div>
        </div>
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ delay: 0.3, type: 'spring', duration: 0.8 }}
              >
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
              </motion.div>

              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 mb-4" style={{ fontFamily: 'Orbitron, monospace' }}>
                CHALLENGE COMPLETE!
              </h2>

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                  <div className="text-4xl font-black text-cyan-400 font-mono mb-1">{currentWPM}</div>
                  <div className="text-sm text-slate-400 font-mono">WPM</div>
                </div>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="text-4xl font-black text-emerald-400 font-mono mb-1">{currentAccuracy}%</div>
                  <div className="text-sm text-slate-400 font-mono">ACCURACY</div>
                </div>
                <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <div className="text-4xl font-black text-violet-400 font-mono mb-1">{errors}</div>
                  <div className="text-sm text-slate-400 font-mono">ERRORS</div>
                </div>
              </div>

              <p className="text-slate-500 font-mono text-sm">Returning to challenges...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styles */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        .animate-scan {
          animation: scan 0.1s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
      `}</style>
    </motion.div>
  );
}
