import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'practice' | 'arcade';

export type TypingEngineResult = {
  currentIndex: number;
  wpm: number;
  accuracy: number;
  errorCount: number;
  isComplete: boolean;
  handleKey: (e: KeyboardEvent) => void;
  reset: () => void;
};

export function useTypingEngine(opts: {
  text: string;
  mode: Mode;
  onComplete?: (stats: { wpm: number; accuracy: number; errorCount: number; durationMs: number }) => void;
  soundOnError?: () => void;
}): TypingEngineResult {
  const { text, mode, onComplete, soundOnError } = opts;
  const [idx, setIdx] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [typed, setTyped] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [complete, setComplete] = useState(false);
  const rafRef = useRef<number>();
  const [wpm, setWpm] = useState(0);
  const [acc, setAcc] = useState(100);

  const reset = useCallback(() => {
    setIdx(0);
    setStart(null);
    setErrors(0);
    setTyped(0);
    setCorrect(0);
    setComplete(false);
    setWpm(0);
    setAcc(100);
  }, []);

  const updateStats = useCallback(() => {
    if (!start || complete) return;
    const elapsedMinutes = (performance.now() - start) / 60000;
    if (elapsedMinutes > 0) setWpm(Math.max(0, Math.round((correct / 5) / elapsedMinutes)));
    if (typed > 0) setAcc(Math.max(0, Math.round((correct / typed) * 100)));
    rafRef.current = requestAnimationFrame(updateStats);
  }, [start, complete, correct, typed]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateStats);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [updateStats]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (complete) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const expected = text[idx];

    if (!start) setStart(performance.now());

    // Practice: allow backspace
    if (mode === 'practice' && e.key === 'Backspace') {
      e.preventDefault();
      if (idx > 0) {
        setIdx((v) => v - 1);
        setTyped((v) => Math.max(0, v - 1));
      }
      return;
    }

    // Non-character skip
    if (e.key.length !== 1) return;
    e.preventDefault();

    const isCorrect = e.key === expected;
    setTyped((v) => v + 1);

    if (isCorrect) {
      setCorrect((v) => v + 1);
      setIdx((v) => v + 1);
      if (idx + 1 >= text.length) {
        const duration = performance.now() - (start ?? performance.now());
        setComplete(true);
        const finalWpm = (() => {
          const minutes = duration / 60000;
          return minutes > 0 ? Math.round(((correct + 1) / 5) / minutes) : 0;
        })();
        const finalAcc = Math.round(((correct + 1) / (typed + 1)) * 100);
        setWpm(finalWpm);
        setAcc(finalAcc);
        onComplete?.({ wpm: finalWpm, accuracy: finalAcc, errorCount: errors, durationMs: duration });
      }
    } else {
      if (mode === 'arcade') {
        // Cursor lock: do not advance
        soundOnError?.();
      } else {
        setIdx((v) => v + 1);
      }
      setErrors((v) => v + 1);
    }
  }, [complete, mode, idx, text, start, onComplete, correct, typed, errors, soundOnError]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handleKey(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handleKey]);

  return useMemo(() => ({
    currentIndex: idx,
    wpm,
    accuracy: acc,
    errorCount: errors,
    isComplete: complete,
    handleKey,
    reset,
  }), [idx, wpm, acc, errors, complete, handleKey, reset]);
}
