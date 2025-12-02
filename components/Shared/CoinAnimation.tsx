import React from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';

interface CoinAnimationProps {
  amount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete: () => void;
}

export function CoinAnimation({ amount, startX, startY, endX, endY, onComplete }: CoinAnimationProps) {
  // Calculate control points for smooth arc animation
  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - 150; // Arc upward

  return (
    <div className="fixed inset-0 pointer-events-none z-[10000]">
      {/* Flying coins with staggered timing */}
      {[...Array(8)].map((_, i) => {
        const delay = i * 0.08;
        const randomOffsetX = (Math.random() - 0.5) * 60;
        const randomOffsetY = (Math.random() - 0.5) * 60;

        return (
          <motion.div
            key={i}
            initial={{
              x: startX + randomOffsetX,
              y: startY + randomOffsetY,
              scale: 1,
              opacity: 1,
              rotate: 0
            }}
            animate={{
              x: [
                startX + randomOffsetX,
                midX + randomOffsetX,
                endX + (Math.random() - 0.5) * 40,
              ],
              y: [
                startY + randomOffsetY,
                midY + randomOffsetY,
                endY + (Math.random() - 0.5) * 40,
              ],
              scale: [1, 1.3, 0.4],
              opacity: [1, 1, 0],
              rotate: [0, 180 + Math.random() * 180, 360 + Math.random() * 180],
            }}
            transition={{
              duration: 1.2,
              delay,
              ease: [0.6, 0.05, 0.01, 0.9],
              times: [0, 0.5, 1],
            }}
            onAnimationComplete={() => {
              if (i === 7) onComplete(); // Last coin triggers completion
            }}
            className="absolute"
          >
            <Coins
              className="w-8 h-8 text-yellow-400"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.8)) drop-shadow(0 0 16px rgba(250, 204, 21, 0.4))',
              }}
            />
          </motion.div>
        );
      })}

      {/* Explosion burst at start */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 2, 3] }}
        transition={{ duration: 0.6 }}
        className="absolute rounded-full"
        style={{
          left: startX - 50,
          top: startY - 50,
          width: 100,
          height: 100,
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.4), transparent 70%)',
        }}
      />

      {/* +Amount popup with enhanced styling */}
      <motion.div
        initial={{ opacity: 0, y: 0, scale: 0.8, rotate: -5 }}
        animate={{
          opacity: [0, 1, 1, 0],
          y: [0, -20, -40, -60],
          scale: [0.8, 1.4, 1.4, 0.9],
          rotate: [-5, 0, 0, 5],
        }}
        transition={{ duration: 2, delay: 1 }}
        className="absolute font-black text-5xl font-mono"
        style={{
          left: endX - 50,
          top: endY - 30,
          color: '#facc15',
          textShadow: `
            0 0 10px rgba(250, 204, 21, 1),
            0 0 20px rgba(250, 204, 21, 0.8),
            0 0 30px rgba(250, 204, 21, 0.6),
            0 0 40px rgba(250, 204, 21, 0.4),
            2px 2px 0px rgba(0, 0, 0, 0.8)
          `,
          WebkitTextStroke: '2px rgba(0, 0, 0, 0.3)',
        }}
      >
        +{amount}
      </motion.div>

      {/* Impact burst at destination */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2.5] }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute rounded-full"
        style={{
          left: endX - 40,
          top: endY - 40,
          width: 80,
          height: 80,
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.6), transparent 60%)',
        }}
      />

      {/* Sparkle particles */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 60;
        const sparkleX = endX + Math.cos(angle) * distance;
        const sparkleY = endY + Math.sin(angle) * distance;

        return (
          <motion.div
            key={`sparkle-${i}`}
            initial={{ opacity: 0, x: endX, y: endY, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: [endX, sparkleX],
              y: [endY, sparkleY],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 0.8,
              delay: 1.1 + (i * 0.02),
              ease: 'easeOut',
            }}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full"
            style={{
              boxShadow: '0 0 4px rgba(250, 204, 21, 0.8)',
            }}
          />
        );
      })}
    </div>
  );
}
