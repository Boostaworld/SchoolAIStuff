import { useEffect, useMemo, useState } from 'react';

export type Racer = {
  id: string;
  expectedDurationMs: number;
  startTimeMs: number; // epoch ms
  seed?: number; // optional for easing/curves
};

export function useRaceInterpolation(racers: Racer[]) {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const positions = useMemo(() => {
    return racers.map((r) => {
      const elapsed = Math.max(0, (now + (Date.now() - performance.now())) - r.startTimeMs);
      const pct = Math.min(100, Math.max(0, (elapsed / r.expectedDurationMs) * 100));
      return { id: r.id, position: pct };
    });
  }, [racers, now]);

  return positions;
}
