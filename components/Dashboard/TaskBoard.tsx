import React from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { CheckCircle2, CircleSlash, Loader2, Trash2, XCircle, UserPlus, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const TaskBoard: React.FC = () => {
  const { tasks, currentUser, toggleTask, forfeitTask, deleteTask, claimTask } = useOrbitStore();

  // ✅ FIX: Only show user's OWN tasks (not public tasks from others)
  const myTasks = tasks.filter(t => t.user_id === currentUser?.id);
  const completedCount = myTasks.filter(t => t.completed).length;

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
      <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-1">
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
                "relative p-4 rounded-xl border flex items-center gap-4 group select-none overflow-hidden",
                task.completed ? "grayscale-[0.5]" : "hover:border-slate-600"
              )}
            >
              {/* Loading Overlay */}
              {task.isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/80 z-10 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                  <span className="text-xs font-mono text-violet-400">ANALYZING...</span>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => toggleTask(task.id, task.completed)}
                className={clsx(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
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
                <div className="flex gap-2 mt-1 items-center flex-wrap">
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

                  {/* Public task indicator */}
                  {task.is_public && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 rounded border border-cyan-900 text-cyan-400 bg-cyan-900/10 uppercase font-mono">
                      <Globe className="w-2.5 h-2.5" />
                      PUBLIC
                    </span>
                  )}

                  {/* Author info for public tasks from others */}
                  {task.is_public && task.user_id !== currentUser?.id && task.profiles && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <span>by</span>
                      <span className="font-semibold text-slate-300">{task.profiles.username}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions: Claim/Forfeit/Admin Delete */}
              {!task.completed && (
                <>
                  {/* Claim button for public tasks from others */}
                  {task.is_public && task.user_id !== currentUser?.id && (
                    <button
                      onClick={() => claimTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-950/30 rounded-lg transition-all flex items-center gap-2"
                      title="Claim this task as your own"
                    >
                      <span className="text-[10px] font-mono hidden group-hover:block">CLAIM</span>
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}

                  {/* Regular user can forfeit their own task */}
                  {!currentUser?.is_admin && task.user_id === currentUser?.id && (
                    <button
                      onClick={() => forfeitTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-500 hover:bg-red-950/30 rounded-lg transition-all flex items-center gap-2"
                      title="Forfeit Task (Recorded on Permanent Record)"
                    >
                      <span className="text-[10px] font-mono hidden group-hover:block">FORFEIT</span>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {/* Admin can force delete any task */}
                  {currentUser?.is_admin && (
                    <button
                      onClick={() => {
                        if (confirm("⚠️ ADMIN DELETION PROTOCOL?\n\nThis will permanently remove this task.")) {
                          deleteTask(task.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-all flex items-center gap-2"
                      title="Admin: Force Delete Task"
                    >
                      <span className="text-[10px] font-mono hidden group-hover:block">ADMIN DELETE</span>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};