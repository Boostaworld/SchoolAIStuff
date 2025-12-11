import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { PokerCard as PokerCardType } from '../../lib/poker/types';

interface PokerCardProps {
    card?: PokerCardType;
    hidden?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    isWinner?: boolean;
    isFolded?: boolean;
    dealDelay?: number;
}

export const PokerCard: React.FC<PokerCardProps> = ({
    card,
    hidden = false,
    className,
    size = 'md',
    isWinner = false,
    isFolded = false,
    dealDelay = 0
}) => {
    const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds' || card?.suit === '♥' || card?.suit === '♦';

    const sizeClasses = {
        sm: "w-10 h-14 text-xs rounded",
        md: "w-16 h-24 text-base rounded-lg",
        lg: "w-24 h-36 text-xl rounded-xl"
    };

    const suitIcons: Record<string, string> = {
        hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
        '♥': '♥', '♦': '♦', '♣': '♣', '♠': '♠'
    };

    const rankDisplay: Record<string, string> = {
        '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
        'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
    };

    if (isFolded) return null;

    return (
        <motion.div
            className={clsx("relative", sizeClasses[size], className)}
            initial={dealDelay > 0 ? { scale: 0.8, opacity: 0 } : false}
            animate={{
                scale: 1,
                opacity: 1,
                rotateY: hidden ? 180 : 0
            }}
            transition={{
                delay: dealDelay,
                duration: 0.3,
                rotateY: { duration: 0.5, ease: 'easeInOut' }
            }}
            style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px'
            }}
        >
            {/* CARD BACK (visible when rotateY=180) */}
            <div
                className={clsx(
                    "absolute inset-0 border-2 flex items-center justify-center overflow-hidden select-none",
                    sizeClasses[size]
                )}
                style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                    borderColor: '#3730a3',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                }}
            >
                <div className="w-full h-full opacity-30 flex items-center justify-center">
                    <div className="w-3/4 h-3/4 border border-indigo-400/50 rounded-sm" />
                </div>
            </div>

            {/* CARD FRONT (visible when rotateY=0) */}
            <div
                className={clsx(
                    "absolute inset-0 flex flex-col justify-between p-1.5 select-none overflow-hidden border",
                    sizeClasses[size],
                    isRed ? "text-red-500 border-red-200/50" : "text-slate-900 border-slate-300/50",
                    isWinner && "ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30"
                )}
                style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                    backfaceVisibility: 'hidden'
                }}
            >
                {card && (
                    <>
                        {/* Top Left */}
                        <div className="flex flex-col items-center leading-none">
                            <span className="font-bold font-mono">{rankDisplay[card.rank]}</span>
                            <span className="text-[0.8em]">{suitIcons[card.suit]}</span>
                        </div>

                        {/* Center Suit */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                            <span className="text-[3em]">{suitIcons[card.suit]}</span>
                        </div>

                        {/* Bottom Right (Rotated) */}
                        <div className="flex flex-col items-center leading-none rotate-180">
                            <span className="font-bold font-mono">{rankDisplay[card.rank]}</span>
                            <span className="text-[0.8em]">{suitIcons[card.suit]}</span>
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};
