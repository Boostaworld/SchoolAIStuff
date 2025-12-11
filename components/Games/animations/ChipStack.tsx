import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chipStackVariants } from '../../../lib/poker/animationVariants';
import { POKER_ANIMATIONS } from '../../../lib/poker/animationConstants';

interface ChipStackProps {
    amount: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
    mode: 'toPot' | 'toWinner';
    onComplete?: () => void;
}

// Chip color palette based on value (casino standard)
const getChipColor = (value: number): { primary: string; secondary: string; accent: string } => {
    if (value >= 500) return {
        primary: 'from-violet-600 to-violet-800',
        secondary: 'border-violet-400',
        accent: 'rgba(139, 92, 246, 0.6)'
    };
    if (value >= 100) return {
        primary: 'from-slate-700 to-slate-900',
        secondary: 'border-slate-400',
        accent: 'rgba(148, 163, 184, 0.6)'
    };
    if (value >= 25) return {
        primary: 'from-green-600 to-green-800',
        secondary: 'border-green-400',
        accent: 'rgba(34, 197, 94, 0.6)'
    };
    if (value >= 10) return {
        primary: 'from-blue-600 to-blue-800',
        secondary: 'border-blue-400',
        accent: 'rgba(59, 130, 246, 0.6)'
    };
    return {
        primary: 'from-red-600 to-red-800',
        secondary: 'border-red-400',
        accent: 'rgba(239, 68, 68, 0.6)'
    };
};

// Calculate chip breakdown (favor higher denominations)
const breakdownChips = (amount: number): number[] => {
    const chips: number[] = [];
    const denominations = [500, 100, 25, 10, 5];
    let remaining = amount;

    for (const denom of denominations) {
        while (remaining >= denom && chips.length < 5) {
            chips.push(denom);
            remaining -= denom;
        }
    }

    // If amount is small or odd, just show representative chips
    if (chips.length === 0) {
        return [5, 5, 5]; // Minimum visual stack
    }

    return chips.slice(0, 5); // Max 5 chips for visual clarity
};

export const ChipStack: React.FC<ChipStackProps> = ({
    amount,
    from,
    to,
    mode,
    onComplete
}) => {
    const [isAnimating, setIsAnimating] = useState(true);
    const chips = breakdownChips(amount);
    const target = { x: to.x - from.x, y: to.y - from.y };

    useEffect(() => {
        const duration = mode === 'toPot'
            ? POKER_ANIMATIONS.CHIP_MOVE_DURATION
            : POKER_ANIMATIONS.CHIP_MOVE_DURATION + 200;

        const timer = setTimeout(() => {
            setIsAnimating(false);
            onComplete?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [mode, onComplete]);

    return (
        <div
            className="fixed pointer-events-none z-40"
            style={{
                left: from.x,
                top: from.y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            <AnimatePresence>
                {isAnimating && (
                    <motion.div
                        className="relative"
                        custom={target}
                        variants={chipStackVariants}
                        initial="initial"
                        animate={mode === 'toPot' ? 'toPot' : 'toWinner'}
                        exit={{ opacity: 0, scale: 0.5 }}
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: 'translateZ(0)',
                            willChange: 'transform, opacity'
                        }}
                    >
                        {/* Chip Stack with perspective */}
                        <div className="relative" style={{ perspective: '1000px' }}>
                            {chips.map((chipValue, index) => {
                                const colors = getChipColor(chipValue);
                                const stackOffset = index * -3; // Stacking effect

                                return (
                                    <motion.div
                                        key={index}
                                        className="absolute left-1/2 top-1/2"
                                        initial={{ rotateX: 0 }}
                                        animate={{
                                            rotateX: [0, 360, 720],
                                            y: stackOffset
                                        }}
                                        transition={{
                                            rotateX: {
                                                duration: mode === 'toPot' ? 0.8 : 1,
                                                repeat: 0,
                                                ease: 'linear'
                                            },
                                            y: {
                                                duration: 0.2,
                                                delay: index * 0.05
                                            }
                                        }}
                                        style={{
                                            transform: `translate(-50%, -50%) translateY(${stackOffset}px)`,
                                            transformStyle: 'preserve-3d',
                                            zIndex: chips.length - index
                                        }}
                                    >
                                        {/* Chip Circle */}
                                        <div
                                            className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors.primary} border-4 ${colors.secondary} relative overflow-hidden shadow-2xl`}
                                            style={{
                                                boxShadow: `
                                                    0 4px 8px rgba(0, 0, 0, 0.4),
                                                    0 0 20px ${colors.accent},
                                                    inset 0 2px 4px rgba(255, 255, 255, 0.2),
                                                    inset 0 -2px 4px rgba(0, 0, 0, 0.3)
                                                `
                                            }}
                                        >
                                            {/* Inner ring design */}
                                            <div className="absolute inset-2 rounded-full border-2 border-white/20" />

                                            {/* Center value indicator */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-inner">
                                                    <span className="text-[8px] font-bold text-slate-900 font-mono">
                                                        {chipValue >= 100 ? `${chipValue / 100}C` : chipValue}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Holographic shimmer */}
                                            <motion.div
                                                className="absolute inset-0 pointer-events-none rounded-full"
                                                animate={{
                                                    background: [
                                                        'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
                                                        'linear-gradient(225deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)'
                                                    ]
                                                }}
                                                transition={{
                                                    duration: 1,
                                                    repeat: Infinity,
                                                    ease: 'linear'
                                                }}
                                            />

                                            {/* Edge notches (casino chip style) */}
                                            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                                                <div
                                                    key={angle}
                                                    className="absolute w-1 h-2 bg-white/40"
                                                    style={{
                                                        top: '50%',
                                                        left: '50%',
                                                        transformOrigin: '0 0',
                                                        transform: `rotate(${angle}deg) translate(20px, -50%)`
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* Chip depth/thickness (3D effect) */}
                                        <div
                                            className={`absolute w-12 h-1 bg-gradient-to-b ${colors.primary} -bottom-1 left-0 rounded-full opacity-80`}
                                            style={{
                                                transform: 'rotateX(90deg)',
                                                transformOrigin: 'top',
                                                boxShadow: `0 1px 2px rgba(0, 0, 0, 0.5)`
                                            }}
                                        />
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Amount label with holographic text */}
                        <motion.div
                            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full font-bold text-sm font-mono"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)',
                                border: '1px solid rgba(99, 102, 241, 0.5)',
                                boxShadow: `
                                    0 0 20px rgba(99, 102, 241, 0.4),
                                    inset 0 0 10px rgba(99, 102, 241, 0.2)
                                `,
                                color: '#fbbf24',
                                textShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
                            }}
                        >
                            {amount}
                        </motion.div>

                        {/* Energy trail effect */}
                        <motion.div
                            className="absolute inset-0 -z-10"
                            animate={{
                                opacity: [0.3, 0.6, 0.3],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        >
                            <div
                                className="w-16 h-16 rounded-full blur-xl"
                                style={{
                                    background: mode === 'toWinner'
                                        ? 'radial-gradient(circle, rgba(250, 204, 21, 0.4) 0%, transparent 70%)'
                                        : 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)'
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
