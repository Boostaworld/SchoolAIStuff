import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Coins } from 'lucide-react';

interface RewardAnimationProps {
  // Trigger the animation when this prop changes
  trigger: boolean;
  // Amount of reward earned (for display purposes)
  rewardAmount: number;
  // Current balance (will increment with spring animation)
  currentBalance: number;
  // Position of balance counter (for arc target calculation)
  balancePosition?: { x: number; y: number };
}

export default function RewardAnimation({
  trigger,
  rewardAmount,
  currentBalance,
  balancePosition = { x: window.innerWidth - 200, y: 80 },
}: RewardAnimationProps) {
  const [showParticles, setShowParticles] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Update animation key when trigger changes
  React.useEffect(() => {
    if (trigger) {
      setAnimationKey(prev => prev + 1);
    }
  }, [trigger]);

  // Key-to-Coin animation variants (exact specs from implementation doc)
  const keyToCoinVariants = {
    initial: {
      y: 0,
      x: 0,
      opacity: 0,
      scale: 0.5,
    },
    lift: {
      y: -50,
      opacity: 1,
      scale: 1.2,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    arc: {
      y: [-50, -200, -100],
      x: [0, balancePosition.x / 2, balancePosition.x],
      transition: { duration: 1.2, ease: 'easeInOut' },
    },
    land: {
      scale: 0.3,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  // Particle burst on impact
  const particleVariants = {
    initial: {
      opacity: 0,
      scale: 0,
    },
    burst: (i: number) => ({
      opacity: [0, 1, 0],
      scale: [0, 1.5, 0],
      x: Math.cos((i * Math.PI * 2) / 8) * 100,
      y: Math.sin((i * Math.PI * 2) / 8) * 100,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    }),
  };

  // Balance counter spring animation
  const balanceVariants = {
    initial: { scale: 1 },
    increment: {
      scale: [1, 1.3, 1],
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 10,
      },
    },
  };

  return (
    <>
      {/* Key-to-Coin animation */}
      <AnimatePresence mode="wait">
        {trigger && (
          <motion.div
            key={`coin-${animationKey}`}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
            variants={keyToCoinVariants}
            initial="initial"
            animate={['lift', 'arc', 'land']}
            onAnimationComplete={(definition) => {
              if (definition === 'land') {
                setShowParticles(true);
                setTimeout(() => setShowParticles(false), 600);
              }
            }}
          >
            {/* Glowing key icon with cyan light */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-cyan-400/40 blur-xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Keyboard className="w-16 h-16 text-cyan-400 relative z-10 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particle burst on impact */}
      <AnimatePresence>
        {showParticles && (
          <div
            className="fixed z-[100] pointer-events-none"
            style={{
              left: balancePosition.x,
              top: balancePosition.y,
            }}
          >
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={particleVariants}
                initial="initial"
                animate="burst"
                className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg"
              />
            ))}

            {/* Central impact flash */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 2, 0] }}
              transition={{ duration: 0.4 }}
              className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-cyan-400/60 blur-md"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Balance counter with spring animation (example - position controlled by parent) */}
      <AnimatePresence>
        {trigger && (
          <motion.div
            key={`balance-${animationKey}`}
            variants={balanceVariants}
            initial="initial"
            animate="increment"
            className="fixed top-20 right-8 z-[90] pointer-events-none"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-slate-900/90 backdrop-blur-sm border border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <Coins className="w-6 h-6 text-yellow-400" />
              <div>
                <div className="text-xs text-slate-400 font-mono">BALANCE</div>
                <motion.div
                  key={currentBalance}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-black text-cyan-400 font-mono"
                >
                  {currentBalance.toLocaleString()}
                </motion.div>
              </div>
            </div>

            {/* Floating reward amount */}
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], y: -40, scale: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute -top-8 right-0 text-emerald-400 font-bold text-lg font-mono"
            >
              +{rewardAmount}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Standalone Key-to-Coin component for manual triggering
export function KeyToCoinSequence({
  startPosition = { x: window.innerWidth / 2, y: window.innerHeight - 100 },
  endPosition = { x: window.innerWidth - 200, y: 80 },
  onComplete,
}: {
  startPosition?: { x: number; y: number };
  endPosition?: { x: number; y: number };
  onComplete?: () => void;
}) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [showParticles, setShowParticles] = useState(false);

  const deltaX = endPosition.x - startPosition.x;
  const deltaY = endPosition.y - startPosition.y;

  return (
    <>
      {/* Key icon */}
      <AnimatePresence onExitComplete={onComplete}>
        {isAnimating && (
          <motion.div
            className="fixed z-[100] pointer-events-none"
            style={{
              left: startPosition.x,
              top: startPosition.y,
            }}
            initial={{
              x: 0,
              y: 0,
              opacity: 0,
              scale: 0.5,
            }}
            animate={{
              x: [0, deltaX * 0.5, deltaX],
              y: [0, deltaY - 150, deltaY],
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1.2, 0.3],
            }}
            transition={{
              duration: 1.4,
              times: [0, 0.2, 0.8, 1],
              ease: 'easeInOut',
            }}
            onAnimationComplete={() => {
              setIsAnimating(false);
              setShowParticles(true);
              setTimeout(() => setShowParticles(false), 600);
            }}
          >
            {/* Glowing effect */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-cyan-400/40 blur-2xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Keyboard className="w-16 h-16 text-cyan-400 relative z-10 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particle burst */}
      <AnimatePresence>
        {showParticles && (
          <div
            className="fixed z-[100] pointer-events-none"
            style={{
              left: endPosition.x,
              top: endPosition.y,
            }}
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: Math.cos((i * Math.PI * 2) / 12) * 80,
                  y: Math.sin((i * Math.PI * 2) / 12) * 80,
                }}
                transition={{
                  duration: 0.6,
                  ease: 'easeOut',
                }}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg"
              />
            ))}

            {/* Impact flash */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 3, 0] }}
              transition={{ duration: 0.5 }}
              className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-cyan-400/50 blur-xl"
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook for easy integration
export function useRewardAnimation() {
  const [trigger, setTrigger] = useState(false);
  const [balance, setBalance] = useState(0);
  const [lastReward, setLastReward] = useState(0);

  const playReward = (amount: number) => {
    setLastReward(amount);
    setBalance((prev) => prev + amount);
    setTrigger(true);
    setTimeout(() => setTrigger(false), 1500);
  };

  return {
    trigger,
    balance,
    lastReward,
    playReward,
    RewardAnimationComponent: (
      <RewardAnimation
        trigger={trigger}
        rewardAmount={lastReward}
        currentBalance={balance}
      />
    ),
  };
}
