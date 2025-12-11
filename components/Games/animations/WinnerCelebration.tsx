import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    winnerBannerVariants,
    confettiParticleVariants,
    chipRainVariants
} from '../../../lib/poker/animationVariants';
import { POKER_ANIMATIONS } from '../../../lib/poker/animationConstants';
import { EvaluatedHand } from '../../../lib/poker/types';

interface WinnerCelebrationProps {
    winnerName: string;
    winningHand: EvaluatedHand;
    potAmount: number;
    onComplete?: () => void;
}

// Confetti colors (vibrant holographic palette)
const CONFETTI_COLORS = [
    '#fbbf24', // Gold
    '#facc15', // Yellow
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f97316', // Orange
    '#06b6d4'  // Cyan
];

export const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
    winnerName,
    winningHand,
    potAmount,
    onComplete
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, POKER_ANIMATIONS.WINNER_CELEBRATION_DURATION);

        return () => clearTimeout(timer);
    }, [onComplete]);

    // Get hand rank emoji/icon
    const getHandIcon = (rankName: string): string => {
        const icons: Record<string, string> = {
            'Royal Flush': '👑',
            'Straight Flush': '🎯',
            'Four of a Kind': '🎰',
            'Full House': '🏠',
            'Flush': '💎',
            'Straight': '📏',
            'Three of a Kind': '🎲',
            'Two Pair': '👯',
            'One Pair': '🤝',
            'High Card': '🃏'
        };
        return icons[rankName] || '🏆';
    };

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            <AnimatePresence>
                {isVisible && (
                    <>
                        {/* Winner Banner */}
                        <motion.div
                            className="absolute top-8 left-1/2 -translate-x-1/2 w-auto max-w-2xl"
                            variants={winnerBannerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="relative px-12 py-6 rounded-3xl overflow-hidden shadow-2xl">
                                {/* Background with holographic gradient */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(245, 158, 11, 0.95) 50%, rgba(217, 119, 6, 0.95) 100%)',
                                        boxShadow: `
                                            0 0 60px rgba(251, 191, 36, 0.8),
                                            inset 0 0 40px rgba(255, 255, 255, 0.2)
                                        `
                                    }}
                                />

                                {/* Animated scanlines */}
                                <motion.div
                                    className="absolute inset-0"
                                    animate={{
                                        backgroundPosition: ['0% 0%', '0% 100%']
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: 'linear'
                                    }}
                                    style={{
                                        backgroundImage: 'linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                                        backgroundSize: '100% 30%'
                                    }}
                                />

                                {/* Border glow */}
                                <div className="absolute inset-0 border-4 border-yellow-300/50 rounded-3xl" />

                                {/* Content */}
                                <div className="relative z-10 text-center">
                                    {/* Trophy Icon */}
                                    <motion.div
                                        className="text-6xl mb-2"
                                        animate={{
                                            rotate: [0, -10, 10, -10, 0],
                                            scale: [1, 1.1, 1]
                                        }}
                                        transition={{
                                            duration: 0.8,
                                            repeat: Infinity,
                                            repeatDelay: 1
                                        }}
                                    >
                                        🏆
                                    </motion.div>

                                    {/* Winner Text */}
                                    <motion.h2
                                        className="text-4xl font-bold text-slate-900 mb-2 tracking-wider"
                                        style={{
                                            fontFamily: "'Orbitron', sans-serif",
                                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                                        }}
                                        animate={{
                                            textShadow: [
                                                '2px 2px 4px rgba(0,0,0,0.3)',
                                                '2px 2px 8px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.5)',
                                                '2px 2px 4px rgba(0,0,0,0.3)'
                                            ]
                                        }}
                                        transition={{
                                            duration: 1.5,
                                            repeat: Infinity,
                                            ease: 'easeInOut'
                                        }}
                                    >
                                        {winnerName} WINS!
                                    </motion.h2>

                                    {/* Hand Info */}
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <span className="text-3xl">{getHandIcon(winningHand.rankName)}</span>
                                        <span className="text-2xl font-bold text-slate-800 font-mono">
                                            {winningHand.rankName}
                                        </span>
                                    </div>

                                    {/* Pot Amount */}
                                    <motion.div
                                        className="text-5xl font-bold text-white font-mono"
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: [0.8, 1.1, 1] }}
                                        transition={{
                                            duration: 0.6,
                                            times: [0, 0.6, 1],
                                            delay: 0.3
                                        }}
                                        style={{
                                            textShadow: `
                                                3px 3px 0 rgba(0,0,0,0.3),
                                                0 0 20px rgba(255,255,255,0.8)
                                            `
                                        }}
                                    >
                                        {potAmount} 💰
                                    </motion.div>
                                </div>

                                {/* Shimmer effect across banner */}
                                <motion.div
                                    className="absolute inset-0 pointer-events-none"
                                    animate={{
                                        backgroundPosition: ['-200% 0', '200% 0']
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: 'linear'
                                    }}
                                    style={{
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                                        backgroundSize: '50% 100%'
                                    }}
                                />
                            </div>
                        </motion.div>

                        {/* Confetti Burst */}
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2">
                            {[...Array(20)].map((_, i) => {
                                const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                                const shape = i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'square' : 'rect';

                                return (
                                    <motion.div
                                        key={i}
                                        className="absolute"
                                        style={{
                                            width: shape === 'rect' ? '8px' : '12px',
                                            height: shape === 'rect' ? '16px' : '12px',
                                            backgroundColor: color,
                                            borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0',
                                            boxShadow: `0 0 10px ${color}`
                                        }}
                                        custom={i}
                                        variants={confettiParticleVariants}
                                        initial="initial"
                                        animate="explode"
                                    />
                                );
                            })}
                        </div>

                        {/* Chip Rain */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-8 h-8 rounded-full"
                                    style={{
                                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                        border: '3px solid #fcd34d',
                                        boxShadow: `
                                            0 4px 8px rgba(0, 0, 0, 0.3),
                                            0 0 20px rgba(251, 191, 36, 0.6),
                                            inset 0 2px 4px rgba(255, 255, 255, 0.3)
                                        `,
                                        left: `${i * 8}%`
                                    }}
                                    custom={i}
                                    variants={chipRainVariants}
                                    initial="initial"
                                    animate="falling"
                                >
                                    {/* Chip center */}
                                    <div className="absolute inset-2 rounded-full border-2 border-white/40 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-white/90 text-[6px] font-bold text-slate-900 flex items-center justify-center">
                                            $
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Radial light burst from center */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: [0, 3, 2],
                                opacity: [0, 0.4, 0]
                            }}
                            transition={{
                                duration: 1.5,
                                times: [0, 0.5, 1],
                                delay: POKER_ANIMATIONS.CELEBRATION_GLOW_DELAY / 1000
                            }}
                            style={{
                                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, transparent 70%)'
                            }}
                        />

                        {/* Corner sparkles */}
                        {[
                            { x: '10%', y: '20%' },
                            { x: '90%', y: '20%' },
                            { x: '20%', y: '80%' },
                            { x: '80%', y: '80%' }
                        ].map((pos, i) => (
                            <motion.div
                                key={i}
                                className="absolute text-4xl"
                                style={{ left: pos.x, top: pos.y }}
                                animate={{
                                    scale: [0, 1.2, 0],
                                    rotate: [0, 180, 360],
                                    opacity: [0, 1, 0]
                                }}
                                transition={{
                                    duration: 1,
                                    delay: 0.5 + i * 0.15,
                                    repeat: Infinity,
                                    repeatDelay: 1.5
                                }}
                            >
                                ✨
                            </motion.div>
                        ))}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
