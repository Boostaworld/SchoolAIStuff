"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ParticleType } from '@/lib/themes/announcementThemes';

interface ParticleEffectsProps {
  type: ParticleType;
  density: number; // 0-100
  colors: string[];
  size: 'small' | 'medium' | 'large';
  containerClassName?: string;
}

export function ParticleEffects({ type, density, colors, size, containerClassName = '' }: ParticleEffectsProps) {
  if (type === 'none' || density === 0) return null;

  const particleCount = Math.floor((density / 100) * 50); // Max 50 particles
  const particles = Array.from({ length: particleCount }, (_, i) => i);

  const sizeMap = {
    small: { min: 4, max: 8 },
    medium: { min: 8, max: 16 },
    large: { min: 12, max: 24 }
  };

  const { min: minSize, max: maxSize } = sizeMap[size];

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${containerClassName}`}>
      {particles.map((i) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const particleSize = Math.random() * (maxSize - minSize) + minSize;
        const startX = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 3 + Math.random() * 4;

        if (type === 'snow') {
          return (
            <motion.div
              key={i}
              className="absolute rounded-full opacity-80"
              style={{
                background: color,
                width: particleSize,
                height: particleSize,
                left: `${startX}%`,
                top: '-5%',
                filter: 'blur(1px)'
              }}
              animate={{
                y: ['0vh', '110vh'],
                x: [0, Math.sin(i) * 50, Math.cos(i) * 50, 0],
                opacity: [0, 0.8, 0.8, 0]
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          );
        }

        if (type === 'confetti') {
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                background: color,
                width: particleSize,
                height: particleSize * 1.5,
                left: `${startX}%`,
                top: '-5%',
                borderRadius: '2px'
              }}
              animate={{
                y: ['0vh', '110vh'],
                x: [0, Math.sin(i * 2) * 100],
                rotate: [0, 360 * 3],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          );
        }

        if (type === 'sparkles') {
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${startX}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                scale: [0, 1, 0],
                rotate: [0, 180],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                delay: delay * 0.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <svg width={particleSize} height={particleSize} viewBox="0 0 24 24" fill={color}>
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </motion.div>
          );
        }

        if (type === 'hearts') {
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${startX}%`,
                top: '105%'
              }}
              animate={{
                y: [0, -window.innerHeight * 1.2],
                x: [0, Math.sin(i) * 30],
                scale: [0.8, 1.2, 0.8],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: duration + 2,
                delay,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <svg width={particleSize} height={particleSize} viewBox="0 0 24 24" fill={color}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </motion.div>
          );
        }

        if (type === 'stars') {
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${startX}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                scale: [0, 1.5, 1, 1.5, 0],
                opacity: [0, 1, 0.6, 1, 0],
                rotate: [0, 90, 180]
              }}
              transition={{
                duration: 3,
                delay,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <svg width={particleSize} height={particleSize} viewBox="0 0 24 24" fill={color}>
                <polygon points="12,2 15,10 23,10 17,15 19,23 12,18 5,23 7,15 1,10 9,10" />
              </svg>
            </motion.div>
          );
        }

        if (type === 'bubbles') {
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${color}40, ${color}10)`,
                border: `1px solid ${color}60`,
                width: particleSize,
                height: particleSize,
                left: `${startX}%`,
                top: '105%',
                filter: 'blur(0.5px)'
              }}
              animate={{
                y: [0, -window.innerHeight * 1.2],
                x: [0, Math.sin(i * 3) * 50],
                scale: [0.5, 1, 0.8, 1],
                opacity: [0, 0.8, 0.8, 0]
              }}
              transition={{
                duration: duration + 1,
                delay,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

// Specialized effect: Confetti burst (one-time celebration)
export function ConfettiBurst({ onComplete }: { onComplete?: () => void }) {
  const particles = Array.from({ length: 100 }, (_, i) => i);

  return (
    <div className="fixed inset-0 pointer-events-none z-[10001]">
      {particles.map((i) => {
        const color = ['#F59E0B', '#EC4899', '#8B5CF6', '#FDE047', '#3B82F6'][Math.floor(Math.random() * 5)];
        const size = Math.random() * 12 + 6;
        const angle = (i / particles.length) * Math.PI * 2;
        const velocity = 200 + Math.random() * 300;
        const x = Math.cos(angle) * velocity;
        const y = Math.sin(angle) * velocity - 200;

        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              background: color,
              width: size,
              height: size * 1.5,
              borderRadius: '2px'
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x,
              y: y + 800,
              opacity: [1, 1, 0],
              rotate: Math.random() * 720
            }}
            transition={{
              duration: 2 + Math.random(),
              ease: [0.4, 0.0, 0.2, 1]
            }}
            onAnimationComplete={() => {
              if (i === particles.length - 1 && onComplete) {
                onComplete();
              }
            }}
          />
        );
      })}
    </div>
  );
}
