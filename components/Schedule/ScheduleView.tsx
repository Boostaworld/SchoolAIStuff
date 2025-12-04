'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, ArrowRight } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Period } from '../../types';
import {
  isWithinPeriod,
  getNextPeriod,
  getDurationMinutes,
  getElapsedMinutes,
  formatMinutes,
  getPeriodColor
} from '../../lib/utils/schedule';

export function ScheduleView() {
  const { schedule, fetchSchedule } = useOrbitStore();
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [nextPeriod, setNextPeriod] = useState<Period | null>(null);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    if (schedule.length === 0) return;

    const updateCurrent = () => {
      const now = new Date();
      const current = schedule.find(p => isWithinPeriod(now, p));
      const next = getNextPeriod(now, schedule);
      setCurrentPeriod(current || null);
      setNextPeriod(next);
    };

    updateCurrent();
    const interval = setInterval(updateCurrent, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [schedule]);

  if (schedule.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-400 mb-2">No Schedule Available</p>
          <p className="text-sm text-slate-500">
            The schedule has not been set up yet. Check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white font-mono uppercase tracking-wider flex items-center gap-3">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Daily Schedule
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            View all periods for today
          </p>
        </div>
      </div>

      {/* Current Period Banner */}
      {currentPeriod && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center"
              >
                <Clock className="w-5 h-5 text-cyan-400" />
              </motion.div>
              <div>
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-0.5 font-mono">
                  Current Period
                </p>
                <p className="text-lg font-bold text-white font-mono">
                  {currentPeriod.period_label}
                </p>
              </div>
            </div>
            {nextPeriod && (
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5 font-mono">
                  Next Up
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-300 font-mono">
                    {nextPeriod.period_label}
                  </p>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Schedule Grid */}
      <div className="grid gap-3">
        {schedule.map((period, index) => {
          const color = getPeriodColor(period.period_type);
          const isCurrent = period.id === currentPeriod?.id;
          const duration = getDurationMinutes(period);

          return (
            <motion.div
              key={period.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative p-4 rounded-xl border transition-all ${
                isCurrent
                  ? `${color.bg} ${color.border} ${color.glow}`
                  : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Period Number */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-lg ${isCurrent ? color.bg : 'bg-slate-800'} ${isCurrent ? color.border : 'border-slate-700'} border-2 flex items-center justify-center`}>
                  <span className={`text-2xl font-black font-mono ${isCurrent ? color.text : 'text-slate-400'}`}>
                    {period.period_number}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-lg font-bold font-mono ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                      {period.period_label}
                    </h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${color.bg} ${color.text} ${color.border} border`}>
                      {period.period_type}
                    </span>
                    {isCurrent && (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      >
                        Now
                      </motion.span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm font-mono">
                    <span className={`flex items-center gap-1.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {period.start_time} - {period.end_time}
                    </span>
                    <span className={isCurrent ? 'text-slate-600' : 'text-slate-700'}>•</span>
                    <span className={isCurrent ? 'text-slate-400' : 'text-slate-600'}>
                      {duration} minutes
                    </span>
                  </div>
                </div>

                {/* Visual Time Bar */}
                <div className="flex-shrink-0 w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                  {isCurrent && (
                    <motion.div
                      className={`h-full ${color.bg}`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(getElapsedMinutes(new Date(), period) / duration) * 100}%`
                      }}
                      transition={{ duration: 1 }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Future Enhancement Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg"
      >
        <p className="text-xs text-purple-300/70 font-mono">
          <span className="font-bold text-purple-400">Coming Soon:</span> Customize what class you have each period. For now, you see the master schedule times set by the admin.
        </p>
      </motion.div>
    </div>
  );
}
