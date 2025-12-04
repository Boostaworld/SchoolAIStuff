import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Clock, Target, AlertCircle, Zap, User, Package, Trash2, Link as LinkIcon } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { Task } from '../../types';
import clsx from 'clsx';
import { useToast } from '../Shared/ToastManager';

export const PublicTaskMarketplace: React.FC = () => {
  const { tasks, currentUser, claimTask, deleteTask } = useOrbitStore();
  const toast = useToast();
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const isAdmin = currentUser?.is_admin;

  // Filter to show ALL public tasks (including own, so users can verify)
  const publicTasks = useMemo(() => {
    return tasks.filter(
      (task) => task.is_public
    );
  }, [tasks]);

  const getCategoryStyle = (category: Task['category']) => {
    switch (category) {
      case 'Quick':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          glow: 'shadow-emerald-500/20',
          icon: Zap,
        };
      case 'Grind':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          glow: 'shadow-amber-500/20',
          icon: Target,
        };
      case 'Cooked':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          glow: 'shadow-red-500/20',
          icon: AlertCircle,
        };
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'Hard':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const handleClaim = async (taskId: string, taskTitle: string) => {
    setClaimingIds(prev => new Set(prev).add(taskId));

    try {
      await claimTask(taskId);
      toast.success('Contract Claimed!', {
        description: `"${taskTitle}" has been added to your mission log.`,
        duration: 4000,
      });
    } catch (error) {
      toast.error('Claim Failed', {
        description: 'Unable to claim this contract. Please try again.',
        duration: 4000,
      });
    } finally {
      setClaimingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleDelete = async (taskId: string, taskTitle: string) => {
    if (!confirm(`⚠️ ADMIN OVERRIDE\n\nDelete contract "${taskTitle}" permanently?`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(taskId));

    try {
      await deleteTask(taskId);
      toast.success('Contract Deleted', {
        description: `"${taskTitle}" was removed from the public board.`,
        duration: 4000,
      });
    } catch (error) {
      console.error('Admin delete failed', error);
      toast.error('Delete Failed', {
        description: 'Unable to remove this contract right now. Please try again.',
        duration: 4000,
      });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'gridScroll 20s linear infinite',
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-amber-500/20 bg-gradient-to-b from-slate-950/95 to-slate-950/80 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
              <h2 className="text-3xl font-black text-amber-400 tracking-widest font-['Orbitron']">
                PUBLIC CONTRACTS
              </h2>
            </div>
            <p className="text-amber-500/60 text-sm font-mono ml-4 tracking-wide">
              AVAILABLE MISSIONS // COMMUNITY BOARD
            </p>
          </div>

          {/* Task Counter */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-amber-500/30 rounded-lg px-4 py-2 shadow-lg shadow-amber-500/10">
            <Package className="w-5 h-5 text-amber-400" />
            <div className="text-right">
              <p className="text-xs text-amber-500/70 font-mono">AVAILABLE</p>
              <p className="text-2xl font-bold text-amber-300 font-mono leading-none">
                {publicTasks.length}
              </p>
            </div>
          </div>
        </div>

        {/* Scan Line Animation */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {publicTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
              <Package className="w-24 h-24 text-amber-500/30 relative z-10 mb-6" />
            </div>
            <h3 className="text-2xl font-bold text-amber-400/80 font-['Orbitron'] mb-2 tracking-wider">
              NO CONTRACTS AVAILABLE
            </h3>
            <p className="text-amber-500/50 text-sm font-mono text-center max-w-md">
              The board is empty. Check back later for new missions from other operatives.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {publicTasks.map((task, index) => {
                const categoryStyle = getCategoryStyle(task.category);
                const CategoryIcon = categoryStyle.icon;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="group relative"
                  >
                    {/* Corner Brackets */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-amber-400/50 rounded-tl-sm group-hover:border-amber-300 transition-colors" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-amber-400/50 rounded-tr-sm group-hover:border-amber-300 transition-colors" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-amber-400/50 rounded-bl-sm group-hover:border-amber-300 transition-colors" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-amber-400/50 rounded-br-sm group-hover:border-amber-300 transition-colors" />

                    {/* Card */}
                    <div
                      className={clsx(
                        'relative h-full bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 transition-all duration-300',
                        'hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 hover:bg-slate-900/80'
                      )}
                    >
                      {/* Header: Category Badge + Difficulty */}
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={clsx(
                            'flex items-center gap-2 px-3 py-1 rounded-full border',
                            categoryStyle.bg,
                            categoryStyle.border,
                            'shadow-lg',
                            categoryStyle.glow
                          )}
                        >
                          <CategoryIcon className={clsx('w-4 h-4', categoryStyle.text)} />
                          <span
                            className={clsx(
                              'text-xs font-bold font-mono tracking-wider',
                              categoryStyle.text
                            )}
                          >
                            {task.category.toUpperCase()}
                          </span>
                        </div>

                        {task.difficulty && (
                          <div className="flex items-center gap-1">
                            {[...Array(3)].map((_, i) => (
                              <div
                                key={i}
                                className={clsx(
                                  'w-1.5 h-3 rounded-full',
                                  i <
                                    (task.difficulty === 'Hard'
                                      ? 3
                                      : task.difficulty === 'Medium'
                                        ? 2
                                        : 1)
                                    ? getDifficultyColor(task.difficulty)
                                    : 'bg-slate-700/50'
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-slate-100 mb-3 font-mono leading-tight line-clamp-2 group-hover:text-amber-300 transition-colors">
                        {task.title}
                      </h3>

                      {/* Author Info */}
                      {task.profiles && (
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700/50">
                          <img
                            src={task.profiles.avatar_url}
                            alt={task.profiles.username}
                            className="w-6 h-6 rounded-full border border-amber-500/30"
                          />
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-amber-500/70" />
                            <span className="text-xs text-amber-400/80 font-mono">
                              {task.profiles.username}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Meta Info: Due Date & Resources */}
                      {(task.due_date || (task.resource_links && task.resource_links.length > 0)) && (
                        <div className="flex items-center gap-3 mb-4 text-xs font-mono text-slate-400">
                          {task.due_date && (
                            <div className="flex items-center gap-1.5" title="Due Date">
                              <Clock className="w-3.5 h-3.5 text-amber-500/60" />
                              <span>{new Date(task.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {task.resource_links && task.resource_links.length > 0 && (
                            <div className="flex items-center gap-1.5" title="Attached Resources">
                              <LinkIcon className="w-3.5 h-3.5 text-indigo-400/60" />
                              <span>{task.resource_links.length} Resources</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: claimingIds.has(task.id) ? 1 : 1.02 }}
                          whileTap={{ scale: claimingIds.has(task.id) ? 1 : 0.98 }}
                          onClick={() => handleClaim(task.id, task.title)}
                          disabled={claimingIds.has(task.id) || deletingIds.has(task.id)}
                          className={clsx(
                            "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 transition-all group/btn shadow-lg shadow-amber-500/10",
                            claimingIds.has(task.id)
                              ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 cursor-wait"
                              : "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/40 hover:border-amber-400/60"
                          )}
                        >
                          <UserPlus className={clsx(
                            "w-4 h-4",
                            claimingIds.has(task.id) ? "text-amber-400/50" : "text-amber-400 group-hover/btn:text-amber-300"
                          )} />
                          <span className={clsx(
                            "text-sm font-bold font-mono tracking-wider",
                            claimingIds.has(task.id) ? "text-amber-300/50" : "text-amber-300 group-hover/btn:text-amber-200"
                          )}>
                            {claimingIds.has(task.id) ? 'CLAIMING...' : 'CLAIM CONTRACT'}
                          </span>
                        </motion.button>

                        {isAdmin && (
                          <motion.button
                            whileHover={{ scale: deletingIds.has(task.id) ? 1 : 1.02 }}
                            whileTap={{ scale: deletingIds.has(task.id) ? 1 : 0.98 }}
                            onClick={() => handleDelete(task.id, task.title)}
                            disabled={deletingIds.has(task.id) || claimingIds.has(task.id)}
                            className={clsx(
                              "flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 transition-all group/btn shadow-lg",
                              "border border-red-500/40 bg-gradient-to-r from-red-500/10 to-pink-500/10",
                              "hover:border-red-400/70 hover:from-red-500/20 hover:to-pink-500/20",
                              deletingIds.has(task.id) && "opacity-50 cursor-wait"
                            )}
                          >
                            <Trash2 className="w-4 h-4 text-red-300 group-hover/btn:text-red-200" />
                            <span className="text-sm font-bold font-mono tracking-wider text-red-200 group-hover/btn:text-red-100">
                              {deletingIds.has(task.id) ? 'DELETING...' : 'ADMIN DELETE'}
                            </span>
                          </motion.button>
                        )}
                      </div>

                      {/* Holographic Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/5 to-amber-500/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style>{`
        @keyframes gridScroll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(40px);
          }
        }
      `}</style>
    </div>
  );
};
