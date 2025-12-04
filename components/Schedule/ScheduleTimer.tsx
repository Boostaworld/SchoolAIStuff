'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronRight, Calendar, ChevronDown } from 'lucide-react';
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
  const { schedule } = useOrbitStore();
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [nextPeriod, setNextPeriod] = useState<Period | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (schedule.length === 0) return;

    const updateTimer = () => {
      const now = new Date();

      // Find current period
      const current = schedule.find(p => isWithinPeriod(now, p));
      const next = getNextPeriod(now, schedule);

      if (current) {
        const [startHour, startMin] = current.start_time.split(':').map(Number);
        const [endHour, endMin] = current.end_time.split(':').map(Number);
        const start = new Date();
        start.setHours(startHour, startMin, 0, 0);
        const end = new Date();
        end.setHours(endHour, endMin, 0, 0);

        const totalSeconds = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 1000));
        const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
        const remainingSeconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));

        setCurrentPeriod(current);
        setNextPeriod(next);
        setTimeRemaining(formatMinutes(remainingSeconds / 60));
        setProgress(Math.min(100, (elapsedSeconds / totalSeconds) * 100));
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

  if (schedule.length === 0) return null;

  const periodColor = currentPeriod ? getPeriodColor(currentPeriod.period_type) : { text: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', glow: '' };

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner hover:border-cyan-500/30 transition-all group"
      >
        {/* Icon & Label */}
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${currentPeriod ? 'text-cyan-400' : 'text-slate-500'}`} />
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-slate-500 font-mono uppercase leading-none">
              {currentPeriod ? currentPeriod.period_label : 'NEXT EVENT'}
            </span>
            <span className={`text-sm font-bold font-mono leading-none ${currentPeriod ? 'text-white' : 'text-slate-300'}`}>
              {timeRemaining}
            </span>
          </div>
        </div>

        {/* Mini Progress Ring */}
        {currentPeriod && (
          <div className="relative w-8 h-8 flex-shrink-0 ml-1">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#1e293b"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${progress}, 100`}
                className="text-cyan-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-slate-400">
              {Math.floor(progress)}%
            </div>
          </div>
        )}

        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 font-mono">TODAY'S SCHEDULE</span>
              <span className="text-[10px] text-slate-500 font-mono">{new Date().toLocaleDateString()}</span>
            </div>

            <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {schedule.map((period) => {
                const isCurrent = period.id === currentPeriod?.id;
                const isNext = period.id === nextPeriod?.id;
                const color = getPeriodColor(period.period_type);

                return (
                  <div
                    key={period.id}
                    className={`p-2 rounded-lg flex items-center justify-between border ${isCurrent
                      ? 'bg-cyan-950/30 border-cyan-900/50'
                      : isNext
                        ? 'bg-slate-900/50 border-slate-800'
                        : 'bg-transparent border-transparent opacity-60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-8 rounded-full ${isCurrent ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                            {period.period_label}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1 rounded uppercase font-bold">NOW</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {period.start_time} - {period.end_time}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase ${color.text}`}>
                      {period.period_type}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
