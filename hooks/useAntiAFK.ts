import { useCallback, useEffect, useRef, useState } from 'react';

export function useAntiAFK(opts: { cooldownMs: number; claim: () => Promise<void> }) {
  const { cooldownMs, claim } = opts;
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());
  const [lastClaim, setLastClaim] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const timerRef = useRef<number>();

  const onActivity = useCallback(() => setLastActivity(Date.now()), []);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, onActivity));
    return () => events.forEach((ev) => window.removeEventListener(ev, onActivity));
  }, [onActivity]);

  const canClaim = Date.now() - lastActivity < cooldownMs && Date.now() - lastClaim > cooldownMs;
  const cooldownRemaining = Math.max(0, cooldownMs - (Date.now() - lastClaim));

  const handleClaim = useCallback(async () => {
    if (!canClaim || isClaiming) return;
    setIsClaiming(true);
    try {
      await claim();
      setLastClaim(Date.now());
    } finally {
      setIsClaiming(false);
    }
  }, [claim, canClaim, isClaiming]);

  // Optional poll to keep derived state fresh
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      // trigger re-render via state setter
      setLastActivity((v) => v);
    }, 1000);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  return { canClaim, cooldownRemaining, isClaiming, handleClaim, lastActivity, lastClaim };
}
