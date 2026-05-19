// components/AI/PeriodProgress.tsx
// Visual indicator for 9-period daily activity progress

import React from 'react';

interface PeriodProgressProps {
    periodsActive: number[];
    currentPeriod: number | null;
    totalPoints?: number;
}

export function PeriodProgress({ periodsActive, currentPeriod, totalPoints }: PeriodProgressProps) {
    const allPeriods = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const bonusThreshold = 8;
    const hasBonus = periodsActive.length >= bonusThreshold;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
            {/* Period dots */}
            <div className="flex items-center gap-1">
                {allPeriods.map((period) => {
                    const isActive = periodsActive.includes(period);
                    const isCurrent = period === currentPeriod;

                    return (
                        <div
                            key={period}
                            style={{ animationDelay: `${period * 50}ms` }}
                            className={`
                w-3 h-3 rounded-full transition-all duration-300 animate-in fade-in zoom-in
                ${isActive
                                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                                    : isCurrent
                                        ? 'bg-amber-400 animate-pulse'
                                        : 'bg-slate-700'
                                }
              `}
                            title={`Period ${period}${isActive ? ' ✓' : isCurrent ? ' (current)' : ''}`}
                        />
                    );
                })}
            </div>

            {/* Count */}
            <span className="text-xs text-slate-400 ml-1">
                {periodsActive.length}/9
            </span>

            {/* Bonus indicator */}
            {hasBonus && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-in zoom-in">
                    🔥 +150
                </span>
            )}

            {/* Total points */}
            {totalPoints !== undefined && (
                <div className="ml-auto flex items-center gap-1">
                    <span className="text-xs text-violet-400 font-medium">
                        {totalPoints} pts
                    </span>
                </div>
            )}
        </div>
    );
}

// Compact version for header/sidebar
export function PeriodProgressCompact({ periodsActive, currentPeriod }: Omit<PeriodProgressProps, 'totalPoints'>) {
    const hasBonus = periodsActive.length >= 8;

    return (
        <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((period) => (
                <div
                    key={period}
                    className={`
            w-2 h-2 rounded-full transition-all
            ${periodsActive.includes(period)
                            ? 'bg-emerald-400'
                            : period === currentPeriod
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-slate-600'
                        }
          `}
                />
            ))}
            {hasBonus && <span className="text-[10px] text-emerald-400">🔥</span>}
        </div>
    );
}

export default PeriodProgress;

