import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'subtle';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default'
}) => {
  const isSubtle = variant === 'subtle';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center ${isSubtle ? 'p-8' : 'p-12 min-h-[400px]'}`}
    >
      {/* Icon with glow effect */}
      <div className="relative mb-6">
        {/* Glow */}
        <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full scale-150" />

        {/* Icon container */}
        <div className="relative bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-6 rounded-full border-2 border-cyan-500/20">
          <Icon className={`${isSubtle ? 'w-12 h-12' : 'w-16 h-16'} text-cyan-400/60`} />
        </div>
      </div>

      {/* Title */}
      <h3 className={`${isSubtle ? 'text-lg' : 'text-2xl'} font-bold text-slate-300 font-mono tracking-wider mb-2 text-center`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`${isSubtle ? 'text-sm' : 'text-base'} text-slate-500 font-mono text-center max-w-md mb-6`}>
        {description}
      </p>

      {/* Action button */}
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 hover:from-cyan-500/30 hover:to-violet-500/30 border-2 border-cyan-500/30 hover:border-cyan-400/50 rounded-lg text-cyan-300 font-mono font-semibold tracking-wide transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20"
        >
          {action.label}
        </motion.button>
      )}

      {/* Decorative scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.3) 2px, rgba(6, 182, 212, 0.3) 4px)'
        }}
      />
    </motion.div>
  );
};
