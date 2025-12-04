import React, { useState } from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { CheckCircle2, CircleSlash, Loader2, Trash2, XCircle, UserPlus, Globe, Calendar, Link as LinkIcon, Pencil, Eye, PlusCircle, Clock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { AnswerModal } from './AnswerModal';
import { CreateActionModal } from './CreateActionModal';
import { Task } from '../../types';

export const TaskBoard: React.FC = () => {
  const { tasks, currentUser, toggleTask, forfeitTask, deleteTask, claimTask } = useOrbitStore();

  // State for modals
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
  const [selectedTaskForAnswer, setSelectedTaskForAnswer] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);

  // State for resource link popovers (track open task ID)
  const [openResourcePopoverId, setOpenResourcePopoverId] = useState<string | null>(null);

  // ✅ FIX: Only show user's OWN tasks (not public tasks from others)
  const myTasks = tasks.filter(t => t.user_id === currentUser?.id);
  const completedCount = myTasks.filter(t => t.completed).length;

  // Helper: Format Date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(date);
  };

  // Helper: Urgency Color
  const getUrgencyColorClass = (dateString: string) => {
    const now = new Date();
    const due = new Date(dateString);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return "text-red-500 border-red-500/50 bg-red-500/10"; // Overdue
    if (diffHours < 24) return "text-amber-500 border-amber-500/50 bg-amber-500/10"; // Due soon
    return "text-slate-400 border-slate-700 bg-slate-800/50"; // Normal
  };

  const handleEditTask = (task: Task) => {
    setSelectedTaskForEdit(task);
    setIsEditModalOpen(true);
  };

  const handleViewAnswer = (task: Task) => {
    setSelectedTaskForAnswer(task);
    setIsAnswerModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-1">COMPLETED</p>
            <h2 className="text-3xl font-bold text-white tracking-tighter">{completedCount}</h2>
          </div>
          <CheckCircle2 className="w-8 h-8 text-slate-800" />
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-1">FORFEITED</p>
            <h2 className="text-3xl font-bold text-red-500 tracking-tighter">{currentUser?.stats.tasksForfeited || 0}</h2>
          </div>
          <XCircle className="w-8 h-8 text-slate-800" />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-1 custom-scrollbar">
        <AnimatePresence mode='popLayout'>
          {myTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{
                opacity: task.completed ? 0.5 : 1,
                scale: task.completed ? 0.98 : 1,
                x: 0,
                backgroundColor: task.completed ? "rgba(15, 23, 42, 0.3)" : "rgba(15, 23, 42, 0.6)",
                borderColor: task.completed ? "rgba(30, 41, 59, 0.5)" : "rgba(30, 41, 59, 1)"
              }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                "relative p-4 rounded-xl border flex flex-col gap-3 group select-none overflow-visible", // Changed to flex-col for better layout with new fields
                task.completed ? "grayscale-[0.5]" : "hover:border-slate-600"
              )}
            >
              {/* Loading Overlay */}
              {task.isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/80 z-10 flex items-center justify-center gap-2 rounded-xl">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                  <span className="text-xs font-mono text-violet-400">ANALYZING...</span>
                </div>
              )}

              <div className="flex items-start gap-4">
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => toggleTask(task.id, task.completed)}
                  className={clsx(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-1",
                    task.completed ? "bg-violet-600 border-violet-600" : "border-slate-600 hover:border-violet-500"
                  )}
                >
                  {task.completed && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </motion.button>

                <div className="flex-1 min-w-0">
                  <h4 className={clsx(
                    "text-sm font-medium transition-all truncate",
                    task.completed ? "text-slate-500 line-through decoration-slate-600" : "text-slate-200"
                  )}>
                    {task.title}
                  </h4>

                  {/* Tags Row */}
                  <div className="flex gap-2 mt-2 items-center flex-wrap">
                    <span className={clsx(
                      "text-[10px] px-1.5 rounded border uppercase",
                      task.category === 'Cooked' ? "border-red-900 text-red-400 bg-red-900/10" :
                        task.category === 'Grind' ? "border-violet-900 text-violet-400 bg-violet-900/10" :
                          "border-cyan-900 text-cyan-400 bg-cyan-900/10"
                    )}>{task.category}</span>

                    {task.difficulty && (
                      <span className={clsx(
                        "text-[10px] px-1.5 rounded border uppercase font-mono",
                        task.difficulty === 'Hard' ? "border-amber-900 text-amber-400 bg-amber-900/10" :
                          task.difficulty === 'Medium' ? "border-blue-900 text-blue-400 bg-blue-900/10" :
                            "border-emerald-900 text-emerald-400 bg-emerald-900/10"
                      )}>
                        {task.difficulty}
                      </span>
                    )}

                    {/* Due Date Badge */}
                    {task.due_date && (
                      <span className={clsx(
                        "flex items-center gap-1 text-[10px] px-1.5 rounded border uppercase font-mono",
                        getUrgencyColorClass(task.due_date)
                      )}>
                        <Clock className="w-3 h-3" />
                        {formatDate(task.due_date)}
                      </span>
                    )}

                    {/* Resource Links Badge */}
                    {task.resource_links && task.resource_links.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenResourcePopoverId(openResourcePopoverId === task.id ? null : task.id);
                          }}
                          className="flex items-center gap-1 text-[10px] px-1.5 rounded border border-indigo-500/30 text-indigo-400 bg-indigo-500/10 uppercase font-mono hover:bg-indigo-500/20 transition-colors"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {task.resource_links.length} RESOURCES
                        </button>

                        {/* Resource Popover */}
                        {openResourcePopoverId === task.id && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 p-2 flex flex-col gap-1">
                            {task.resource_links.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded transition-colors truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{link.title || link.url}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Public task indicator */}
                    {task.is_public && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 rounded border border-cyan-900 text-cyan-400 bg-cyan-900/10 uppercase font-mono">
                        <Globe className="w-2.5 h-2.5" />
                        PUBLIC
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-end gap-2 mt-1 pl-10">
                {/* Edit Button */}
                {!task.completed && task.user_id === currentUser?.id && (
                  <button
                    onClick={() => handleEditTask(task)}
                    className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-950/30 rounded-lg transition-all"
                    title="Edit Task"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {/* Answer Button */}
                {(task.answer || (currentUser?.is_admin || task.user_id === currentUser?.id)) && (
                  <button
                    onClick={() => handleViewAnswer(task)}
                    className={clsx(
                      "p-1.5 rounded-lg transition-all flex items-center gap-1",
                      task.answer
                        ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    )}
                    title={task.answer ? "View Answer Key" : "Add Answer Key"}
                  >
                    {task.answer ? <Eye className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    {task.answer && <span className="text-[10px] font-mono font-bold">KEY</span>}
                  </button>
                )}

                {/* Forfeit Button */}
                {!task.completed && !currentUser?.is_admin && task.user_id === currentUser?.id && (
                  <button
                    onClick={() => forfeitTask(task.id)}
                    className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-950/30 rounded-lg transition-all"
                    title="Forfeit Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Admin Delete */}
                {currentUser?.is_admin && (
                  <button
                    onClick={async () => {
                      if (confirm("⚠️ ADMIN DELETION PROTOCOL?\n\nThis will permanently remove this task.")) {
                        try {
                          await deleteTask(task.id);
                        } catch (error) {
                          console.error('Admin task deletion failed', error);
                        }
                      }
                    }}
                    className="p-1.5 text-red-500 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-all"
                    title="Admin: Force Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnswerModal
        isOpen={isAnswerModalOpen}
        onClose={() => setIsAnswerModalOpen(false)}
        task={selectedTaskForAnswer}
      />

      <AnimatePresence>
        {isEditModalOpen && selectedTaskForEdit && (
          <CreateActionModal
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedTaskForEdit(null);
            }}
            editTask={selectedTaskForEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};