'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, Calendar } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Period } from '../../types';
import {
  isWithinPeriod,
  getNextPeriod,
  formatMinutes,
  getTimeUntil,
  getPeriodColor
} from '../../lib/utils/schedule';

export function ScheduleTimer() {
  const { schedule, currentUser } = useOrbitStore();
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [nextPeriod, setNextPeriod] = useState<Period | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (schedule.length === 0) return;

    const updateTimer = () => {
      const now = new Date();

      // Find current period
      const current = schedule.find(p => isWithinPeriod(now, p));
      const next = getNextPeriod(now, schedule);

      if (current) {
        const totalMinutes = getDurationMinutes(current);
        const elapsedMinutes = getElapsedMinutes(now, current);
        const remaining = totalMinutes - elapsedMinutes;

        setCurrentPeriod(current);
        setNextPeriod(next);
        setTimeRemaining(formatMinutes(remaining));
        setProgress((elapsedMinutes / totalMinutes) * 100);

        // Period just ended - show notification
        if (remaining <= 0 && next) {
          console.log('🔔 Period ending:', current.period_label);
        }
      } else {
        setCurrentPeriod(null);
        setNextPeriod(next);
        if (next) {
          setTimeRemaining(getTimeUntil(now, next));
        } else {
          setTimeRemaining('No more periods');
        }
        setProgress(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [schedule]);

  // Don't render if no schedule or not in a period
  if (schedule.length === 0 || !currentPeriod) return null;

  const periodColor = getPeriodColor(currentPeriod.period_type);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
    >
      {/* Backdrop blur bar */}
      <div className="relative overflow-hidden bg-slate-950/95 backdrop-blur-md border-b border-cyan-500/20">
        {/* Animated scan-line effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent"
          animate={{
            y: ['-100%', '200%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* Hexagonal grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2306b6d4' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '28px 49px'
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-3 pointer-events-auto">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Period Info */}
            <motion.div
              className="flex items-center gap-4 min-w-0"
              layoutId="period-info"
            >
              {/* Pulsing icon */}
              <motion.div
                className={`relative flex-shrink-0 ${periodColor.glow}`}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <Clock className={`w-5 h-5 ${periodColor.text}`} />
                <motion.div
                  className={`absolute inset-0 ${periodColor.bg} rounded-full blur-lg`}
                  animate={{
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity
                  }}
                />
              </motion.div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <motion.span
                    key={currentPeriod.period_label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-bold text-sm text-white tracking-wider font-mono uppercase truncate"
                  >
                    {currentPeriod.period_label}
                  </motion.span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${periodColor.bg} ${periodColor.text} ${periodColor.border} border`}>
                    {currentPeriod.period_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                  {currentPeriod.start_time} - {currentPeriod.end_time}
                </p>
              </div>
            </motion.div>

            {/* Center: Time Remaining (Large Display) */}
            <motion.div
              className="flex items-center gap-4"
              layoutId="time-display"
            >
              <div className="text-right">
                <motion.div
                  key={timeRemaining}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className={`text-3xl font-black font-mono ${periodColor.text} tabular-nums tracking-tight ${periodColor.glow}`}
                  style={{
                    textShadow: `0 0 20px currentColor, 0 0 40px currentColor`
                  }}
                >
                  {timeRemaining}
                </motion.div>
                {nextPeriod && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1 flex items-center justify-end gap-1"
                  >
                    <span>Next:</span>
                    <span className="text-slate-400 font-bold">{nextPeriod.period_label}</span>
                    <ChevronRight className="w-3 h-3" />
                  </motion.div>
                )}
              </div>

              {/* Hexagonal Progress Ring */}
              <div className="relative w-16 h-16 flex-shrink-0">
                {/* Background hex */}
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <polygon
                    points="50,10 85,30 85,70 50,90 15,70 15,30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-slate-800"
                  />
                  {/* Animated progress hex */}
                  <motion.polygon
                    points="50,10 85,30 85,70 50,90 15,70 15,30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className={periodColor.text}
                    strokeDasharray="280"
                    strokeDashoffset={280 - (280 * progress) / 100}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 280 }}
                    animate={{ strokeDashoffset: 280 - (280 * progress) / 100 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      filter: `drop-shadow(0 0 6px currentColor)`
                    }}
                  />
                </svg>

                {/* Center percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    key={Math.floor(progress)}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-xs font-black font-mono ${periodColor.text} tabular-nums`}
                  >
                    {Math.floor(progress)}%
                  </motion.span>
                </div>
              </div>
            </motion.div>

            {/* Right: Quick Actions */}
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-all text-xs font-mono text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">View Schedule</span>
            </motion.button>
          </div>
        </div>

        {/* Bottom accent line with animated glitch */}
        <motion.div
          className={`h-[2px] ${periodColor.bg}`}
          animate={{
            scaleX: [1, 0.98, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      {/* Expanded schedule preview (future enhancement) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-950/98 backdrop-blur-md border-b border-cyan-500/20 overflow-hidden pointer-events-auto"
          >
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {schedule.map((period, i) => {
                  const color = getPeriodColor(period.period_type);
                  const isCurrent = period.id === currentPeriod?.id;

                  return (
                    <motion.div
                      key={period.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? `${color.bg} ${color.border} ${color.glow}`
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold font-mono ${isCurrent ? color.text : 'text-slate-400'}`}>
                          {period.period_number}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${color.bg} ${color.text}`}>
                          {period.period_type}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold ${isCurrent ? 'text-white' : 'text-slate-300'} truncate mb-1`}>
                        {period.period_label}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {period.start_time} - {period.end_time}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
