import React, { useMemo } from 'react';
import { useRaceInterpolation, Racer } from '../../hooks/useRaceInterpolation';

export const RacingTerminalLite: React.FC<{
  racers: Array<{ id: string; displayName: string; expectedDurationMs: number; startTimeMs: number }>;
}> = ({ racers }) => {
  if (!racers || racers.length === 0) return null;
  const positions = useRaceInterpolation(racers as Racer[]);
  const merged = useMemo(() => {
    const map: Record<string, number> = {};
    positions.forEach((p) => (map[p.id] = p.position));
    return racers.map((r) => ({ ...r, position: map[r.id] || 0 }));
  }, [positions, racers]);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="text-xs text-slate-400 font-mono uppercase">Race Lanes</div>
      <div className="space-y-2">
        {merged.map((r) => (
          <div key={r.id}>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
              <span>{r.displayName}</span>
              <span>{Math.min(100, Math.round(r.position))}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-150"
                style={{ width: `${Math.min(100, r.position)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
