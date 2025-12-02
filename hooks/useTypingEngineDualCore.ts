import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrainingMode } from '../types';

export interface TypingEngineStats {
  wpm: number;
  accuracy: number;
  errorCount: number;
  durationMs: number;
  latencyAvg?: number;
  rhythmScore?: number;
}

export interface TypingEngineResult {
  currentIndex: number;
  wpm: number;
  accuracy: number;
  errorCount: number;
  isComplete: boolean;
  latencies: number[];
  rhythmScore: number;
  handleKey: (e: KeyboardEvent) => void;
  reset: () => void;
}

interface TypingEngineOptions {
  text: string;
  mode: TrainingMode;
  onComplete?: (stats: TypingEngineStats) => void;
  onError?: () => void;
}

/**
 * Dual-Core Typing Engine
 *
 * VELOCITY MODE (Cursor Lock):
 * - No backspace allowed
 * - Stop on error (don't advance cursor)
 * - Flash red and play bonk sound on error
 *
 * ACADEMY MODE (Standard):
 * - Backspace allowed
 * - Latency tracking
 * - Rhythm score calculation
 */
export function useTypingEngineDualCore(options: TypingEngineOptions): TypingEngineResult {
  const { text, mode, onComplete, onError } = options;

  // Core state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Live stats
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // Academy-specific: latency tracking
  const [latencies, setLatencies] = useState<number[]>([]);
  const [lastKeyTime, setLastKeyTime] = useState<number | null>(null);
  const [rhythmScore, setRhythmScore] = useState(100);

  const rafRef = useRef<number>();

  /**
   * Calculate rhythm score based on latency variance
   * Consistent rhythm = high score (90+)
   * Erratic rhythm = low score (<60)
   * Formula: 100 - (standardDeviation / mean) * 100
   */
  const calculateRhythmScore = useCallback((latencyArray: number[]): number => {
    if (latencyArray.length < 2) return 100;

    const mean = latencyArray.reduce((sum, val) => sum + val, 0) / latencyArray.length;
    const variance = latencyArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / latencyArray.length;
    const stdDev = Math.sqrt(variance);

    const score = Math.max(0, Math.min(100, 100 - (stdDev / mean) * 100));
    return Math.round(score);
  }, []);

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    setCurrentIndex(0);
    setStartTime(null);
    setErrorCount(0);
    setTotalTyped(0);
    setCorrectCount(0);
    setIsComplete(false);
    setWpm(0);
    setAccuracy(100);
    setLatencies([]);
    setLastKeyTime(null);
    setRhythmScore(100);
  }, []);

  /**
   * Update live WPM and accuracy stats
   */
  const updateStats = useCallback(() => {
    if (!startTime || isComplete) return;

    const elapsedMinutes = (performance.now() - startTime) / 60000;
    if (elapsedMinutes > 0) {
      const calculatedWpm = Math.max(0, Math.round((correctCount / 5) / elapsedMinutes));
      setWpm(calculatedWpm);
    }

    if (totalTyped > 0) {
      const calculatedAccuracy = Math.max(0, Math.round((correctCount / totalTyped) * 100));
      setAccuracy(calculatedAccuracy);
    }

    rafRef.current = requestAnimationFrame(updateStats);
  }, [startTime, isComplete, correctCount, totalTyped]);

  /**
   * Start animation loop for live stats
   */
  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateStats);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateStats]);

  /**
   * Handle completion logic
   */
  const handleCompletion = useCallback(() => {
    if (!startTime) return;

    const duration = performance.now() - startTime;
    const minutes = duration / 60000;
    const finalWpm = minutes > 0 ? Math.round((correctCount / 5) / minutes) : 0;
    const finalAccuracy = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100;
    const finalRhythmScore = mode === 'academy' ? calculateRhythmScore(latencies) : undefined;
    const latencyAvg = mode === 'academy' && latencies.length > 0
      ? latencies.reduce((sum, val) => sum + val, 0) / latencies.length
      : undefined;

    setIsComplete(true);
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);

    if (mode === 'academy' && finalRhythmScore !== undefined) {
      setRhythmScore(finalRhythmScore);
    }

    onComplete?.({
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errorCount,
      durationMs: duration,
      latencyAvg,
      rhythmScore: finalRhythmScore
    });
  }, [startTime, correctCount, totalTyped, errorCount, mode, latencies, calculateRhythmScore, onComplete]);

  /**
   * VELOCITY MODE: Cursor Lock Engine
   * - No backspace
   * - Stop on error
   */
  const handleVelocityKey = useCallback((key: string, expected: string) => {
    const now = performance.now();

    if (!startTime) {
      setStartTime(now);
    }

    setTotalTyped(prev => prev + 1);

    if (key === expected) {
      // Correct keystroke
      setCorrectCount(prev => prev + 1);
      setCurrentIndex(prev => prev + 1);

      // Check for completion
      if (currentIndex + 1 >= text.length) {
        handleCompletion();
      }
    } else {
      // Error: stop cursor, trigger visual/audio feedback
      setErrorCount(prev => prev + 1);
      onError?.(); // Trigger bonk sound and red flash
      // DO NOT advance cursor in velocity mode
    }
  }, [startTime, currentIndex, text.length, handleCompletion, onError]);

  /**
   * ACADEMY MODE: Standard Engine with Analytics
   * - Backspace allowed
   * - Latency tracking
   */
  const handleAcademyKey = useCallback((key: string, expected: string, isBackspace: boolean) => {
    const now = performance.now();

    if (!startTime) {
      setStartTime(now);
      setLastKeyTime(now);
    }

    // Track latency between keystrokes
    if (lastKeyTime && !isBackspace) {
      const latency = now - lastKeyTime;
      setLatencies(prev => [...prev, latency]);
      setLastKeyTime(now);
    } else if (!isBackspace) {
      setLastKeyTime(now);
    }

    if (isBackspace) {
      // Allow backspace to go back
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setTotalTyped(prev => Math.max(0, prev - 1));
      }
      return;
    }

    setTotalTyped(prev => prev + 1);

    if (key === expected) {
      // Correct keystroke
      setCorrectCount(prev => prev + 1);
      setCurrentIndex(prev => prev + 1);

      // Check for completion
      if (currentIndex + 1 >= text.length) {
        handleCompletion();
      }
    } else {
      // Error: still advance cursor in academy mode
      setErrorCount(prev => prev + 1);
      setCurrentIndex(prev => prev + 1);

      // Check for completion even on error
      if (currentIndex + 1 >= text.length) {
        handleCompletion();
      }
    }
  }, [startTime, lastKeyTime, currentIndex, text.length, handleCompletion]);

  /**
   * Main key event handler - dispatches to mode-specific logic
   */
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (isComplete) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const expected = text[currentIndex];

    // Handle backspace in academy mode
    if (mode === 'academy' && e.key === 'Backspace') {
      e.preventDefault();
      handleAcademyKey('', '', true);
      return;
    }

    // Ignore non-character keys
    if (e.key.length !== 1) return;
    e.preventDefault();

    // Dispatch to mode-specific handler
    if (mode === 'velocity') {
      handleVelocityKey(e.key, expected);
    } else {
      handleAcademyKey(e.key, expected, false);
    }
  }, [isComplete, mode, text, currentIndex, handleVelocityKey, handleAcademyKey]);

  /**
   * Prevent backspace in velocity mode
   */
  useEffect(() => {
    if (mode !== 'velocity') return;

    const preventBackspace = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', preventBackspace, { capture: true });
    return () => window.removeEventListener('keydown', preventBackspace, { capture: true });
  }, [mode]);

  /**
   * Attach global keydown listener
   */
  useEffect(() => {
    const listener = (e: KeyboardEvent) => handleKey(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handleKey]);

  /**
   * Return memoized result object
   */
  return useMemo(() => ({
    currentIndex,
    wpm,
    accuracy,
    errorCount,
    isComplete,
    latencies,
    rhythmScore,
    handleKey,
    reset
  }), [currentIndex, wpm, accuracy, errorCount, isComplete, latencies, rhythmScore, handleKey, reset]);
}
