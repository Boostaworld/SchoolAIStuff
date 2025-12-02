import React from 'react';
import { Lock, Sparkles, Eye, Scan, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const LockedResearchLab: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridScroll 20s linear infinite'
        }} />
      </div>

      {/* Scanning beam effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            'linear-gradient(180deg, transparent 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)',
            'linear-gradient(180deg, transparent 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)',
          ],
          top: ['-100%', '100%']
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full relative z-10"
      >
        {/* Header with status indicators */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-mono text-xs tracking-widest">
              SYSTEM LOCKED
            </span>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>

          <div className="relative inline-block">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lock className="w-16 h-16 text-cyan-500 mx-auto mb-4" />
            </motion.div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-4"
            >
              <div className="w-full h-full border-2 border-dashed border-cyan-500/30 rounded-full" />
            </motion.div>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-cyan-400 font-mono tracking-tight mb-2">
            RESEARCH LAB
          </h2>
          <div className="text-orange-500 text-sm font-mono tracking-wider mb-1">
            ▲ RESTRICTED ACCESS ▲
          </div>
          <p className="text-slate-500 text-xs font-mono">
            CLEARANCE LEVEL: AI+ REQUIRED
          </p>
        </div>

        {/* Main content card */}
        <div className="bg-black/60 backdrop-blur-sm border-2 border-cyan-500/30 rounded-none p-6 md:p-8 relative overflow-hidden">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500" />

          <div className="space-y-6">
            <p className="text-slate-400 text-sm leading-relaxed font-mono">
              This advanced vision AI system requires <span className="text-cyan-400 font-bold">AI+ clearance</span> for activation.
              Contact your system administrator to request access authorization.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.02, borderColor: 'rgba(6, 182, 212, 0.5)' }}
                className="bg-slate-950/50 border border-cyan-500/20 p-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Eye className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-cyan-300 font-mono font-bold text-sm mb-1">
                      VISION ANALYSIS
                    </h3>
                    <p className="text-slate-500 text-xs font-mono leading-relaxed">
                      Process screenshots, diagrams, and photos with multimodal AI
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, borderColor: 'rgba(6, 182, 212, 0.5)' }}
                className="bg-slate-950/50 border border-cyan-500/20 p-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Scan className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-orange-300 font-mono font-bold text-sm mb-1">
                      FORM SOLVER
                    </h3>
                    <p className="text-slate-500 text-xs font-mono leading-relaxed">
                      Auto-extract questions and generate answers from Google Forms
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, borderColor: 'rgba(6, 182, 212, 0.5)' }}
                className="bg-slate-950/50 border border-cyan-500/20 p-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-amber-300 font-mono font-bold text-sm mb-1">
                      MULTI-MODEL
                    </h3>
                    <p className="text-slate-500 text-xs font-mono leading-relaxed">
                      Choose from Flash Exp, Gemini Pro, and Pro 1.5 models
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, borderColor: 'rgba(6, 182, 212, 0.5)' }}
                className="bg-slate-950/50 border border-cyan-500/20 p-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-purple-300 font-mono font-bold text-sm mb-1">
                      INSTANT UPLOAD
                    </h3>
                    <p className="text-slate-500 text-xs font-mono leading-relaxed">
                      Drag & drop or Ctrl+V paste images directly from clipboard
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Status bar */}
            <div className="border-t border-cyan-500/20 pt-4 mt-6">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-slate-600">STATUS: OFFLINE</span>
                </div>
                <div className="text-slate-600">
                  CLEARANCE: NONE
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom notice */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-6 text-center"
        >
          <p className="text-orange-500 text-xs font-mono font-bold tracking-wider">
            ⚠ REQUEST AI+ ACCESS FROM ADMINISTRATOR ⚠
          </p>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
      `}</style>
    </div>
  );
};
