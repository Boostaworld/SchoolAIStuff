import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, Coins, TrendingUp, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'bet' | 'win';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastNotificationProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        const decrement = (100 / duration) * 50; // Update every 50ms
        return Math.max(0, prev - decrement);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [toast.id, duration, onDismiss]);

  const config = getToastConfig(toast.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`
        relative pointer-events-auto w-80 md:w-96
        bg-gradient-to-br ${config.bgGradient}
        border-2 ${config.borderColor}
        rounded-xl p-4 shadow-2xl ${config.shadowColor}
        backdrop-blur-sm
      `}
    >
      {/* Animated border glow */}
      <div className={`absolute inset-0 rounded-xl ${config.glowColor} blur-xl opacity-20 animate-pulse`} />

      {/* Content */}
      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor} animate-in zoom-in duration-300`}>
          {config.icon}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className={`font-mono font-bold text-sm ${config.textColor} leading-tight`}>
            {toast.message}
          </p>
          {toast.description && (
            <p className={`font-mono text-xs mt-1 ${config.descColor} leading-tight`}>
              {toast.description}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className={`flex-shrink-0 ${config.closeColor} hover:opacity-100 opacity-60 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 rounded-b-xl overflow-hidden">
        <motion.div
          className={`h-full ${config.progressColor}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent animate-scanline" />
      </div>
    </motion.div>
  );
};

function getToastConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle className="w-6 h-6" />,
        iconColor: 'text-emerald-400',
        textColor: 'text-emerald-100',
        descColor: 'text-emerald-300/80',
        bgGradient: 'from-emerald-950/90 to-emerald-900/70',
        borderColor: 'border-emerald-500/50',
        shadowColor: 'shadow-emerald-900/50',
        glowColor: 'bg-emerald-500',
        progressColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        closeColor: 'text-emerald-400',
      };

    case 'error':
      return {
        icon: <XCircle className="w-6 h-6" />,
        iconColor: 'text-red-400',
        textColor: 'text-red-100',
        descColor: 'text-red-300/80',
        bgGradient: 'from-red-950/90 to-red-900/70',
        borderColor: 'border-red-500/50',
        shadowColor: 'shadow-red-900/50',
        glowColor: 'bg-red-500',
        progressColor: 'bg-gradient-to-r from-red-500 to-orange-400',
        closeColor: 'text-red-400',
      };

    case 'warning':
      return {
        icon: <AlertTriangle className="w-6 h-6" />,
        iconColor: 'text-amber-400',
        textColor: 'text-amber-100',
        descColor: 'text-amber-300/80',
        bgGradient: 'from-amber-950/90 to-amber-900/70',
        borderColor: 'border-amber-500/50',
        shadowColor: 'shadow-amber-900/50',
        glowColor: 'bg-amber-500',
        progressColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        closeColor: 'text-amber-400',
      };

    case 'bet':
      return {
        icon: <Coins className="w-6 h-6" />,
        iconColor: 'text-violet-400 animate-bounce',
        textColor: 'text-violet-100',
        descColor: 'text-violet-300/80',
        bgGradient: 'from-violet-950/90 to-purple-900/70',
        borderColor: 'border-violet-500/50',
        shadowColor: 'shadow-violet-900/50',
        glowColor: 'bg-violet-500',
        progressColor: 'bg-gradient-to-r from-violet-500 to-purple-400',
        closeColor: 'text-violet-400',
      };

    case 'win':
      return {
        icon: <TrendingUp className="w-6 h-6" />,
        iconColor: 'text-yellow-400 animate-pulse',
        textColor: 'text-yellow-100',
        descColor: 'text-yellow-300/80',
        bgGradient: 'from-yellow-950/90 via-amber-900/70 to-orange-900/70',
        borderColor: 'border-yellow-500/50',
        shadowColor: 'shadow-yellow-900/50',
        glowColor: 'bg-yellow-500',
        progressColor: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-400',
        closeColor: 'text-yellow-400',
      };

    case 'info':
    default:
      return {
        icon: <Info className="w-6 h-6" />,
        iconColor: 'text-cyan-400',
        textColor: 'text-cyan-100',
        descColor: 'text-cyan-300/80',
        bgGradient: 'from-cyan-950/90 to-blue-900/70',
        borderColor: 'border-cyan-500/50',
        shadowColor: 'shadow-cyan-900/50',
        glowColor: 'bg-cyan-500',
        progressColor: 'bg-gradient-to-r from-cyan-500 to-blue-400',
        closeColor: 'text-cyan-400',
      };
  }
}
