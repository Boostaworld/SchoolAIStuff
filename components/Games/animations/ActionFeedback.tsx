import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { actionFeedbackVariants } from '../../../lib/poker/animationVariants';
import { POKER_ANIMATIONS } from '../../../lib/poker/animationConstants';
import { PokerActionType } from '../../../lib/poker/types';

interface ActionFeedbackProps {
    action: PokerActionType;
    amount?: number;
    position: { x: number; y: number };
    onComplete?: () => void;
}

// Action styling configuration
const getActionStyle = (action: PokerActionType): {
    color: string;
    bgGradient: string;
    borderColor: string;
    glowColor: string;
    icon: string;
    label: string;
} => {
    switch (action) {
        case 'fold':
            return {
                color: 'text-red-100',
                bgGradient: 'from-red-600/95 via-red-700/95 to-red-800/95',
                borderColor: 'border-red-400/60',
                glowColor: 'rgba(239, 68, 68, 0.6)',
                icon: '✕',
                label: 'FOLD'
            };
        case 'check':
            return {
                color: 'text-green-100',
                bgGradient: 'from-green-600/95 via-green-700/95 to-green-800/95',
                borderColor: 'border-green-400/60',
                glowColor: 'rgba(34, 197, 94, 0.6)',
                icon: '✓',
                label: 'CHECK'
            };
        case 'call':
            return {
                color: 'text-blue-100',
                bgGradient: 'from-blue-600/95 via-blue-700/95 to-blue-800/95',
                borderColor: 'border-blue-400/60',
                glowColor: 'rgba(59, 130, 246, 0.6)',
                icon: '◉',
                label: 'CALL'
            };
        case 'raise':
            return {
                color: 'text-amber-100',
                bgGradient: 'from-amber-600/95 via-amber-700/95 to-amber-800/95',
                borderColor: 'border-amber-400/60',
                glowColor: 'rgba(251, 191, 36, 0.6)',
                icon: '↑',
                label: 'RAISE'
            };
        case 'all_in':
            return {
                color: 'text-yellow-100',
                bgGradient: 'from-yellow-500/95 via-orange-600/95 to-red-600/95',
                borderColor: 'border-yellow-400/80',
                glowColor: 'rgba(234, 179, 8, 0.8)',
                icon: '🔥',
                label: 'ALL-IN'
            };
    }
};

export const ActionFeedback: React.FC<ActionFeedbackProps> = ({
    action,
    amount,
    position,
    onComplete
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const style = getActionStyle(action);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, POKER_ANIMATIONS.ACTION_FEEDBACK_DURATION);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            className="fixed pointer-events-none z-50"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)'
            }}
        >
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        variants={actionFeedbackVariants}
                        initial="initial"
                        animate="show"
                        exit={{ opacity: 0, scale: 0.5 }}
                        style={{
                            transform: 'translateZ(0)',
                            willChange: 'transform, opacity'
                        }}
                    >
                        {/* Main Badge */}
                        <div
                            className={`relative px-6 py-3 rounded-2xl bg-gradient-to-br ${style.bgGradient} border-2 ${style.borderColor} ${style.color} font-bold text-lg shadow-2xl overflow-hidden`}
                            style={{
                                boxShadow: `
                                    0 8px 16px rgba(0, 0, 0, 0.4),
                                    0 0 30px ${style.glowColor},
                                    inset 0 2px 4px rgba(255, 255, 255, 0.2)
                                `,
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            {/* Holographic scanline effect */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                animate={{
                                    backgroundPosition: ['0% 0%', '0% 100%']
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'linear'
                                }}
                                style={{
                                    backgroundImage: 'linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                                    backgroundSize: '100% 50%'
                                }}
                            />

                            {/* Content */}
                            <div className="relative z-10 flex items-center gap-3">
                                {/* Icon */}
                                <motion.div
                                    className="text-2xl"
                                    animate={{
                                        rotate: action === 'all_in' ? [0, 10, -10, 10, 0] : 0,
                                        scale: action === 'all_in' ? [1, 1.2, 1] : 1
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: action === 'all_in' ? Infinity : 0,
                                        repeatDelay: 0.3
                                    }}
                                >
                                    {style.icon}
                                </motion.div>

                                {/* Label */}
                                <div className="flex flex-col items-start">
                                    <span className="text-sm tracking-widest font-mono leading-none">
                                        {style.label}
                                    </span>
                                    {amount !== undefined && amount > 0 && (
                                        <motion.span
                                            className="text-xs opacity-90 mt-1 font-mono"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 0.9, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            {amount} chips
                                        </motion.span>
                                    )}
                                </div>
                            </div>

                            {/* Shimmer overlay */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                animate={{
                                    background: [
                                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                                        'linear-gradient(90deg, transparent 100%, rgba(255,255,255,0.2) 150%, transparent 200%)'
                                    ]
                                }}
                                transition={{
                                    duration: 1.5,
                                    times: [0, 1],
                                    repeat: Infinity,
                                    repeatDelay: 0.5
                                }}
                            />
                        </div>

                        {/* Outer Glow Pulse */}
                        <motion.div
                            className="absolute inset-0 -z-10 rounded-2xl blur-xl"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.6, 0.3, 0.6]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                            style={{
                                background: `radial-gradient(circle, ${style.glowColor} 0%, transparent 70%)`
                            }}
                        />

                        {/* Particle burst for ALL-IN */}
                        {action === 'all_in' && (
                            <div className="absolute inset-0 pointer-events-none">
                                {[...Array(8)].map((_, i) => {
                                    const angle = (i / 8) * Math.PI * 2;
                                    return (
                                        <motion.div
                                            key={i}
                                            className="absolute w-2 h-2 rounded-full bg-yellow-400"
                                            style={{
                                                left: '50%',
                                                top: '50%',
                                                boxShadow: '0 0 8px rgba(250, 204, 21, 0.8)'
                                            }}
                                            initial={{ x: 0, y: 0, opacity: 1 }}
                                            animate={{
                                                x: Math.cos(angle) * 60,
                                                y: Math.sin(angle) * 60,
                                                opacity: 0,
                                                scale: [1, 0.5, 0]
                                            }}
                                            transition={{
                                                duration: 0.8,
                                                delay: 0.2 + i * 0.05,
                                                ease: 'easeOut'
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
