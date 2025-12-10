'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Period } from '../../types';
import { PeriodEditModal } from './PeriodEditModal';
import { getPeriodColor } from '../../lib/utils/schedule';
import { ConfirmModal } from '../Shared/ConfirmModal';

export function ScheduleEditor() {
  const { schedule, fetchSchedule, updatePeriod, deletePeriod, addPeriod } = useOrbitStore();
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; periodId: string | null; label: string }>({ isOpen: false, periodId: null, label: '' });

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleAddNew = () => {
    // Create a new period template with next period number
    const nextNumber = schedule.length > 0
      ? Math.max(...schedule.map(p => p.period_number)) + 1
      : 1;

    setEditingPeriod({
      period_number: nextNumber,
      period_label: `Period ${nextNumber}`,
      period_type: 'Class',
      start_time: '08:00',
      end_time: '08:50',
      is_enabled: true,
    } as Period);
    setShowModal(true);
  };

  const handleEdit = (period: Period) => {
    setEditingPeriod(period);
    setShowModal(true);
  };

  const handleSave = async (period: Period) => {
    if (period.id) {
      await updatePeriod(period);
    } else {
      await addPeriod(period);
    }
    setShowModal(false);
    setEditingPeriod(null);
  };

  const handleDelete = async (periodId: string, label: string) => {
    setDeleteConfirm({ isOpen: true, periodId, label });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.periodId) return;
    setDeletingId(deleteConfirm.periodId);
    await deletePeriod(deleteConfirm.periodId);
    setDeletingId(null);
    setDeleteConfirm({ isOpen: false, periodId: null, label: '' });
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingPeriod(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white font-mono uppercase tracking-wider flex items-center gap-3">
            <Clock className="w-6 h-6 text-cyan-400" />
            Schedule Management
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            Configure period times for all users. Students will see these times in the schedule timer.
          </p>
        </div>
        <motion.button
          onClick={handleAddNew}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-lg text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Period
        </motion.button>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3"
      >
        <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-bold mb-1">Master Schedule</p>
          <p className="text-blue-400/80">
            This is the global schedule that all users see. Periods are shown in the top bar timer during school hours.
            You can add up to 10 periods (including breaks and lunch).
          </p>
        </div>
      </motion.div>

      {/* Schedule List */}
      {schedule.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl"
        >
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-400 mb-1">No periods configured</p>
          <p className="text-sm text-slate-500 mb-4">
            Add your first period to get started
          </p>
          <button
            onClick={handleAddNew}
            className="px-6 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 font-bold text-sm uppercase tracking-wider transition-all"
          >
            Create First Period
          </button>
        </motion.div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {schedule.map((period, index) => {
              const color = getPeriodColor(period.period_type);
              const isDeleting = deletingId === period.id;

              return (
                <motion.div
                  key={period.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-4 bg-slate-800/50 border rounded-xl hover:border-cyan-500/30 transition-all group ${isDeleting ? 'opacity-50 pointer-events-none' : ''
                    } ${period.is_enabled ? color.border : 'border-slate-700'}`}
                >
                  {/* Period Info */}
                  <div className="flex items-center gap-4">
                    {/* Period Number Badge */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${color.bg} ${color.border} border-2 flex items-center justify-center`}>
                      <span className={`text-xl font-black font-mono ${color.text}`}>
                        {period.period_number}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-lg font-bold font-mono ${period.is_enabled ? 'text-white' : 'text-slate-500'}`}>
                          {period.period_label}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${color.bg} ${color.text} ${color.border} border`}>
                          {period.period_type}
                        </span>
                        {!period.is_enabled && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded bg-slate-700 text-slate-400 border border-slate-600">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {period.start_time} - {period.end_time}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          {(() => {
                            const [sh, sm] = period.start_time.split(':').map(Number);
                            const [eh, em] = period.end_time.split(':').map(Number);
                            const duration = (eh * 60 + em) - (sh * 60 + sm);
                            return `${duration} minutes`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(period)}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-all"
                        title="Edit period"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => period.id && handleDelete(period.id, period.period_label)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-all"
                        title="Delete period"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <PeriodEditModal
          period={editingPeriod}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="DELETE PERIOD"
        message={`Delete "${deleteConfirm.label}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, periodId: null, label: '' })}
      />
    </div>
  );
}
