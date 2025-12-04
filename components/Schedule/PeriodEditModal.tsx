'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Tag, AlertCircle } from 'lucide-react';
import { Period } from '../../types';
import { validatePeriodTimes, getPeriodColor } from '../../lib/utils/schedule';

interface PeriodEditModalProps {
  period: Period | null;
  onSave: (period: Period) => Promise<void>;
  onClose: () => void;
}

export function PeriodEditModal({ period, onSave, onClose }: PeriodEditModalProps) {
  const isNew = !period?.id;

  const [formData, setFormData] = useState<Partial<Period>>({
    period_number: period?.period_number || 1,
    period_label: period?.period_label || '',
    period_type: period?.period_type || 'Class',
    start_time: period?.start_time || '08:00',
    end_time: period?.end_time || '08:50',
    is_enabled: period?.is_enabled ?? true,
  });

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update form when period prop changes
  useEffect(() => {
    if (period) {
      setFormData({
        period_number: period.period_number,
        period_label: period.period_label,
        period_type: period.period_type,
        start_time: period.start_time,
        end_time: period.end_time,
        is_enabled: period.is_enabled,
      });
    }
  }, [period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.period_label?.trim()) {
      setError('Period label is required');
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      setError('Start and end times are required');
      return;
    }

    const timeValidation = validatePeriodTimes(formData.start_time, formData.end_time);
    if (!timeValidation.valid) {
      setError(timeValidation.error || 'Invalid times');
      return;
    }

    setIsSaving(true);

    try {
      const periodToSave: Period = {
        ...period,
        ...formData,
        id: period?.id,
        created_at: period?.created_at,
      } as Period;

      await onSave(periodToSave);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save period');
      setIsSaving(false);
    }
  };

  const periodColor = getPeriodColor(formData.period_type || 'Class');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(6,182,212,0.2)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${periodColor.bg} ${periodColor.border} border`}>
                <Clock className={`w-5 h-5 ${periodColor.text}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
                  {isNew ? 'Add Period' : 'Edit Period'}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {isNew ? 'Create new schedule period' : `Editing Period ${period?.period_number}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Period Number */}
            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
                Period Number
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.period_number}
                onChange={(e) => setFormData({ ...formData, period_number: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                required
              />
            </div>

            {/* Period Label */}
            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
                Period Label
              </label>
              <input
                type="text"
                value={formData.period_label}
                onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                placeholder="e.g., Period 1, Lunch, Break"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all placeholder:text-slate-500"
                required
              />
            </div>

            {/* Period Type */}
            <div>
              <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
                Period Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Class', 'Break', 'Lunch'] as const).map((type) => {
                  const color = getPeriodColor(type);
                  const isSelected = formData.period_type === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, period_type: type })}
                      className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                        isSelected
                          ? `${color.bg} ${color.border} ${color.text} border-2 ${color.glow}`
                          : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div>
                <p className="text-sm font-bold text-white font-mono">Enabled</p>
                <p className="text-xs text-slate-400">Show this period in the schedule</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_enabled: !formData.is_enabled })}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  formData.is_enabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <motion.div
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                  animate={{
                    left: formData.is_enabled ? 'calc(100% - 20px)' : '4px'
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white font-bold text-sm uppercase tracking-wider transition-all"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-lg text-white font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : isNew ? 'Create' : 'Update'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
